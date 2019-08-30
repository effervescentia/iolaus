// tslint:disable:no-implicit-dependencies
import PackageGraph from '@lerna/package-graph';
import { getPackages } from '@lerna/project';
import GitRelease from '@semantic-release/git';
import GithubRelease from '@semantic-release/github';
import npmPublish from '@semantic-release/npm/lib/publish';
import npmSetAuth from '@semantic-release/npm/lib/set-npmrc-auth';
import fs from 'fs';
import * as isomorphicGit from 'isomorphic-git';
import template from 'lodash.template';
import path from 'path';
import readPkg from 'read-pkg';
import semanticRelease, {
  Context,
  NextRelease,
  Plugins
} from 'semantic-release';
import { getGitHead } from 'semantic-release/lib/git';
import semver, { ReleaseType } from 'semver';
import writePkg from 'write-pkg';
import { generateChangelog } from './changelog';
import { getConfig, getContext } from './context-sink';
import { initializeRelease } from './release';
import { Configuration, PackageContext } from './types';
import {
  applyUpdatesToDependents,
  git,
  trackUpdates,
  transformOptions,
  transformPlugins
} from './utils';

const DEPENDENCY_KEY_PATTERN = /^([a-z]*D|d)ependencies$/;
const DEFAULT_CONFIG: Configuration = {
  assets: ['packages/*/package.json', 'CHANGELOG.md'],
  branch: 'master',
  npmRegistry: 'https://registry.npmjs.org/',
  releaseAssets: []
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
  const gitReleaseConfig: GitRelease.Config = {
    assets: config.assets
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

    const githubReleaseConfig: GithubRelease.Config = {
      assets: config.releaseAssets,
      failComment: false,
      labels: ['iolaus'],
      releasedLabels: ['released'],
      successComment: false
    };

    const packageContexts = new Map<string, PackageContext>();

    rootContext.logger.await('verifying packages');

    await GitRelease.verifyConditions(gitReleaseConfig, rootContext);
    await GithubRelease.verifyConditions(githubReleaseConfig, rootContext);
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

    await npmSetAuth(config.npmRegistry, rootContext);

    const packageUpdates = new Map<string, ReleaseType>();

    rootContext.logger.await('looking for updates');

    await Promise.all(
      packageNames.map(pkgName =>
        trackUpdates(pkgName, packageContexts, packageUpdates)
      )
    );

    Array.from(packageUpdates.keys()).forEach(pkgName =>
      applyUpdatesToDependents(pkgName, graph, packageUpdates)
    );

    const updatedNames = Array.from(packageUpdates.keys());
    if (!updatedNames.length) {
      rootContext.logger.warn('no releases found, exiting now');
      return;
    }

    for (const pkgName of updatedNames) {
      const type = packageUpdates.get(pkgName);
      const { context, plugins } = packageContexts.get(pkgName);

      // tslint:disable-next-line: no-object-mutation no-object-literal-type-assertion
      context.nextRelease = {
        gitHead: await getGitHead(context),
        type
      } as NextRelease;

      await plugins.verifyRelease(context);

      // tslint:disable: no-object-mutation
      context.nextRelease.notes = await plugins.generateNotes(context);

      const version = context.lastRelease.version
        ? semver.inc(context.lastRelease.version, type)
        : '1.0.0';
      context.nextRelease.version = version;
      context.nextRelease.gitTag = template(context.options.tagFormat)({
        version
      });
      // tslint:enable: no-object-mutation
    }

    await Promise.all(
      updatedNames.map(async pkgName => {
        const { localDependencies } = graph.get(pkgName);
        const { context, location } = packageContexts.get(pkgName);
        const updatedDependencies = Array.from(localDependencies.keys()).filter(
          depName => updatedNames.includes(depName)
        );

        const pkgLocation = path.join(location, 'package.json');
        const pkgString = await fs.promises.readFile(pkgLocation, 'utf8');

        const pkg = JSON.parse(pkgString);

        // tslint:disable-next-line: no-object-mutation
        pkg.version = context.nextRelease.version;

        Object.keys(pkg)
          .filter(key => DEPENDENCY_KEY_PATTERN.test(key))
          .forEach(pkgKey =>
            updatedDependencies.forEach(depName => {
              const pkgDeps = pkg[pkgKey];

              if (
                depName in pkgDeps &&
                pkgDeps !== context.nextRelease.version
              ) {
                // tslint:disable-next-line: no-object-mutation
                pkgDeps[depName] = context.nextRelease.version;
              }
            })
          );

        await writePkg(path.join(location, 'package.json'), pkg);
      })
    );

    const { file: changelogFile, content: changelog } = await generateChangelog(
      cwd,
      graph,
      packageContexts,
      updatedNames
    );

    await fs.promises.writeFile(changelogFile, changelog);

    await promisifyPlugin('prepare', updatedNames, packageContexts);

    await git(cwd).add(gitReleaseConfig.assets);
    await git(cwd).commit(
      `chore(release): release packages [skip ci]\n${updatedNames
        .map(
          pkgName =>
            `\n- \`${pkgName}\` -> \`v${
              packageContexts.get(pkgName).context.nextRelease.version
            }\``
        )
        .join(', ')}\n\n${changelog}`
    );

    for (const pkgName of updatedNames) {
      const { context } = packageContexts.get(pkgName);

      if (config.dryRun) {
        rootContext.logger.warn(
          `Skip ${context.nextRelease.gitTag} tag creation in dry-run mode`
        );
      } else {
        await git(cwd).addTag(context.nextRelease.gitTag);
        rootContext.logger.success(`Created tag ${context.nextRelease.gitTag}`);
      }
    }

    if (config.dryRun) {
      rootContext.logger.warn('Skip pushing changelog and version update');
    } else {
      await isomorphicGit.push({
        dir: cwd,
        fs,
        remoteRef: config.branch,
        token: process.env.GH_TOKEN
      });
      await Promise.all(
        updatedNames.map(pkgName =>
          isomorphicGit.push({
            dir: cwd,
            fs,
            ref: packageContexts.get(pkgName).context.nextRelease.gitTag,
            token: process.env.GH_TOKEN
          })
        )
      );
      rootContext.logger.success('Pushed tags, commits and changelog');
    }

    try {
      for (const pkgName of updatedNames) {
        const { location, context, plugins } = packageContexts.get(pkgName);

        const releases = await plugins.publish(context);

        // tslint:disable-next-line: no-object-mutation
        context.releases = releases;

        const { _id, readme, ...pkg } = (await readPkg({
          cwd: location
        })) as Record<string, any>;

        const pkgWithConfig = {
          ...pkg,
          publishConfig: {
            ...pkg.publishConfig,
            registry: config.npmRegistry
          }
        };

        await writePkg(location, pkgWithConfig);
        await npmPublish({ pkgRoot: location }, pkgWithConfig, context);
        await writePkg(location, pkg);
        await GithubRelease.publish(githubReleaseConfig, rootContext);
      }

      await promisifyPlugin('success', updatedNames, packageContexts);
      // await GithubRelease.success(githubReleaseConfig, rootContext);
    } catch (err) {
      // tslint:disable-next-line: no-console
      console.error(err);
      await promisifyPlugin('fail', updatedNames, packageContexts);
      throw err;
      // await GithubRelease.fail(githubReleaseConfig, rootContext);
    }
  } catch (err) {
    // tslint:disable-next-line: no-console
    console.error(err);

    process.exit(-1);
  }
};

async function hijackSemanticRelease({
  assets,
  releaseAssets,
  npmRegistry,
  ...config
}: Configuration): Promise<Context> {
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
