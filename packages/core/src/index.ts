// tslint:disable:no-class no-this no-implicit-dependencies
import PackageGraph from '@lerna/package-graph';
import { getPackages } from '@lerna/project';
// import * as debug from 'debug';
import _semanticRelease, { GlobalConfig } from 'semantic-release';

interface Commit {
  readonly subject: string;
  readonly body: string;
  readonly hash: string;
  readonly message: string;
  readonly gitTags: string;
  readonly commit: object;
  readonly tree: object;
  readonly author: object;
  readonly committer: object;
  readonly committerDate: Date;
}

type ReleaseType = 'patch' | 'minor' | 'major';

interface Release {
  readonly type: ReleaseType;
  readonly gitHead: string;
  readonly version: string;
  readonly gitTag: string;
  readonly notes: string;
}

interface ReleaseResult {
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

interface PackageUpdate {
  readonly version: string;
  // tslint:disable-next-line:readonly-array
  readonly releases: Readonly<Release[]>;
  readonly initial?: boolean;
}

type SemanticRelease = (
  opts?: Partial<GlobalConfig>,
  context?: {
    readonly cwd?: string;
    readonly env?: Record<string, string>;
  }
) => Promise<false | ReleaseResult>;

// debug.enable('semantic-release:*');

const semanticRelease: SemanticRelease = _semanticRelease as any;

const COMMIT_NAME = 'iolaus-bot';
const COMMIT_EMAIL = 'bot@iolaus.effervescentia.com';

export default async () => {
  try {
    // const cwd = process.cwd();
    // const env = process.env;
    // const { isCi, branch: ciBranch, isPr } = envCi({ env, cwd });

    const packages = await getPackages();
    const packageGraph = new PackageGraph(packages);
    console.log('package graph', packageGraph);
    const packageUpdates = new Map<string, PackageUpdate>();
    // const packageUpdates: Record<string, string> = {};

    for (const { name, ...pkg } of packages) {
      const pkgSymbol = Object.getOwnPropertySymbols(pkg)[0];
      const pkgInfo = pkg[pkgSymbol];
      console.log('pkg:', pkgInfo);

      const result = await semanticRelease(
        {
          plugins: [
            ['@iolaus/commit-analyzer', { pkgName: name }],
            ['@iolaus/release-notes-generator', { pkgName: name }]
            // '@semantic-release/npm',
            // '@semantic-release/github'
          ],
          tagFormat: `${name}-v\${version}`
        } as any,
        {
          env: {
            ...process.env,
            COMMIT_EMAIL,
            COMMIT_NAME
          }
        }
      );

      // tslint:disable-next-line:no-if-statement
      if (result) {
        const {
          lastRelease,
          nextRelease: { version },
          releases
        } = result;

        console.log(name, version);
        // tslint:disable-next-line:no-expression-statement
        packageUpdates.set(name, {
          initial: !lastRelease.version,
          releases,
          version
        });
      }
    }

    // tslint:disable-next-line:no-if-statement
    if (packageUpdates.size !== 0) {
      // tslint:disable-next-line:no-expression-statement
      packageUpdates.forEach((update, key) => {
        const { localDependents } = packageGraph.get(key);
        const currentBump = getMaxBump(update.releases);

        // tslint:disable-next-line:no-if-statement
        if (update.initial || localDependents.size === 0) {
          // release without updating dependents
          return;
        }

        // tslint:disable-next-line:no-expression-statement
        localDependents.forEach((_, dependentKey) => {
          const dependentUpdate = packageUpdates.get(dependentKey);

          // tslint:disable-next-line:no-if-statement
          if (dependentUpdate) {
            const lastRelease =
              dependentUpdate.releases[dependentUpdate.releases.length - 1];

            // tslint:disable-next-line:no-if-statement
            if (isGreaterVersion(currentBump, lastRelease.type)) {
              // tslint:disable-next-line:no-expression-statement
              packageUpdates.set(dependentKey, {
                ...dependentUpdate,
                releases: [
                  ...dependentUpdate.releases.slice(0, -1),
                  {
                    ...lastRelease,
                    notes: `${lastRelease.notes.slice(
                      0,
                      -6
                    )}build(deps): bump ${key} to v${update.version}\n\n\n\n`,
                    type: currentBump
                  }
                ]
              });
            }
          }
        });
      });

      // const independentPackages = new Map(
      //   Array.from(packageUpdates.keys())
      //     .filter(key => packageGraph.get(key).localDependencies.size === 0)
      //     .map(key => [key, packageUpdates.get(key)])
      // );

      // tslint:disable-next-line:no-expression-statement
      Array.from(packageUpdates.entries()).forEach(([pkgKey, value]) =>
        console.log(pkgKey, value.releases)
      );
      // console.log(
      //   'updated:',
      // );
    }
  } catch (e) {
    // tslint:disable-next-line:no-console
    console.error('failed', e);

    throw e;
  }
};

function isGreaterVersion(target: ReleaseType, source: ReleaseType): boolean {
  return (
    target !== source &&
    (target === 'major' || (target === 'minor' && source !== 'major'))
  );
}

// tslint:disable-next-line:readonly-array
function getMaxBump(releases: Readonly<Release[]>): ReleaseType {
  return releases.reduce<ReleaseType>(
    (type, release) =>
      isGreaterVersion(release.type, type) ? release.type : type,
    'patch'
  );
}
