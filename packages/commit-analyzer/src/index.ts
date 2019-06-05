import { commitFilter, Context, PluginConfig } from '@iolaus/common';
import { analyzeCommits as _analyzeCommits } from '@semantic-release/commit-analyzer';

export function analyzeCommits(
  { pkgName, ...pluginConfig }: PluginConfig,
  { commits, ...context }: Context
): any {
  const filteredCommits = commits.filter(commitFilter(pkgName));

  return _analyzeCommits(pluginConfig, {
    ...context,
    commits: filteredCommits
  });
}
