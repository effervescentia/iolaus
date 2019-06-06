declare module '@semantic-release/github/lib/publish' {
  import { Context } from '@iolaus/common';

  interface Options {
    readonly branch: string;
    readonly repositoryUrl: string;
  }

  function publish(
    pluginConfig: object,
    context: Partial<Context & { readonly options: Options }>
  ): Promise<void>;

  export = publish;
}
