import { ReleaseType } from 'semver';

import { PackageUpdate } from './types';

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

export default function updateDependents(
  pkgName: string,
  packageUpdates: Map<string, PackageUpdate>
): void {
  const currentUpdate = packageUpdates.get(pkgName);
  const { localDependents } = currentUpdate.node;

  if (currentUpdate.initial || localDependents.size === 0) {
    // release without updating dependents
    return;
  }

  localDependents.forEach((_, dependentKey) => {
    const dependentUpdate = packageUpdates.get(dependentKey);

    if (dependentUpdate) {
      if (isGreaterVersion(currentUpdate.type, dependentUpdate.type)) {
        packageUpdates.set(dependentKey, {
          ...dependentUpdate,
          type: currentUpdate.type
        });
      }
    }
  });
}
