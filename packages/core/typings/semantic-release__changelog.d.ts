declare module '@semantic-release/changelog/lib/prepare' {
  import { Context } from '@iolaus/common';

  interface PluginConfig {
    readonly changelogFile?: string;
    readonly changelogTitle?: string;
  }

  function prepare(
    pluginConfig: PluginConfig,
    context: Partial<Context>
  ): Promise<void>;

  export = prepare;
}
