// tslint:disable:no-class no-this no-implicit-dependencies
import { VersionCommand } from '@lerna/version';

export default class VersionBump extends VersionCommand {
  // tslint:disable-next-line:readonly-keyword
  private packageGraph: any;

  constructor(argv: any, public pkgName: string) {
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
