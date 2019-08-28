declare module 'semantic-release' {
  import { ReleaseType } from 'semver';

  export type PluginArray = Array<string | [string, object]>;

  export interface Configuration {
    /** The branch on which releases should happen. */
    readonly branch?: string;
    /** The full prepare step configuration. */
    readonly prepare?: any;
    /** The Git repository URL, in any supported format. */
    readonly repositoryUrl?: string;
    /** The Git tag format used by semantic-release to identify releases. */
    readonly tagFormat?: string;
    /** Do not perform any actions other than verification and release note generation. */
    readonly dryRun?: boolean;
    /** An array of plugins to execute. */
    readonly plugins?: PluginArray;
  }

  export interface Release {
    /** The type of the release. */
    readonly type: ReleaseType;
    /** The Git checksum of the last commit of the release. */
    readonly gitHead: string;
    /** The version name of the release */
    version: string; // tslint:disable-line readonly-keyword
    /** The Git tag of the release. */
    gitTag: string; // tslint:disable-line readonly-keyword
  }

  export interface NextRelease extends Release {
    /** The release notes of the next release. */
    notes: string; // tslint:disable-line readonly-keyword
  }

  export interface Context {
    // tslint:disable readonly-keyword
    /** The previous release details. */
    lastRelease?: Release;
    /** The next release details. */
    nextRelease?: NextRelease;
    /** All relevant commits since last release. */
    commits?: Commit[];
    /** Releases */
    releases?: Release[];
    /** Errors */
    errors?: string[];
    // tslint:enable readonly-keyword

    /** The semantic release configuration itself. */
    readonly options?: Configuration;
    /** The shared logger instance of semantic release. */
    readonly logger: Record<
      | 'await'
      | 'complete'
      | 'log'
      | 'error'
      | 'pending'
      | 'star'
      | 'start'
      | 'info'
      | 'success'
      | 'note'
      | 'warn'
      | 'watch',
      (message: string, ...vars: any[]) => void
    >;
    /** Working directory of running the release */
    readonly cwd?: string;
    /** Environment variables. */
    readonly env?: Record<string, string>;
  }

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

  export type Plugin<T = void> = (context: Context) => Promise<T>;

  export interface Plugins {
    readonly verifyConditions: Plugin;
    readonly analyzeCommits: Plugin<ReleaseType>;
    readonly generateNotes: Plugin<string>;
    readonly verifyRelease: Plugin;
    readonly prepare: Plugin;
    readonly publish: Plugin<Release[]>;
    readonly success: Plugin;
    readonly fail: Plugin;
  }

  export interface ReleaseResult {
    readonly lastRelease: Release;
    readonly nextRelease: NextRelease;
    readonly commits: Commit[];
    readonly releases: Release[];
  }

  export default function SemanticRelease(
    opts?: Configuration,
    context?: Context
  ): Promise<false | ReleaseResult>;
}

declare module 'semantic-release/lib/plugins' {
  import { Context, Plugins } from 'semantic-release';

  function createPlugins(
    context: Context,
    pluginsPath: object
  ): Promise<Plugins>;

  export = createPlugins;
}

declare module 'semantic-release/lib/git' {
  import { Context, Plugins } from 'semantic-release';

  export function getGitHead(context: Context): Promise<string>;

  export function tag(tagName: string, context: Context): Promise<void>;

  export function push(repositoryUrl: string, context: Context): Promise<void>;
}

declare module 'semantic-release/lib/get-last-release' {
  import { Context, Release } from 'semantic-release';

  function getLastRelease(context: Context): Promise<Release>;

  export = getLastRelease;
}

declare module 'semantic-release/lib/get-commits' {
  import { Commit, Context } from 'semantic-release';

  function getCommits(context: Context): Promise<Commit[]>;

  export = getCommits;
}
