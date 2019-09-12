// tslint:disable:no-implicit-dependencies
import PackageGraph from '@lerna/package-graph';
import { getPackages } from '@lerna/project';
import GitRelease from '@semantic-release/git';
import GithubRelease from '@semantic-release/github';
import npmSetAuth from '@semantic-release/npm/lib/set-npmrc-auth';
import fs from 'fs';
import * as SemanticRelease from 'semantic-release';
import analyzeCommits from './analyze';
import { generateChangelog } from './changelog';
import { PKG_NAME } from './constants';
import { updatePackageVersions } from './package';
import {
  generateNextRelease,
  initializeRelease as generateContexts,
  releasePackage,
} from './release';
import { createTag, pushTags } from './tags';
import { Configuration, PackageContext } from './types';
import {
  git,
  hijackSemanticRelease,
  promisifyPlugin,
  transformPlugins,
} from './utils';

const RELEASE_ASSETS = ['**/package.json', 'CHANGELOG.md'];
const DEFAULT_CONFIG: Configuration = {
  githubRepository: null,
  initial: false,
  npmRegistry: 'https://registry.npmjs.org/',
};
const DEFAULT_RELEASE_CONFIG: Configuration = {
  ...DEFAULT_CONFIG,
  branch: 'master',
  releaseAssets: [],
};

export async function releasePackages(
  userConfig: Configuration
): Promise<void> {
  const config = {
    ...DEFAULT_RELEASE_CONFIG,
    ...userConfig,
  };

  const gitReleaseConfig: GitRelease.Config = {
    assets: [],
  };

  const githubReleaseConfig: GithubRelease.Config = {
    assets: config.releaseAssets,
    failComment: false,
    labels: [PKG_NAME],
    releasedLabels: ['released'],
    successComment: false,
  };

  try {
    const {
      cwd,
      graph,
      packageContexts,
      packageNames,
      rootContext,
    } = await initialize(config, async context => {
      if (!config.dryRun) {
        await GitRelease.verifyConditions(gitReleaseConfig, context);
        await GithubRelease.verifyConditions(githubReleaseConfig, context);
      }
    });

    const githubUrl =
      config.githubRepository || rootContext.options.repositoryUrl;

    await npmSetAuth(config.npmRegistry, rootContext);

    const packageUpdates = await analyzeCommits(
      config,
      rootContext,
      packageContexts,
      graph,
      packageNames
    );

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

    const repositoryUrl = githubUrl.replace(/\.git$/, '');
    const { file: changelogFile, content: changelog } = await generateChangelog(
      cwd,
      repositoryUrl,
      graph,
      packageContexts,
      updatedNames
    );

    await fs.promises.writeFile(changelogFile, changelog);

    await promisifyPlugin('prepare', updatedNames, packageContexts);

    const publishablePackages = updatedNames.filter(
      name => !graph.get(name).pkg.private
    );

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
}

export async function analyzePackages(
  userConfig: Configuration
): Promise<void> {
  const config = {
    ...DEFAULT_CONFIG,
    ...userConfig,
  };

  const {
    graph,
    packageContexts,
    packageNames,
    rootContext,
  } = await initialize(config, async () => {});

  const packageUpdates = await analyzeCommits(
    config,
    rootContext,
    packageContexts,
    graph,
    packageNames
  );
}

export async function initialize(
  config: Configuration,
  verifyContext: (context: SemanticRelease.Context) => Promise<void>
): Promise<{
  readonly cwd: string;
  readonly graph: PackageGraph;
  readonly packageContexts: Map<string, PackageContext>;
  readonly packageNames: string[];
  readonly rootContext: SemanticRelease.Context;
}> {
  const cwd = process.cwd();

  const packages = await getPackages();
  const graph = new PackageGraph(packages);
  const packageNames = Array.from(graph.keys());

  const hijackedContext = await hijackSemanticRelease(config);
  hijackedContext.logger.success('semantic release context hijacked');

  const rootContext = transformPlugins(hijackedContext, () => [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
  ]);

  const packageContexts = new Map<string, PackageContext>();

  rootContext.logger.await('verifying packages');
  await verifyContext(rootContext);

  for (const pkgName of packageNames) {
    await generateContexts(
      pkgName,
      cwd,
      graph.get(pkgName).location,
      rootContext,
      packageContexts
    );
  }
  rootContext.logger.complete('packages verified');

  return {
    cwd,
    graph,
    packageContexts,
    packageNames,
    rootContext,
  };
}
