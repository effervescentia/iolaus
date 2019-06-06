export interface PluginConfig {
  readonly pkgName: string;
}

export interface Commit {
  readonly body: string;
}

export interface BaseContext {
  readonly cwd?: string;
  readonly env?: Record<string, string>;
  readonly logger?: Console;
}

export interface Context extends BaseContext {
  // tslint:disable-next-line:readonly-array
  readonly commits: Commit[];
  readonly nextRelease: {
    readonly notes: string;
  };
}
