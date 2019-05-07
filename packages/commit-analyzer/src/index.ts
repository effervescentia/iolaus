import { analyzeCommits as _analyzeCommits } from '@semantic-release/commit-analyzer';

const AFFECTED_PKGS_REGEX = /affects: (.*)[\r\n]/;

export function analyzeCommits(
  { pkgName, ...pluginConfig }: any,
  { commits, ...context }: any
): any {
  const filteredCommits = commits.filter(({ body }) => {
    const matches: readonly string[] = body.match(AFFECTED_PKGS_REGEX);

    return (
      matches &&
      matches.length > 1 &&
      matches[1]
        .split(',')
        .map(s => s.trim())
        .includes(pkgName)
    );
  });

  return _analyzeCommits(pluginConfig, {
    ...context,
    commits: filteredCommits
  });
}
