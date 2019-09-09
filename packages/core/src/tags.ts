import fs from 'fs';
import * as isomorphicGit from 'isomorphic-git';
import { Context } from 'semantic-release';
import { Configuration, PackageContext } from './types';

export async function createTag(
  { context }: PackageContext,
  rootContext: Context,
  cwd: string
): Promise<void> {
  const nextTag = context.nextRelease.gitTag;

  await isomorphicGit.tag({
    dir: cwd,
    fs,
    ref: nextTag,
  });
  rootContext.logger.success(`Created tag ${nextTag}`);
}

export async function pushTags(
  cwd: string,
  config: Configuration,
  githubUrl: string,
  publishablePackages: string[],
  pkgContexts: Map<string, PackageContext>
): Promise<void> {
  await isomorphicGit.push({
    dir: cwd,
    fs,
    remoteRef: config.branch,
    token: process.env.GH_TOKEN,
    url: githubUrl,
  });
  await Promise.all(
    publishablePackages.map(pkgName =>
      isomorphicGit.push({
        dir: cwd,
        fs,
        ref: pkgContexts.get(pkgName).context.nextRelease.gitTag,
        token: process.env.GH_TOKEN,
        url: githubUrl,
      })
    )
  );
}
