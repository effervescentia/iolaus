declare module '@semantic-release/npm' {
  import { Context } from 'semantic-release';

  export interface Config {
    readonly npmPublish?: boolean;
    readonly pkgRoot?: string;
    readonly tarballDir?: string | false;
  }

  export function prepare(config: Config, context: Context): Promise<void>;
  export function publish(config: Config, context: Context): Promise<void>;
  export function verifyConditions(
    config: Config,
    context: Context
  ): Promise<void>;
}

declare module '@semantic-release/npm/lib/publish' {
  import { Config } from '@semantic-release/npm';
  import { Context } from 'semantic-release';

  function publish(
    config: Config,
    pkg: object,
    context: Context
  ): Promise<void>;

  export = publish;
}
