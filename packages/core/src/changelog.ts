// tslint:disable-next-line: no-implicit-dependencies
import PackageGraph from '@lerna/package-graph';
import fs from 'fs';
import path from 'path';
import { PackageContext } from './types';

const SEMANTIC_COMMIT_PATTERN = /^(\w+)(?:\(([^)]*)\))?:\s*(.*)$/;
const COMMENT_INJECTION_POINT = '<!-- INJECT CHANGELOG HERE -->';
const BREAKING_CHANGE_PATTERN = /^BREAKING CHANGE:[\r\n]+(.*)$/m;

enum CommitType {
  BREAKING_CHANGE = 'breakingChange',
  FEATURE = 'feat',
  FIX = 'fix',
  DOCS = 'docs',
  REFACTOR = 'refactor',
  PERFORMANCE = 'perf',
  REVERT = 'revert',
  DEPENDENCIES = 'deps',
}

const VISIBLE_TYPES = [
  CommitType.BREAKING_CHANGE,
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

const ROCKET_EMOJI = ':rocket:';
const WARNING_EMOJI = ':warning:';
const COMMITS = {
  [CommitType.BREAKING_CHANGE]: {
    emoji: ':boom:',
    title: 'Breaking Changes',
  },
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
  updatedPkgs: string[],
  publishablePackages: string[]
): Promise<{ readonly file: string; readonly content: string }> {
  const date = new Date();
  const changelogFile = path.join(directory, 'CHANGELOG.md');
  // tslint:disable-next-line: no-let
  let nextChangelogEntry = `\n\n## ${publishablePackages
    .map(pkgName => {
      const gitTag = pkgContexts.get(pkgName).context.nextRelease.gitTag;

      return `[\`${gitTag}\`](${repositoryUrl}/releases/tag/${gitTag})`;
    })
    .join(', ')} (${date.getFullYear()}-${date.getMonth() +
    1}-${date.getDate()})`;

  updatedPkgs.forEach(pkgName => {
    const { context } = pkgContexts.get(pkgName);
    const canPublish = publishablePackages.includes(pkgName);

    const updatedDependencies = canPublish
      ? Array.from(graph.get(pkgName).localDependencies.keys()).filter(
          depName =>
            updatedPkgs.includes(depName) &&
            pkgContexts.get(depName).context.lastRelease.version
        )
      : [];

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
      const semanticCommit = commit.subject.match(SEMANTIC_COMMIT_PATTERN) as [
        string,
        CommitType,
        string,
        string
      ];

      if (semanticCommit) {
        const [, type, scope, subject] = semanticCommit;

        const breakingChange = commit.message.match(BREAKING_CHANGE_PATTERN);
        if (breakingChange) {
          const [, changeDetails] = breakingChange;
          changelogEntries.set(CommitType.BREAKING_CHANGE, [
            ...(changelogEntries.get(CommitType.BREAKING_CHANGE) || []),
            `${WARNING_EMOJI} **${changeDetails}** ${WARNING_EMOJI}`,
          ]);
        }

        if (type && ALL_TYPES.includes(type) && (scope || subject)) {
          changelogEntries.set(type, [
            ...(changelogEntries.get(type) || []),
            `${
              scope
                ? `**${scope}**${subject ? `: ${subject}` : ''}`
                : subject || ''
            } ([${commit.hash.slice(0, 8)}](${repositoryUrl}/commit/${
              commit.hash
            }))`,
          ]);
        }
      }
    });

    const packageEntry = generatePackageEntry(changelogEntries);
    if (packageEntry !== '') {
      nextChangelogEntry += `\n\n### \`${pkgName}\`\n`;

      if (canPublish && !context.lastRelease.version) {
        nextChangelogEntry += `\n${ROCKET_EMOJI} **Initial Release** ${ROCKET_EMOJI}`;
      }

      nextChangelogEntry += packageEntry;
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

function generatePackageEntry(
  changelogEntries: Map<CommitType, string[]>
): string {
  // tslint:disable-next-line: no-let
  let packageEntry = '';

  VISIBLE_TYPES.forEach(type => {
    packageEntry += generateCommitEntry(changelogEntries, type);
  });

  if (HIDDEN_TYPES.some(type => changelogEntries.has(type))) {
    packageEntry += '\n\n<details><summary>Additional Details</summary><p>\n';
    HIDDEN_TYPES.forEach(type => {
      packageEntry += generateCommitEntry(changelogEntries, type);
    });
    packageEntry += '\n\n</p></details>';
  }

  return packageEntry;
}

function generateCommitEntry(
  changelogEntries: Map<CommitType, string[]>,
  type: CommitType
): string {
  const entries = changelogEntries.get(type);
  // tslint:disable-next-line: no-let
  let commitEntry = '';

  if (entries) {
    const { emoji, title } = COMMITS[type];
    commitEntry += `\n\n#### ${emoji} ${title}\n`;
    entries.forEach(entry => {
      commitEntry += `\n- ${entry}`;
    });
  }

  return commitEntry;
}
