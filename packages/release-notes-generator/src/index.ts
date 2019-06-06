import { commitFilter, Context, PluginConfig } from '@iolaus/common';
import * as ReleaseNotesGenerator from '@semantic-release/release-notes-generator';

export function generateNotes(
  { pkgName, ...pluginConfig }: PluginConfig,
  { commits, ...context }: Context
): any {
  const filteredCommits = commits.filter(commitFilter(pkgName));

  return ReleaseNotesGenerator.generateNotes(pluginConfig, {
    ...context,
    commits: filteredCommits
  });
}
