declare module '@semantic-release/github' {
  import { Context } from 'semantic-release';

  export interface Config {
    readonly githubUrl?: string;
    readonly githubApiPathPrefix?: string;
    readonly proxy?: string;
    readonly successComment?: string | false;
    readonly failComment?: string | false;
    readonly failTitle?: string;
    readonly labels?: string[];
    readonly releasedLabels?: string[];
    readonly assignees?: string[];
    readonly assets?: Array<
      | string
      | {
          readonly path: string;
          readonly name?: string;
          readonly label?: string;
        }
    >;
  }

  function verifyConditions(
    pluginConfig: Config,
    context: Context
  ): Promise<void>;
  function publish(pluginConfig: Config, context: Context): Promise<void>;
  function success(pluginConfig: Config, context: Context): Promise<void>;
  function fail(pluginConfig: Config, context: Context): Promise<void>;
}
