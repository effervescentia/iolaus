// tslint:disable-next-line: no-implicit-dependencies
import PackageGraph from '@lerna/package-graph';
import fs from 'fs';
import path from 'path';
import { PackageContext } from './types';

const SEMANTIC_COMMIT_PATTERN = /^(\w+)(?:\(([^)]*)\))?:\s*(.*)$/;
const COMMENT_INJECTION_POINT = '<!-- INJECT CHANGELOG HERE -->';
// const BREAKING_CHANGE = 'BREAKING CHANGE';

enum CommitType {
  FEATURE = 'feat',
  FIX = 'fix',
  DOCS = 'docs',
  REFACTOR = 'refactor',
  PERFORMANCE = 'perf',
  REVERT = 'revert',
  DEPENDENCIES = 'deps',
}

const VISIBLE_TYPES = [
  CommitType.FEATURE,
  CommitType.FIX,
  CommitType.DEPENDENCIES,
  CommitType.REVERT,
];
const HIDDEN_TYPES = [
  CommitType.PERFORMANCE,
  CommitType.REFACTOR,
  CommitType.DOCS,
];
const ALL_TYPES = [...VISIBLE_TYPES, ...HIDDEN_TYPES];

const COMMITS = {
  [CommitType.FEATURE]: {
    emoji: ':sparkles:',
    title: 'New Features',
  },
  [CommitType.FIX]: {
    emoji: ':bug:',
    title: 'Bug Fixes',
  },
  [CommitType.DOCS]: {
    emoji: ':blue_book:',
    title: 'Documentation',
  },
  [CommitType.REFACTOR]: {
    emoji: ':muscle:',
    title: 'Refactors',
  },
  [CommitType.REVERT]: {
    emoji: ':leftwards_arrow_with_hook:',
    title: 'Revert Changes',
  },
  [CommitType.DEPENDENCIES]: {
    emoji: ':link:',
    title: 'Dependency Updates',
  },
  [CommitType.PERFORMANCE]: {
    emoji: ':link:',
    title: 'Performance Improvements',
  },
};

async function getChangelog(changelogFile: string): Promise<string> {
  try {
    await fs.promises.access(changelogFile, fs.constants.F_OK);

    const changelog = await fs.promises.readFile(changelogFile, 'utf8');

    return changelog.trim();
  } catch {
    return `# Changelog\n\n${COMMENT_INJECTION_POINT}`;
  }
}

export async function generateChangelog(
  directory: string,
  repositoryUrl: string,
  graph: PackageGraph,
  pkgContexts: Map<string, PackageContext>,
  updatedPkgs: string[]
): Promise<{ readonly file: string; readonly content: string }> {
  const date = new Date();
  const changelogFile = path.join(directory, 'CHANGELOG.md');
  // tslint:disable-next-line: no-let
  let nextChangelogEntry = '';

  nextChangelogEntry += `\n\n## ${updatedPkgs
    .map(pkgName => {
      const gitTag = pkgContexts.get(pkgName).context.nextRelease.gitTag;

      return `[\`${gitTag}\`](${repositoryUrl}/releases/tag/${gitTag})`;
    })
    .join(', ')} (${date.getFullYear()}-${date.getMonth() +
    1}-${date.getDate()})`;

  updatedPkgs.forEach(pkgName => {
    const { context } = pkgContexts.get(pkgName);

    nextChangelogEntry += `\n\n### \`${pkgName}\`\n`;

    const updatedDependencies = Array.from(
      graph.get(pkgName).localDependencies.keys()
    ).filter(depName => updatedPkgs.includes(depName));

    const changelogEntries = new Map<CommitType, string[]>(
      updatedDependencies.length
        ? [
            [
              CommitType.DEPENDENCIES,
              updatedDependencies.map(depName => {
                const { context: depContext } = pkgContexts.get(depName);

                return `**automatic**: upgrade \`${depName}\` from \`v${depContext.lastRelease.version}\` -> \`v${depContext.nextRelease.version}\``;
              }),
            ],
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
          } ([${commit.hash.slice(0, 8)}](${repositoryUrl}/commit/${
            commit.hash
          }))`,
        ]);
      }
    });

    VISIBLE_TYPES.forEach(type => {
      nextChangelogEntry += addEntriesToChangelog(changelogEntries, type);
    });

    if (HIDDEN_TYPES.some(type => changelogEntries.has(type))) {
      nextChangelogEntry +=
        '\n\n<details><summary>Additional Details</summary><p>\n';

      HIDDEN_TYPES.forEach(type => {
        nextChangelogEntry += addEntriesToChangelog(changelogEntries, type);
      });

      nextChangelogEntry += '\n\n</p></details>';
    }
  });

  const currentChangelog = await getChangelog(changelogFile);
  const changelogInjectionIndex =
    currentChangelog.indexOf(COMMENT_INJECTION_POINT) +
    COMMENT_INJECTION_POINT.length;
  const changelog =
    currentChangelog.slice(0, changelogInjectionIndex) +
    nextChangelogEntry +
    currentChangelog.slice(changelogInjectionIndex);

  return {
    content: changelog,
    file: changelogFile,
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
    changelog += `\n#### ${emoji} ${title}\n`;
    entries.forEach(entry => {
      changelog += `\n- ${entry}`;
    });
  }

  return changelog;
}
