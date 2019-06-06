// tslint:disable:no-implicit-dependencies no-submodule-imports
import { BaseContext } from '@iolaus/common';
import PackageGraph, { PackageGraphNode } from '@lerna/package-graph';
import prepareChangelog from '@semantic-release/changelog/lib/prepare';
import path from 'path';
import _semanticRelease, { GlobalConfig } from 'semantic-release';
import { ReleaseType } from 'semver';
import semverDiff from 'semver-diff';
import simpleGit from 'simple-git/promise';

import { Commit, PackageUpdate, Release } from './types';

interface SemanticConfig extends GlobalConfig {
  readonly dryRun?: boolean;
  // tslint:disable-next-line:readonly-array
  readonly plugins?: ReadonlyArray<string | [string, object]>;
}

export interface ReleaseResult {
  readonly lastRelease: Partial<Release>;
  readonly nextRelease: Release;
  // tslint:disable-next-line:readonly-array
  readonly commits: Readonly<Commit[]>;
  // tslint:disable-next-line:readonly-array
  readonly releases: Readonly<Release[]>;
}

type SemanticRelease = (
  opts?: Partial<SemanticConfig>,
  context?: BaseContext
) => Promise<false | ReleaseResult>;

const semanticRelease: SemanticRelease = _semanticRelease as any;
const git = simpleGit();

const COMMIT_NAME = 'iolaus-bot';
const COMMIT_EMAIL = 'bot@iolaus.effervescentia.com';

export async function recordReleases(
  pkgName: string,
  packageUpdates: Map<string, PackageUpdate>,
  packageGraph: PackageGraph
): Promise<void> {
  const result = await semanticRelease(
    {
      branch: 'f/release',
      dryRun: true,
      plugins: [['@iolaus/commit-analyzer', { pkgName }]]
    },
    {
      env: process.env
    }
  );

  if (!result) {
    return;
  }

  const {
    lastRelease,
    nextRelease: { version }
  } = result;

  const initial = !lastRelease.version;

  packageUpdates.set(pkgName, {
    initial,
    node: packageGraph.get(pkgName),
    type: initial
      ? 'patch'
      : (semverDiff(lastRelease.version, version) as ReleaseType)
  });
}

export async function updateChangelogs(
  { name: pkgName, location, localDependencies }: PackageGraphNode,
  bump: ReleaseType,
  packageUpdates: Map<string, string>
): Promise<void> {
  const changelogFile = path.resolve(location, 'CHANGELOG.md');
  const env = {
    ...process.env,
    COMMIT_EMAIL,
    COMMIT_NAME
  };

  const result = await semanticRelease(
    {
      branch: 'f/release',
      dryRun: true,
      plugins: [
        ['@iolaus/commit-analyzer', { force: bump }],
        [
          '@iolaus/release-notes-generator',
          {
            dependencyUpdates: Array.from(packageUpdates.keys()).filter(key =>
              localDependencies.has(key)
            ),
            pkgName
          }
        ],
        ['@semantic-release/changelog', { changelogFile }]
      ],
      tagFormat: `${pkgName}-v\${version}`
    },
    { env }
  );

  if (!result) {
    return;
  }

  await prepareChangelog(
    { changelogFile },
    {
      cwd: process.cwd(),
      logger: console,
      nextRelease: result.nextRelease
    }
  );

  await git.add(changelogFile);
}

export async function createReleases(
  newVersions: Map<string, string>
): Promise<void> {
  await git.commit(
    `chore(release): release updates to packages\n\n${Array.from(
      newVersions.entries()
    )
      .map(([key, version]) => `update *${key}* -> *v${version}*`)
      .join('\n')}`
  );
}
