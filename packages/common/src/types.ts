export interface PluginConfig {
  readonly pkgName: string;
}

export interface Commit {
  readonly body: string;
}

export interface Context {
  // tslint:disable-next-line:readonly-array
  readonly commits: Commit[];
}
