// tslint:disable-next-line: no-implicit-dependencies
import PackageGraph from '@lerna/package-graph';
import fs from 'fs';
import path from 'path';
import { PackageContext } from './types';

const SEMANTIC_COMMIT_PATTERN = /^(\w+)(?:\(([^)]*)\))?:\s*(.*)$/;
// const BREAKING_CHANGE = 'BREAKING CHANGE';

enum CommitType {
  FEATURE = 'feat',
  FIX = 'fix',
  DOCS = 'docs',
  REFACTOR = 'refactor',
  PERFORMANCE = 'perf',
  REVERT = 'revert',
  DEPENDENCIES = 'deps'
}

const VISIBLE_TYPES = [
  CommitType.FEATURE,
  CommitType.FIX,
  CommitType.DEPENDENCIES,
  CommitType.REVERT
];
const HIDDEN_TYPES = [
  CommitType.PERFORMANCE,
  CommitType.REFACTOR,
  CommitType.DOCS
];
const ALL_TYPES = [...VISIBLE_TYPES, ...HIDDEN_TYPES];

const COMMITS = {
  [CommitType.FEATURE]: {
    emoji: ':sparkles:',
    title: 'New Features'
  },
  [CommitType.FIX]: {
    emoji: ':bug:',
    title: 'Bug Fixes'
  },
  [CommitType.DOCS]: {
    emoji: ':blue_book:',
    title: 'Documentation'
  },
  [CommitType.REFACTOR]: {
    emoji: ':muscle:',
    title: 'Refactors'
  },
  [CommitType.REVERT]: {
    emoji: ':leftwards_arrow_with_hook:',
    title: 'Revert Changes'
  },
  [CommitType.DEPENDENCIES]: {
    emoji: ':link:',
    title: 'Dependency Updates'
  },
  [CommitType.PERFORMANCE]: {
    emoji: ':link:',
    title: 'Performance Improvements'
  }
};

async function getChangelog(changelogFile: string): Promise<string> {
  try {
    await fs.promises.access(changelogFile, fs.constants.F_OK);

    const changelog = await fs.promises.readFile(changelogFile, 'utf8');

    return changelog.trim();
  } catch {
    return '# Changelog';
  }
}

export async function generateChangelog(
  directory: string,
  graph: PackageGraph,
  pkgContexts: Map<string, PackageContext>,
  updatedPkgs: string[]
): Promise<{ readonly file: string; readonly content: string }> {
  const changelogFile = path.join(directory, 'CHANGELOG.md');
  // tslint:disable-next-line: no-let
  let changelog = await getChangelog(changelogFile);

  changelog += '\n\n## (2019-12-31)';

  updatedPkgs.forEach(pkgName => {
    const { context } = pkgContexts.get(pkgName);

    changelog += `\n\n### ${pkgName} v${context.nextRelease.version} (${context.nextRelease.gitTag})\n`;

    const updatedDependencies = Array.from(
      graph.get(pkgName).localDependencies.keys()
    ).filter(depName => updatedPkgs.includes(depName));

    if (updatedDependencies.length) {
      // tslint:disable-next-line: no-object-mutation
      context.nextRelease.notes += `\n### Bug Fixes\n${updatedDependencies.map(
        depName => {
          const { context: depContext } = pkgContexts.get(depName);

          return `\n* *update*: upgrade \`${depName}\` from \`v${depContext.lastRelease.version}\` -> \`v${depContext.nextRelease.version}\``;
        }
      )}`;
    }

    const changelogEntries = new Map<CommitType, string[]>(
      updatedDependencies.length
        ? [
            [
              CommitType.DEPENDENCIES,
              updatedDependencies.map(depName => {
                const { context: depContext } = pkgContexts.get(depName);

                return `**update**: upgrade \`${depName}\` from \`v${depContext.lastRelease.version}\` -> \`v${depContext.nextRelease.version}\``;
              })
            ]
          ]
        : []
    );
    context.commits.forEach(commit => {
      const [, type, scope, subject] = commit.subject.match(
        SEMANTIC_COMMIT_PATTERN
      );

      if (
        type &&
        ALL_TYPES.includes(type as CommitType) &&
        (scope || subject)
      ) {
        changelogEntries.set(type as CommitType, [
          ...(changelogEntries.get(type as CommitType) || []),
          `${
            scope
              ? `**${scope}**${subject ? `: ${subject}` : ''}`
              : subject || ''
          } (${commit.hash})`
        ]);
      }
    });

    VISIBLE_TYPES.forEach(type => {
      changelog += addEntriesToChangelog(changelogEntries, type);
    });

    if (HIDDEN_TYPES.some(type => changelogEntries.has(type))) {
      changelog += '<details><summary>Additional Details</summary><p>';

      HIDDEN_TYPES.forEach(type => {
        changelog += addEntriesToChangelog(changelogEntries, type);
      });

      changelog += '</p></details>';
    }
  });

  return {
    content: changelog,
    file: changelogFile
  };
}

function addEntriesToChangelog(
  changelogEntries: Map<CommitType, string[]>,
  type: CommitType
): string {
  const entries = changelogEntries.get(type);
  // tslint:disable-next-line: no-let
  let changelog = '';

  if (entries) {
    const { emoji, title } = COMMITS[type];
    changelog += `\n#### ${emoji} ${title}:`;
    entries.forEach(entry => {
      changelog += `\n- ${entry}`;
    });
  }

  return changelog;
}
