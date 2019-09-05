// tslint:disable:no-implicit-dependencies
import PackageGraph from '@lerna/package-graph';
import fs from 'fs';
import path from 'path';
import writePkg from 'write-pkg';
import { PackageContext } from './types';

const DEPENDENCY_KEY_PATTERN = /^([a-z]*D|d)ependencies$/;

export async function updatePackageVersions(
  pkgName: string,
  graph: PackageGraph,
  pkgContexts: Map<string, PackageContext>,
  updatedNames: string[]
): Promise<void> {
  const { localDependencies } = graph.get(pkgName);
  const { context, location } = pkgContexts.get(pkgName);
  const updatedDependencies = Array.from(localDependencies.keys()).filter(
    depName => updatedNames.includes(depName)
  );

  const pkgLocation = path.join(location, 'package.json');
  const pkgString = await fs.promises.readFile(pkgLocation, 'utf8');

  const pkg = JSON.parse(pkgString);

  // tslint:disable-next-line: no-object-mutation
  pkg.version = context.nextRelease.version;

  Object.keys(pkg)
    .filter(key => DEPENDENCY_KEY_PATTERN.test(key))
    .forEach(pkgKey =>
      updatedDependencies.forEach(depName => {
        const pkgDeps = pkg[pkgKey];
        const nextVersion = pkgContexts.get(depName).context.nextRelease
          .version;

        if (depName in pkgDeps && pkgDeps[depName] !== nextVersion) {
          // tslint:disable-next-line: no-object-mutation
          pkgDeps[depName] = nextVersion;
        }
      })
    );

  await writePkg(path.join(location, 'package.json'), pkg);
}
