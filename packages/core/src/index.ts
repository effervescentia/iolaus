// tslint:disable:no-implicit-dependencies
import PackageGraph from '@lerna/package-graph';
import { getPackages } from '@lerna/project';
import path from 'path';
import semanticRelease, {
  Configuration,
  NextRelease,
  Plugins
} from 'semantic-release';
import { ReleaseType } from 'semver';
import { getConfig, getContext } from './context-sink';
import { PackageContext } from './types';
import {
  createPackageContext,
  extendOptions,
  trackUpdates,
  transformPlugins
} from './utils';

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

  try {
    const packages = await getPackages();
    const graph = new PackageGraph(packages);
    const packageNames = Array.from(graph.keys());

    await semanticRelease(
      {
        ...config,
        // TODO: remove
        branch: 'f/release',
        dryRun: true,
        plugins: [[path.resolve(__dirname, 'context-sink'), { packages }]]
      },
      {
        env: process.env
      } as any
    );

    const hijackedContext = extendOptions(getContext(), getConfig());

    const rootContext = transformPlugins(hijackedContext, () => [
      '@semantic-release/commit-analyzer',
      '@semantic-release/release-notes-generator'
    ]);

    const packageContexts = new Map<string, PackageContext>();

    for (const pkgName of packageNames) {
      const pkgContext = await createPackageContext(pkgName, rootContext);
      const { context } = pkgContext;

      await pkgContext.plugins.verifyConditions(context);

      // tslint:disable-next-line: no-object-mutation
      context.lastRelease = null;
      // tslint:disable-next-line: no-object-mutation
      context.commits = null;

      packageContexts.set(pkgName, pkgContext);
    }

    const packageUpdates = new Map<string, ReleaseType>();

    for (const pkgName of packageNames) {
      await trackUpdates(pkgName, graph, packageContexts, packageUpdates);
    }

    const updatedNames = Array.from(packageUpdates.keys());

    for (const pkgName of updatedNames) {
      const type = packageUpdates.get(pkgName);
      const { context, plugins } = packageContexts.get(pkgName);

      // tslint:disable-next-line: no-object-mutation no-object-literal-type-assertion
      context.nextRelease = { type } as NextRelease;

      await plugins.verifyRelease(context);

      // tslint:disable-next-line: no-object-mutation
      context.nextRelease.notes = null;
    }

    await promisifyPlugin('prepare', updatedNames, packageContexts);

    // TODO: create git tags

    try {
      for (const pkgName of updatedNames) {
        const { context, plugins } = packageContexts.get(pkgName);

        const releases = await plugins.publish(context);

        // tslint:disable-next-line: no-object-mutation
        context.releases = releases;
      }

      await promisifyPlugin('success', updatedNames, packageContexts);
    } catch (err) {
      await promisifyPlugin('fail', updatedNames, packageContexts);
    }

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
     * set(context.nextRelease.notes)
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
