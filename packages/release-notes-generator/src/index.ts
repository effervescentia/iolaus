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

export function generateNotes(
  { pkgName, dependencyUpdates, ...pluginConfig }: PluginConfig,
  { commits, ...context }: Context
): any {
  const filteredCommits = commits.filter(commitFilter(pkgName));

  const notes = ReleaseNotesGenerator.generateNotes(pluginConfig, {
    ...context,
    commits: filteredCommits
  });

  return `${notes.slice(0, -6)}chore(deps): bump ${dependencyUpdates.join(
    ', '
  )}\n\n\n\n`;
}
