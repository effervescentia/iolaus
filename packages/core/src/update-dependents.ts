// tslint:disable:no-implicit-dependencies
import PackageGraph from '@lerna/package-graph';
import { ReleaseType } from 'semver';

import { PackageUpdate } from './types';

// tslint:disable-next-line:readonly-array
const RELEASE_TYPES: ReleaseType[] = [
  'prerelease',
  'prepatch',
  'patch',
  'preminor',
  'minor',
  'premajor',
  'major'
];

function isGreaterVersion(target: ReleaseType, source: ReleaseType): boolean {
  return RELEASE_TYPES.indexOf(target) > RELEASE_TYPES.indexOf(source);
}

// tslint:disable-next-line:readonly-array
// function getMaxBump(releases: Readonly<Release[]>): ReleaseType {
//   return releases.reduce<ReleaseType>(
//     (type, release) =>
//       isGreaterVersion(release.type, type) ? release.type : type,
//     'patch'
//   );
// }

export default function updateDependents(
  pkgName: string,
  packageUpdates: Map<string, PackageUpdate>,
  packageGraph: PackageGraph
): void {
  const { localDependents } = packageGraph.get(pkgName);
  const currentUpdate = packageUpdates.get(pkgName);
  // const currentBump = getMaxBump(currentUpdate.releases);

  // tslint:disable-next-line:no-if-statement
  if (currentUpdate.initial || localDependents.size === 0) {
    // release without updating dependents
    return;
  }

  // tslint:disable-next-line:no-expression-statement
  localDependents.forEach((_, dependentKey) => {
    const dependentUpdate = packageUpdates.get(dependentKey);

    // tslint:disable-next-line:no-if-statement
    if (dependentUpdate) {
      // const lastRelease =
      //   dependentUpdate.releases[dependentUpdate.releases.length - 1];

      // tslint:disable-next-line:no-if-statement
      if (isGreaterVersion(currentUpdate.type, dependentUpdate.type)) {
        // tslint:disable-next-line:no-expression-statement
        packageUpdates.set(dependentKey, {
          ...dependentUpdate,
          type: currentUpdate.type
        });
      }
    }
  });
}
