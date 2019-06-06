// tslint:disable:no-class no-this no-implicit-dependencies
import PackageGraph from '@lerna/package-graph';
import { getPackages } from '@lerna/project';
import semver from 'semver';

import { createReleases, recordReleases, updateChangelogs } from './release';
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
      await recordReleases(name, packageUpdates, packageGraph);
    }

    if (packageUpdates.size === 0) {
      // tslint:disable-next-line:no-console
      console.error('no packages to update!');
      return;
    }

    Array.from(packageUpdates.keys()).forEach(key =>
      updateDependents(key, packageUpdates)
    );

    const newVersions = new Map(
      Array.from(packageUpdates.entries()).map(
        ([key, { type, node, initial }]) =>
          [
            key,
            initial ? node.version : semver.inc(node.version, type)
            // tslint:disable-next-line:readonly-array
          ] as [string, string]
      )
    );

    Array.from(packageUpdates.entries()).forEach(([pkgKey, value]) =>
      console.log(pkgKey, value.type)
    );

    packageUpdates.forEach(({ type, node, initial }) =>
      updateChangelogs(node, initial, type, newVersions)
    );

    await createReleases(newVersions);
  } catch (e) {
    // tslint:disable-next-line:no-console
    console.error('failed', e);

    throw e;
  }
};
