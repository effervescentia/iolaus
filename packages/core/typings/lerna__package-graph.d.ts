declare module '@lerna/package-graph' {
  import { Package } from '@lerna/project';

  namespace PackageGraph {
    interface PackageGraphNode {
      readonly name: string;
      readonly version: string;
      readonly location: string;
      readonly pkg: Package;
      readonly externalDependencies: Map<string, object>;
      readonly localDependencies: Map<string, object>;
      readonly localDependents: Map<string, PackageGraphNode>;
    }
  }

  class PackageGraph extends Map<string, PackageGraph.PackageGraphNode> {
    // tslint:disable-next-line readonly-array
    constructor(packages: Readonly<Package[]>);
  }

  export = PackageGraph;
}
