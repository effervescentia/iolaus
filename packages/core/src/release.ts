import { commitFilter } from '@iolaus/common';
import { Context, Release } from 'semantic-release';
import getCommits from 'semantic-release/lib/get-commits';
import getLastRelease from 'semantic-release/lib/get-last-release';
import { PackageContext } from './types';
import { createPackageContext } from './utils';

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
