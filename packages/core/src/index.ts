// tslint:disable:no-implicit-dependencies
import PackageGraph from '@lerna/package-graph';
import { getPackages } from '@lerna/project';
import path from 'path';
import semanticRelease, {
  Configuration,
  Context,
  NextRelease,
  Plugins
} from 'semantic-release';
import { ReleaseType } from 'semver';
import { getConfig, getContext } from './context-sink';
import { initializeRelease } from './release';
import { PackageContext } from './types';
import { trackUpdates, transformOptions, transformPlugins } from './utils';

const DEFAULT_CONFIG: Configuration = {
  branch: 'master'
};

function promisifyPlugin<T = void>(
  plugin: keyof Plugins,
  packageNames: string[],
  packageContexts: Map<string, PackageContext>
): Promise<T[]> {
  return Promise.all<T>(
    packageNames.map(pkgName => {
      const { context, plugins } = packageContexts.get(pkgName);

      return plugins[plugin](context) as Promise<any>;
    })
  );
}

export default async (userConfig: Configuration) => {
  const config = {
    ...DEFAULT_CONFIG,
    ...userConfig
  };
  const cwd = process.cwd();

  try {
    const packages = await getPackages();
    const graph = new PackageGraph(packages);
    const packageNames = Array.from(graph.keys());

    const hijackedContext = await hijackSemanticRelease(config);
    hijackedContext.logger.success('semantic release context hijacked');

    const rootContext = transformPlugins(hijackedContext, () => [
      '@semantic-release/commit-analyzer',
      '@semantic-release/release-notes-generator'
    ]);

    const packageContexts = new Map<string, PackageContext>();

    rootContext.logger.await('verifying packages');
    for (const pkgName of packageNames) {
      await initializeRelease(
        pkgName,
        cwd,
        graph.get(pkgName).location,
        rootContext,
        packageContexts
      );
    }
    rootContext.logger.complete('packages verified');

    const packageUpdates = new Map<string, ReleaseType>();

    rootContext.logger.await('looking for updates');
    for (const pkgName of packageNames) {
      await trackUpdates(pkgName, graph, packageContexts, packageUpdates);
    }

    const updatedNames = Array.from(packageUpdates.keys());
    if (!updatedNames.length) {
      rootContext.logger.warn('no releases found, exiting now');
      return;
    }

    for (const pkgName of updatedNames) {
      const type = packageUpdates.get(pkgName);
      const { context, plugins } = packageContexts.get(pkgName);

      // tslint:disable-next-line: no-object-mutation no-object-literal-type-assertion
      context.nextRelease = { type } as NextRelease;

      await plugins.verifyRelease(context);

      // tslint:disable-next-line: no-object-mutation
      context.nextRelease.notes = await plugins.generateNotes(context);

      const {
        // tslint:disable-next-line: variable-name
        cwd: _cwd,
        env,
        options,
        logger,
        stdout,
        stderr,
        ...ctx
      } = context as any;

      console.log(pkgName, ctx);
    }

    if (config.dryRun) {
      rootContext.logger.warn('running in dry-run mode, skipping release');
      return;
    }

    await promisifyPlugin('prepare', updatedNames, packageContexts);

    // // TODO: create git tags

    // try {
    //   for (const pkgName of updatedNames) {
    //     const { context, plugins } = packageContexts.get(pkgName);

    //     const releases = await plugins.publish(context);

    //     // tslint:disable-next-line: no-object-mutation
    //     context.releases = releases;
    //   }

    //   await promisifyPlugin('success', updatedNames, packageContexts);
    // } catch (err) {
    //   await promisifyPlugin('fail', updatedNames, packageContexts);
    // }

    /**
     * STEPS:
     *
     * run(verifyConditions)
     *
     * set(context.lastRelease)
     * set(context.commits)
     *
     * run(analyzeCommits) -> set(context.nextRelease)
     *
     * set(context.nextRelease.version)
     * set(context.nextRelease.gitTag)
     *
     * run(verifyRelease)
     *
     * run(generateNotes) -> set(context.nextRelease.notes)
     *
     * run(prepare)
     *
     * # create & push git tag
     *
     * run(publish) -> set(context.releases)
     *
     * run(success) | run(fail)
     */
  } catch (err) {
    console.log(err);
  }
};

async function hijackSemanticRelease(config: Configuration): Promise<Context> {
  await semanticRelease(
    {
      ...config,
      dryRun: true,
      plugins: [path.resolve(__dirname, 'context-sink')]
    },
    {
      env: process.env
    } as any
  );

  try {
    return transformOptions(getContext(), () => ({
      ...getConfig(),
      ...config
    }));
  } catch {
    throw new Error('unable to run semantic release to setup release');
  }
}
