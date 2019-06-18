// tslint:disable:no-implicit-dependencies no-submodule-imports
import PackageGraph from '@lerna/package-graph';
import { Configuration, Context, PluginArray } from 'semantic-release';
import getSemanticPlugins from 'semantic-release/lib/plugins';
import { ReleaseType } from 'semver';
import simpleGit from 'simple-git/promise';
import { PackageContext } from './types';

export const git = simpleGit();

export function transformOptions(
  context: Context,
  transform: (options: Configuration) => Configuration
): Context {
  return {
    ...context,
    options: transform(context.options)
  };
}

export function transformPlugins(
  context: Context,
  transform: (plugins: PluginArray) => PluginArray
): Context {
  return transformOptions(context, options => ({
    ...options,
    plugins: transform(context.options.plugins)
  }));
}

export function maxSemver(lhs: ReleaseType, rhs: ReleaseType): ReleaseType {
  return lhs || rhs;
}

export async function trackUpdates(
  pkgName: string,
  graph: PackageGraph,
  pkgContexts: Map<string, PackageContext>,
  pkgUpdates: Map<string, ReleaseType>
): Promise<ReleaseType> {
  if (pkgUpdates.has(pkgName)) {
    return pkgUpdates.get(pkgName);
  }

  const { context, plugins } = await pkgContexts.get(pkgName);

  // tslint:disable-next-line: no-let
  let pkgUpdate = await plugins.analyzeCommits(context);

  if (!pkgUpdate) {
    pkgUpdate = await Array.from(
      graph.get(pkgName).localDependencies.keys()
    ).reduce<Promise<ReleaseType>>(
      (acc, key) =>
        acc.then(accType =>
          trackUpdates(key, graph, pkgContexts, pkgUpdates).then(type =>
            maxSemver(accType, type)
          )
        ),
      Promise.resolve(null)
    );
  }

  if (pkgUpdate) {
    pkgUpdates.set(pkgName, pkgUpdate);
  }

  return pkgUpdate;
}

export async function createPackageContext(
  pkgName: string,
  baseContext: Context
): Promise<PackageContext> {
  const context = transformPlugins(
    transformOptions(baseContext, options => ({
      ...options,
      tagFormat: `${pkgName}-${options.tagFormat}`
    })),
    // TODO: filter out base plugins that are re-declared in the child to preserve intended order
    basePlugins => [...basePlugins.filter(() => true)]
  );
  const plugins = await getSemanticPlugins(context, {});

  return { context, plugins };
}