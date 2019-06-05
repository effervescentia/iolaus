import { Commit } from './types';

const AFFECTED_PKGS_REGEX = /\baffects: ([^, ]*(?:,[\r\n ][^, ]*)*)/m;

export function commitFilter(pkgName: string): (commit: Commit) => boolean {
  return ({ body }) => {
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
  };
}
