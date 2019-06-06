import {
  commitFilter,
  Context,
  PluginConfig as BaseConfig
} from '@iolaus/common';
import * as ReleaseNotesGenerator from '@semantic-release/release-notes-generator';

interface PluginConfig extends BaseConfig {
  // tslint:disable-next-line:readonly-array
  readonly dependencyUpdates: Readonly<string[]>;
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
    : `${notes.slice(0, -2)}* chore(deps): bump ${dependencyUpdates.join(
        ', '
      )}\n\n\n`;
}
