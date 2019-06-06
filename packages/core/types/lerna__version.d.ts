declare module '@lerna/version' {
  type Versions = Map<string, string>;

  interface Options {
    readonly amend?: boolean;
    readonly changelog?: boolean;
    readonly gitTagVersion?: boolean;
    readonly push?: boolean;
    readonly yes?: boolean;
    readonly bump?: string;
    readonly composed?: string;
    readonly scope?: string;
    readonly tagVersionPrefix?: string;
  }

  interface Package {
    readonly name: string;
  }

  interface PackageGraphNode {
    readonly name: string;
    readonly version: string;
    readonly location: string;
    readonly pkg: Package;
    readonly externalDependencies: Map<string, object>;
    readonly localDependencies: Map<string, object>;
    readonly localDependents: Map<string, PackageGraphNode>;
  }

  export class VersionCommand {
    // tslint:disable:readonly-array readonly-keyword
    protected packageGraph: Map<string, PackageGraphNode>;
    protected updates: Readonly<PackageGraphNode[]>;
    protected updatesVersions: Versions;
    protected packagesToVersion: Readonly<unknown[]>;
    protected batchedPackages: Readonly<unknown[]>;
    // tslint:enable:readonly-array readonly-keyword

    constructor(opts: Options);

    public getVersionsForUpdates(): Promise<Versions>;
  }
}
