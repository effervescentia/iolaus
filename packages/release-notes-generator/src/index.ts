import {
  commitFilter,
  Context,
  PluginConfig as BaseConfig
} from '@iolaus/common';
import * as ReleaseNotesGenerator from '@semantic-release/release-notes-generator';

interface PluginConfig extends BaseConfig {
  readonly initial: boolean;
  readonly dependencyUpdates: Array<[string, string]>;
}

export async function generateNotes(
  { pkgName, dependencyUpdates, ...pluginConfig }: PluginConfig,
  { commits, ...context }: Context
): Promise<any> {
  const filteredCommits = commits.filter(commitFilter(pkgName));

  const notes = await ReleaseNotesGenerator.generateNotes(pluginConfig, {
    ...context,
    commits: filteredCommits
  });

  return dependencyUpdates.length === 0
    ? notes
    : `${notes.slice(0, -2)}\n### Dependencies\n\n${dependencyUpdates
        .map(([key, version]) => `* **${key}** -> v${version}`)
        .join('\n')}\n\n\n`;
}
