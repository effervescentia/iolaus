// tslint:disable:no-class no-this no-implicit-dependencies
import PackageGraph from '@lerna/package-graph';
import { getPackages } from '@lerna/project';
import semver from 'semver';

import { performRelease, recordReleases } from './release';
import { PackageUpdate } from './types';
import updateDependents from './update-dependents';

export default async () => {
  try {
    // const cwd = process.cwd();
    // const env = process.env;
    // const { isCi, branch: ciBranch, isPr } = envCi({ env, cwd });

    const packages = await getPackages();
    const packageGraph = new PackageGraph(packages);
    const packageUpdates = new Map<string, PackageUpdate>();

    for (const { name } of packages) {
      // tslint:disable-next-line:no-expression-statement
      await recordReleases(
        name,
        // packageGraph.get(name).location,
        packageUpdates
      );
    }

    // tslint:disable-next-line:no-if-statement
    if (packageUpdates.size === 0) {
      console.log('no packages to update!');
      return;
    }

    // tslint:disable-next-line:no-expression-statement
    Array.from(packageUpdates.keys()).forEach(key =>
      updateDependents(key, packageUpdates, packageGraph)
    );

    const newVersions = new Map(
      Array.from(packageUpdates.entries()).map(
        ([key, { type }]) =>
          [
            key,
            semver.inc(packageGraph.get(key).version, type)
            // tslint:disable-next-line:readonly-array
          ] as [string, string]
      )
    );

    // tslint:disable-next-line:no-expression-statement
    Array.from(packageUpdates.entries()).forEach(([pkgKey, value]) =>
      console.log(pkgKey, value.type)
    );

    // tslint:disable-next-line:no-expression-statement
    packageUpdates.forEach(({ type }, key) =>
      performRelease(packageGraph.get(key), type, newVersions)
    );
  } catch (e) {
    // tslint:disable-next-line:no-console
    console.error('failed', e);

    throw e;
  }
};
