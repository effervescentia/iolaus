declare module '@semantic-release/commit-analyzer' {
  import { commitFilter, Context, PluginConfig } from '@iolaus/common';

  export function analyzeCommits(pluginConfig: object, context: Context): any;
}
