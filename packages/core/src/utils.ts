// tslint:disable:no-implicit-dependencies no-submodule-imports
import { Commit } from '@iolaus/common';
import PackageGraph from '@lerna/package-graph';
import cosmiconfig from 'cosmiconfig';
import readPkg from 'read-pkg';
import { Configuration, Context, PluginArray } from 'semantic-release';
import getSemanticPlugins from 'semantic-release/lib/plugins';
import { ReleaseType } from 'semver';
import simpleGit from 'simple-git/promise';
import { PackageContext } from './types';

const AFFECTED_PKGS_REGEX = /\baffects: ([^, ]*(?:,[\r\n ][^, ]*)*)/m;
export const SEMVER_TYPES: ReleaseType[] = [
  'major',
  'premajor',
  'minor',
  'preminor',
  'patch',
  'prepatch',
  'prerelease',
];

export const git = cwd => simpleGit(cwd);

export function transformOptions(
  context: Context,
  transform: (options: Configuration) => Configuration
): Context {
  return {
    ...context,
    options: transform(context.options),
  };
}

export function transformPlugins(
  context: Context,
  transform: (plugins: PluginArray) => PluginArray
): Context {
  return transformOptions(context, options => ({
    ...options,
    plugins: transform(context.options.plugins),
  }));
}

export function maxSemver(lhs: ReleaseType, rhs: ReleaseType): ReleaseType {
  if (lhs == null || rhs == null) {
    return lhs || rhs;
  }

  return SEMVER_TYPES.indexOf(lhs) < SEMVER_TYPES.indexOf(rhs) ? lhs : rhs;
}

function collectDependents(
  graph: PackageGraph,
  dependentPkgs: string[],
  pkgName: string
): void {
  if (!dependentPkgs.includes(pkgName)) {
    dependentPkgs.push(pkgName);

    graph.get(pkgName).localDependents.forEach((_, depName) => {
      collectDependents(graph, dependentPkgs, depName);
    });
  }
}

export function applyUpdatesToDependents(
  pkgName: string,
  graph: PackageGraph,
  pkgUpdates: Map<string, ReleaseType>
): void {
  const updateType = pkgUpdates.get(pkgName);

  Array.from(graph.get(pkgName).localDependents.keys())
    .reduce((acc, key) => {
      collectDependents(graph, acc, key);

      return acc;
    }, [])
    .forEach(depName =>
      pkgUpdates.set(
        depName,
        maxSemver(pkgUpdates.get(depName) || null, updateType)
      )
    );
}

export async function trackUpdates(
  pkgName: string,
  pkgContexts: Map<string, PackageContext>,
  pkgUpdates: Map<string, ReleaseType>
): Promise<void> {
  const { context, plugins } = pkgContexts.get(pkgName);

  // tslint:disable-next-line: no-let
  const pkgUpdate = await plugins.analyzeCommits(context);

  if (pkgUpdate) {
    context.logger.success(
      `release of type "${pkgUpdate}" will be generated for package "${pkgName}"`
    );
    pkgUpdates.set(pkgName, pkgUpdate);
  }
}

export async function createPackageContext(
  pkgName: string,
  cwd: string,
  location: string,
  baseContext: Context
): Promise<PackageContext> {
  const config = await cosmiconfig('iolaus', {
    stopDir: cwd,
  }).search(location);

  const context = transformPlugins(
    transformOptions(baseContext, options => ({
      ...options,
      tagFormat: `${pkgName}-${options.tagFormat}`,
      ...config,
    })),
    // TODO: filter out base plugins that are re-declared in the child to preserve intended order
    basePlugins => basePlugins
  );

  return {
    context: {
      ...context,
      errors: [],
    },
    location,
    pkg: await readPkg({ cwd: location }),
    plugins: await getSemanticPlugins(context, {}),
  };
}

export function commitFilter(pkgName: string): (commit: Commit) => boolean {
  return ({ body }) => {
    const matches = body.match(AFFECTED_PKGS_REGEX);

    return (
      matches &&
      matches.length > 1 &&
      matches[1]
        .split(',')
        .map(s => s.trim())
        .includes(pkgName)
    );
  };
}
