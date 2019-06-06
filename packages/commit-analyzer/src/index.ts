import {
  commitFilter,
  Context,
  PluginConfig as BaseConfig
} from '@iolaus/common';
import * as CommitAnalyzer from '@semantic-release/commit-analyzer';

export interface PluginConfig extends BaseConfig {
  readonly force?: string;
}

export function analyzeCommits(
  { pkgName, force, ...pluginConfig }: PluginConfig,
  { commits, ...context }: Context
): any {
  // tslint:disable-next-line:no-if-statement
  if (force) {
    return force;
  }

  const filteredCommits = commits.filter(commitFilter(pkgName));

  return CommitAnalyzer.analyzeCommits(pluginConfig, {
    ...context,
    commits: filteredCommits
  });
}
