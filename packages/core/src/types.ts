// tslint:disable:no-implicit-dependencies
import { Configuration, Context, Plugins } from 'semantic-release';

export interface PackageContext {
  readonly context: Context;
  readonly plugins: Plugins;
  readonly location: string;
  readonly pkg: { readonly private?: boolean };
}

export interface Sink {
  readonly initialized: boolean;
  readonly context?: Context;
  readonly config?: Configuration;
}
