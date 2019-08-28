declare module '@semantic-release/git' {
  import { Context } from 'semantic-release';

  export interface Config {
    readonly message?: string;
    readonly assets?: string[];
  }

  export function prepare(config: Config, context: Context): Promise<void>;
  export function verifyConditions(
    config: Config,
    context: Context
  ): Promise<void>;
}
