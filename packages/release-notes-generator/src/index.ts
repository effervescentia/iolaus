import { generateNotes as _generateNotes } from '@semantic-release/release-notes-generator';

const AFFECTED_PKGS_REGEX = /affects: (.*)[\r\n]/;

export function generateNotes(
  { pkgName, ...pluginConfig }: any,
  { commits, ...context }: any
): any {
  const filteredCommits = commits.filter(({ body }) => {
    // tslint:disable-next-line:readonly-array
    const matches: string[] = body.match(AFFECTED_PKGS_REGEX);

    return (
      matches &&
      matches.length > 1 &&
      matches[1]
        .split(',')
        .map(s => s.trim())
        .includes(pkgName)
    );
  });

  return _generateNotes(pluginConfig, {
    ...context,
    commits: filteredCommits
  });
}
