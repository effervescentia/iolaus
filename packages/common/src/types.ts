export interface PluginConfig {
  readonly pkgName: string;
}

export interface Commit {
  readonly body: string;
}

export interface Context {
  readonly commits: readonly Commit[];
}
