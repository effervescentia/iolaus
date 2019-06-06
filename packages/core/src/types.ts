// tslint:disable:no-implicit-dependencies
import { PackageGraphNode } from '@lerna/package-graph';
import { ReleaseType } from 'semver';

export interface Commit {
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

export interface Release {
  readonly type: ReleaseType;
  readonly gitHead: string;
  readonly version: string;
  readonly gitTag: string;
  readonly notes: string;
}

export interface PackageUpdate {
  readonly initial: boolean;
  readonly node: PackageGraphNode;
  readonly info: { readonly repository?: string | { readonly url?: string } };
  readonly type: ReleaseType;
}
