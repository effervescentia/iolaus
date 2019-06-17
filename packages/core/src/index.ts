// tslint:disable:no-class no-this no-implicit-dependencies
import { NewVersion } from '@iolaus/common';
import PackageGraph from '@lerna/package-graph';
import { getPackages } from '@lerna/project';
import debug from 'debug';
import semver from 'semver';

import { createReleases, recordReleases, updateChangelogs } from './release';
import { PackageUpdate } from './types';
import updateDependents from './update-dependents';

export default async () => {
  debug.disable('semantic-release:*');

  try {
    // const cwd = process.cwd();
    // const env = process.env;
    // const { isCi, branch: ciBranch, isPr } = envCi({ env, cwd });

    const packages = await getPackages();
    const packageGraph = new PackageGraph(packages);
    const packageUpdates = new Map<string, PackageUpdate>();

    for (const { name, ...pkg } of packages) {
      const pkgInfo = pkg[Object.getOwnPropertySymbols(pkg)[0]];
      await recordReleases(name, pkgInfo, packageUpdates, packageGraph);
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
            {
              version: initial ? node.version : semver.inc(node.version, type)
            }
            // tslint:disable-next-line:readonly-array
          ] as [string, NewVersion]
      )
    );

    for (const pkg of packageUpdates.values()) {
      await updateChangelogs(pkg, newVersions);
    }

    await createReleases(newVersions);
  } catch (e) {
    // tslint:disable-next-line:no-console
    console.error('failed', e);

    throw e;
  }
};
