import { commitFilter } from '@iolaus/common';
import { Context } from 'semantic-release';
import getCommits from 'semantic-release/lib/get-commits';
import getLastRelease from 'semantic-release/lib/get-last-release';
import { PackageContext } from './types';
import { createPackageContext } from './utils';

export async function initializeRelease(
  pkgName: string,
  rootContext: Context,
  packageContexts: Map<string, PackageContext>
): Promise<void> {
  rootContext.logger.log(`initializing package: "${pkgName}"`);

  const pkgContext = await createPackageContext(pkgName, rootContext);
  const { context } = pkgContext;

  await pkgContext.plugins.verifyConditions(context);

  // tslint:disable-next-line: no-object-mutation
  context.lastRelease = await getLastRelease(context);

  // tslint:disable-next-line: no-object-mutation
  context.commits = (await getCommits(context)).filter(commitFilter(pkgName));

  packageContexts.set(pkgName, pkgContext);
}
