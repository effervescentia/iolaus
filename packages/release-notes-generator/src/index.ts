import { commitFilter, Context, PluginConfig } from '@iolaus/common';
import { generateNotes as _generateNotes } from '@semantic-release/release-notes-generator';

export function generateNotes(
  { pkgName, ...pluginConfig }: PluginConfig,
  { commits, ...context }: Context
): any {
  const filteredCommits = commits.filter(commitFilter(pkgName));

  return _generateNotes(pluginConfig, {
    ...context,
    commits: filteredCommits
  });
}
