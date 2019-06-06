declare module '@semantic-release/release-notes-generator' {
  import { commitFilter, Context, PluginConfig } from '@iolaus/common';

  export function generateNotes(pluginConfig: object, context: Context): any;
}
