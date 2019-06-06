// tslint:disable:no-implicit-dependencies
import { PackageGraphNode } from '@lerna/package-graph';
import path from 'path';
import _semanticRelease, { GlobalConfig } from 'semantic-release';
import { ReleaseType } from 'semver';
import semverDiff from 'semver-diff';

import { Commit, PackageUpdate, Release } from './types';

interface SemanticConfig extends GlobalConfig {
  // tslint:disable-next-line:readonly-array
  readonly plugins: ReadonlyArray<string | [string, object]>;
}

export interface ReleaseResult {
  readonly lastRelease: {
    readonly version?: string;
  };
  readonly nextRelease: {
    readonly version: string;
  };
  // tslint:disable-next-line:readonly-array
  readonly commits: Readonly<Commit[]>;
  // tslint:disable-next-line:readonly-array
  readonly releases: Readonly<Release[]>;
}

type SemanticRelease = (
  opts?: Partial<SemanticConfig>,
  context?: {
    readonly cwd?: string;
    readonly env?: Record<string, string>;
  }
) => Promise<false | ReleaseResult>;

const semanticRelease: SemanticRelease = _semanticRelease as any;

const COMMIT_NAME = 'iolaus-bot';
const COMMIT_EMAIL = 'bot@iolaus.effervescentia.com';

export async function recordReleases(
  pkgName: string,
  packageUpdates: Map<string, PackageUpdate>
): Promise<void> {
  const result = await semanticRelease(
    {
      branch: 'f/release',
      plugins: [['@iolaus/commit-analyzer', { pkgName }]]
    },
    {
      env: process.env
    }
  );

  // tslint:disable-next-line:no-if-statement
  if (result) {
    const {
      lastRelease,
      nextRelease: { version }
    } = result;

    const initial = !lastRelease.version;

    // tslint:disable-next-line:no-expression-statement
    packageUpdates.set(pkgName, {
      initial,
      ...(initial && {
        type: semverDiff(lastRelease.version, version) as ReleaseType
      })
    });
  }
}

export async function performRelease(
  { name: pkgName, location, localDependencies }: PackageGraphNode,
  bump: ReleaseType,
  packageUpdates: Map<string, string>
): Promise<void> {
  // tslint:disable-next-line:no-expression-statement
  await semanticRelease(
    {
      branch: 'f/release',
      plugins: [
        ['@iolaus/commit-analyzer', { force: bump }],
        [
          '@iolaus/release-notes-generator',
          {
            dependencyUpdates: Array.from(packageUpdates.entries()).filter(
              ([key]) => localDependencies.has(key)
            ),
            pkgName
          }
        ],
        [
          '@semantic-release/changelog',
          {
            changelogFile: path.resolve(location, 'CHANGELOG.md')
          }
        ]
        // '@semantic-release/npm',
        // '@semantic-release/github'
      ],
      tagFormat: `${pkgName}-v\${version}`
    },
    {
      env: {
        ...process.env,
        COMMIT_EMAIL,
        COMMIT_NAME
      }
    }
  );
}
