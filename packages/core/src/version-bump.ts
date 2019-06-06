// tslint:disable:no-class no-this no-implicit-dependencies no-expression-statement
import { Options, VersionCommand } from '@lerna/version';

class VersionBump extends VersionCommand {
  constructor(argv: Options, public pkgName: string) {
    super(argv);
  }

  public async getVersionsForUpdates(): Promise<Map<string, string>> {
    const versions = await super.getVersionsForUpdates();

    versions.forEach(
      (_, key: string) =>
        key !== this.pkgName &&
        versions.set(key, this.packageGraph.get(key).version)
    );

    return versions;
  }

  public setUpdatesForVersions(): void {
    console.log(
      'updates',
      this.updates.map(pkg =>
        Object.getOwnPropertyNames(pkg).reduce((acc, key) => {
          acc[key] = pkg[key];

          return acc;
        }, {})
      )
    );
    this.updates = [];
    this.updatesVersions = new Map();
    this.packagesToVersion = [];
  }
}

export default VersionBump;

export function bumpVersions(pkgName: string, version: string): void {
  // tslint:disable-next-line:no-expression-statement no-unused-expression
  new VersionBump(
    {
      amend: false,
      bump: version,
      changelog: false,
      composed: 'iolaus',
      gitTagVersion: false,
      push: false,
      scope: pkgName,
      tagVersionPrefix: `${pkgName}-v`,
      yes: true
    },
    pkgName
  );
}
