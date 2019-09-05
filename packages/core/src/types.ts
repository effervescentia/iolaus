// tslint:disable:no-implicit-dependencies
import * as SemanticRelease from 'semantic-release';

export interface Configuration extends SemanticRelease.Configuration {
  /** An array of globs for assets that should be packaged in the github release */
  readonly releaseAssets: string[];
  /** The npm registry on which packages will be published */
  readonly npmRegistry: string;
  /** The github repository which holds the source code for this project */
  readonly githubRepository: string;
  /**
   * Whether an initial release should be created when no tags are
   * found and when no release is indicated by commit messages
   */
  readonly initial?: boolean;
}

export interface PackageContext {
  readonly context: SemanticRelease.Context;
  readonly plugins: SemanticRelease.Plugins;
  readonly location: string;
  readonly pkg: { readonly private?: boolean };
}

export interface Sink {
  readonly initialized: boolean;
  readonly context?: SemanticRelease.Context;
  readonly config?: SemanticRelease.Configuration;
}
