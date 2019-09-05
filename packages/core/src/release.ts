// tslint:disable:no-implicit-dependencies
import PackageGraph from '@lerna/package-graph';
import GithubRelease from '@semantic-release/github';
import npmPublish from '@semantic-release/npm/lib/publish';
import template from 'lodash.template';
import readPkg from 'read-pkg';
import { Context, NextRelease, Release } from 'semantic-release';
import getCommits from 'semantic-release/lib/get-commits';
import getLastRelease from 'semantic-release/lib/get-last-release';
import { getGitHead } from 'semantic-release/lib/git';
import semver, { ReleaseType } from 'semver';
import writePkg from 'write-pkg';
import { Configuration, PackageContext } from './types';
import { commitFilter, createPackageContext } from './utils';

export async function initializeRelease(
  pkgName: string,
  cwd: string,
  location: string,
  rootContext: Context,
  packageContexts: Map<string, PackageContext>
): Promise<void> {
  rootContext.logger.info(`initializing package: "${pkgName}"`);

  const pkgContext = await createPackageContext(
    pkgName,
    cwd,
    location,
    rootContext
  );
  const { context } = pkgContext;

  await pkgContext.plugins.verifyConditions(context);

  // tslint:disable: no-object-mutation
  if (pkgContext.pkg.private) {
    rootContext.logger.note(
      `skipping package "${pkgName}" because it is set as private`
    );
    // tslint:disable-next-line: no-object-literal-type-assertion
    context.lastRelease = {} as Release;
    context.commits = [];
  } else {
    context.lastRelease = await getLastRelease(context);
    context.commits = (await getCommits(context)).filter(commitFilter(pkgName));
  }
  // tslint:enable: no-object-mutation

  packageContexts.set(pkgName, pkgContext);
}

export async function generateNextRelease(
  updateType: ReleaseType,
  { context, plugins }: PackageContext
): Promise<void> {
  // tslint:disable-next-line: no-object-mutation no-object-literal-type-assertion
  context.nextRelease = {
    gitHead: await getGitHead(context),
    type: updateType,
  } as NextRelease;

  await plugins.verifyRelease(context);

  // tslint:disable: no-object-mutation
  context.nextRelease.notes = await plugins.generateNotes(context);

  const version = context.lastRelease.version
    ? semver.inc(context.lastRelease.version, updateType)
    : '1.0.0';
  context.nextRelease.version = version;
  context.nextRelease.gitTag = template(context.options.tagFormat)({
    version,
  });
  // tslint:enable: no-object-mutation
}

export async function releasePackage(
  pkgContexts: Map<string, PackageContext>,
  pkgName: string,
  config: Configuration,
  graph: PackageGraph,
  updatedNames: string[],
  githubReleaseConfig: GithubRelease.Config
): Promise<void> {
  const { location, context, plugins } = pkgContexts.get(pkgName);
  const releases = await plugins.publish(context);

  // tslint:disable-next-line: no-object-mutation
  context.releases = releases;

  const { _id, readme, ...pkg } = (await readPkg({
    cwd: location,
  })) as Record<string, any>;
  const pkgWithConfig = {
    ...pkg,
    publishConfig: {
      ...pkg.publishConfig,
      registry: config.npmRegistry,
    },
  };

  await writePkg(location, pkgWithConfig);
  await npmPublish({ pkgRoot: location }, pkgWithConfig, context);
  await writePkg(location, pkg);

  const updatedDependencies = Array.from(
    graph.get(pkgName).localDependencies.keys()
  ).filter(depName => updatedNames.includes(depName));
  const dependencyReleaseNotes = updatedDependencies.length
    ? `### Dependency Updates\n${updatedDependencies
        .map(depName => {
          const { context: depContext } = pkgContexts.get(depName);
          return `\n* **automatic**: upgrade \`${depName}\` from \`v${depContext.lastRelease.version}\` -> \`v${depContext.nextRelease.version}\``;
        })
        .join('')}`
    : '';

  await GithubRelease.publish(githubReleaseConfig, {
    ...context,
    nextRelease: {
      ...context.nextRelease,
      notes: context.nextRelease.notes + dependencyReleaseNotes,
    },
  });
}
