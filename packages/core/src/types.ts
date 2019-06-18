// tslint:disable:no-implicit-dependencies
import { Configuration, Context, Plugins } from 'semantic-release';

export interface PackageContext {
  readonly context: Context;
  readonly plugins: Plugins;
}

export interface Sink {
  readonly initialized: boolean;
  readonly context?: Context;
  readonly config?: Configuration;
}
