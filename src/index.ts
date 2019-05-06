// tslint:disable:no-class no-this
// tslint:disable-next-line:no-implicit-dependencies
import { getPackages } from '@lerna/project';
import { VersionCommand } from '@lerna/version';
// import * as debug from 'debug';
import _semanticRelease, { GlobalConfig } from 'semantic-release';

// debug.enable('semantic-release:*');

const semanticRelease: (
  opts?: Partial<GlobalConfig>,
  context?: {
    readonly cwd?: string;
    readonly env?: Record<string, string>;
  }
) => Promise<boolean> = _semanticRelease as any;

const COMMIT_NAME = 'iolaus-bot';
const COMMIT_EMAIL = 'bot@iolaus.com';

class VersionBump extends VersionCommand {
  private readonly packageGraph: any;

  constructor(argv: any, private pkgName: string) {
    // tslint:disable-next-line:no-expression-statement
    super(argv);
  }

  public getVersionsForUpdates(): Promise<Map<string, string>> {
    return super.getVersionsForUpdates().then(versions => {
      // tslint:disable-next-line:no-expression-statement
      versions.forEach(
        (_, key: string) =>
          key !== this.pkgName &&
          versions.set(key, this.packageGraph.get(key).version)
      );

      return versions;
    });
  }
}

export default async () => {
  try {
    // const cwd = process.cwd();
    // const env = process.env;
    // const { isCi, branch: ciBranch, isPr } = envCi({ env, cwd });

    const packages = await getPackages();

    for (const { name } of packages) {
      const result: false | any = await semanticRelease(
        {
          plugins: [
            ['iolaus-commit-analyzer', { pkgName: name }],
            ['iolaus-release-notes-generator', { pkgName: name }],
            // '@semantic-release/npm',
            '@semantic-release/github'
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
          nextRelease: { version }
        } = result;

        // tslint:disable-next-line:no-expression-statement no-unused-expression
        new VersionBump(
          {
            amend: false,
            bump: version,
            changelog: false,
            composed: 'iolaus',
            gitTagVersion: false,
            push: false,
            scope: name,
            tagVersionPrefix: `${name}-v`,
            yes: true
          },
          name
        );
      }
    }
  } catch (e) {
    // tslint:disable-next-line:no-console
    console.error('failed', e);

    throw e;
  }
};
