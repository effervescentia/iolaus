// tslint:disable:no-implicit-dependencies
import * as SemanticRelease from 'semantic-release';

export interface Configuration extends SemanticRelease.Configuration {
  /** An array of globs for assets that should be included in github release commit */
  readonly assets: string[];
  /** An array of globs for assets that should be packaged in the github release */
  readonly releaseAssets: string[];
  /** The npm registry on which packages will be published */
  readonly npmRegistry: string;
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
