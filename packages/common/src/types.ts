export interface PluginConfig {
  readonly pkgName: string;
}

export interface Commit {
  readonly body: string;
}

export interface NewVersion {
  readonly version: string;
  readonly gitTag?: string;
  readonly notes?: string;
  readonly repositoryUrl?: string;
}

export interface BaseContext {
  readonly cwd?: string;
  readonly env?: Record<string, string>;
  readonly logger?: Console;
}

export interface Context extends BaseContext {
  readonly commits: Commit[];
  readonly nextRelease: {
    readonly gitTag: string;
    readonly notes: string;
  };
}
