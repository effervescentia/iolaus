// tslint:disable:no-implicit-dependencies
import PackageGraph from '@lerna/package-graph';
import { getPackages } from '@lerna/project';
import GitRelease from '@semantic-release/git';
import GithubRelease from '@semantic-release/github';
import npmSetAuth from '@semantic-release/npm/lib/set-npmrc-auth';
import fs from 'fs';
import { generateChangelog } from './changelog';
import { INTIAL_REALEASE_TYPE, PKG_NAME } from './constants';
import { updatePackageVersions } from './package';
import {
  generateNextRelease,
  initializeRelease,
  releasePackage,
} from './release';
import { createTag, pushTags } from './tags';
import { Configuration, PackageContext, ReleaseType } from './types';
import {
  applyUpdatesToDependents,
  git,
  hijackSemanticRelease,
  promisifyPlugin,
  trackUpdates,
  transformPlugins,
} from './utils';

const RELEASE_ASSETS = ['**/package.json', 'CHANGELOG.md'];
const DEFAULT_CONFIG: Configuration = {
  branch: 'master',
  githubRepository: null,
  initial: false,
  npmRegistry: 'https://registry.npmjs.org/',
  releaseAssets: [],
};

export default async (userConfig: Configuration) => {
  const config = {
    ...DEFAULT_CONFIG,
    ...userConfig,
  };
  const gitReleaseConfig: GitRelease.Config = {
    assets: [],
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
      '@semantic-release/release-notes-generator',
    ]);
    const githubUrl =
      config.githubRepository || rootContext.options.repositoryUrl;

    const githubReleaseConfig: GithubRelease.Config = {
      assets: config.releaseAssets,
      failComment: false,
      labels: [PKG_NAME],
      releasedLabels: ['released'],
      successComment: false,
    };

    const packageContexts = new Map<string, PackageContext>();

    rootContext.logger.await('verifying packages');

    if (!config.dryRun) {
      await GitRelease.verifyConditions(gitReleaseConfig, rootContext);
      await GithubRelease.verifyConditions(githubReleaseConfig, rootContext);
    }

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

    if (config.initial) {
      packageNames
        .filter(pkgName => !packageUpdates.has(pkgName))
        .forEach(pkgName => packageUpdates.set(pkgName, INTIAL_REALEASE_TYPE));
    }

    const updatedNames = Array.from(packageUpdates.keys());
    if (!updatedNames.length) {
      rootContext.logger.warn('no releases found, exiting now');
      return;
    }

    await Promise.all(
      updatedNames.map(pkgName =>
        generateNextRelease(
          packageUpdates.get(pkgName),
          packageContexts.get(pkgName)
        )
      )
    );

    await Promise.all(
      updatedNames.map(pkgName =>
        updatePackageVersions(pkgName, graph, packageContexts, updatedNames)
      )
    );

    const publishablePackages = updatedNames.filter(
      name => !graph.get(name).pkg.private
    );
    const repositoryUrl = githubUrl.replace(/\.git$/, '');
    const { file: changelogFile, content: changelog } = await generateChangelog(
      cwd,
      repositoryUrl,
      graph,
      packageContexts,
      updatedNames,
      publishablePackages
    );

    await fs.promises.writeFile(changelogFile, changelog);

    await promisifyPlugin('prepare', updatedNames, packageContexts);

    if (config.dryRun) {
      rootContext.logger.warn(
        'Skip git commit and tag creation - this is a dry run'
      );
      rootContext.logger.warn(
        `Skipped tags:\n${publishablePackages
          .map(
            pkgName =>
              `- ${packageContexts.get(pkgName).context.nextRelease.gitTag}`
          )
          .join('\n')}`
      );
    } else {
      await git(cwd).add(RELEASE_ASSETS);
      await git(cwd).commit(
        `chore(release): release packages [skip ci]\n${publishablePackages
          .map(
            pkgName =>
              `\n- ${pkgName} -> v${
                packageContexts.get(pkgName).context.nextRelease.version
              }`
          )
          .join('')}`
      );

      await Promise.all(
        publishablePackages.map(pkgName =>
          createTag(packageContexts.get(pkgName), rootContext, cwd)
        )
      );
    }

    if (config.dryRun) {
      rootContext.logger.warn('Skip release and publish - this is a dry run');
      return;
    } else {
      await pushTags(
        cwd,
        config,
        githubUrl,
        publishablePackages,
        packageContexts
      );
      rootContext.logger.success('Pushed tags, commits and changelog');
    }

    try {
      for (const pkgName of publishablePackages) {
        await releasePackage(
          packageContexts,
          pkgName,
          config,
          graph,
          updatedNames,
          githubReleaseConfig
        );
      }

      await promisifyPlugin('success', publishablePackages, packageContexts);
    } catch (err) {
      // tslint:disable-next-line: no-console
      console.error(err);
      await promisifyPlugin('fail', publishablePackages, packageContexts);
      throw err;
    }
  } catch (err) {
    // tslint:disable-next-line: no-console
    console.error(err);

    process.exit(-1);
  }
};
