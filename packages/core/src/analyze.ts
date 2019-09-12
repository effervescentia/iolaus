// tslint:disable:no-implicit-dependencies
import PackageGraph from '@lerna/package-graph';
import * as SemanticRelease from 'semantic-release';
import { INTIAL_REALEASE_TYPE } from './constants';
import { Configuration, PackageContext, ReleaseType } from './types';
import { maxSemver } from './utils';

export default async function analyzeCommits(
  config: Configuration,
  rootContext: SemanticRelease.Context,
  packageContexts: Map<string, PackageContext>,
  graph: PackageGraph,
  packageNames: string[]
): Promise<Map<string, ReleaseType>> {
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

  return packageUpdates;
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

export function collectDependents(
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
