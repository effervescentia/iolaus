#!/usr/bin/env node
const cosmiconfig = require('cosmiconfig');
const commander = require('commander');
const readPkg = require('read-pkg');
const releasePackages = require('@iolaus/core').default;

const cfg = cosmiconfig('iolaus');

const CONFIG_OPTION = [
  '-c --config [config_file]',
  'set the location of the config file to read or where to start searching',
  process.cwd(),
];
const INITIAL_OPTION = [
  '-i --initial',
  'if any packages do not have an associated tagged release, create initial releases based off of their current versions',
];
const REPOSITORY_OPTION = [
  '-p --repository [github_repository]',
  'set github repository url',
];
const REGISTRY_OPTION = [
  '-r --registry [npm_registry]',
  'set npm registry url',
  'https://registry.npmjs.org/',
];

async function getRootConfig(
  configFile,
  { registry, repository, ...argOptions }
) {
  try {
    const res = await cfg.load(configFile).catch(() => cfg.search(configFile));

    return {
      ...(res ? res.config : {}),
      ...(registry && { npmRegistry: registry }),
      ...(repository && { githubRepository: repository }),
      ...('initial' in argOptions && { initial: argOptions.initial }),
    };
  } catch (err) {
    console.error(`unable to load file: "${configFile}"\n\n`, err);
  }
}

async function main() {
  const pkg = await readPkg({ cwd: __dirname });

  commander.version(pkg.version);

  commander
    .command('analyze <output_file>')
    .description(
      "analyze the repository's commit history and report which versions would be released"
    )
    .option(...CONFIG_OPTION)
    .option(...INITIAL_OPTION)
    .option(...REPOSITORY_OPTION)
    .option(...REGISTRY_OPTION)
    .action(async (outputFile, { config, ...argOptions }) => {
      const rootConfig = await getRootConfig(config, argOptions);
      // await releasePackages(options);
    });

  commander
    .arguments('[options]')
    .option('-b --branch [branch]', 'set the branch to release from', 'master')
    .option('-d --dry-run', 'skip any steps past "generateNotes"')
    .option(...CONFIG_OPTION)
    .option(...INITIAL_OPTION)
    .option(...REPOSITORY_OPTION)
    .option(...REGISTRY_OPTION)
    .action(async (_, { branch, config, ...argOptions }) => {
      const rootConfig = await getRootConfig(config, argOptions);
      const options = {
        ...rootConfig,
        ...(branch && { branch }),
        ...('dryRun' in argOptions && { dryRun: argOptions.dryRun }),
      };

      await releasePackages(options);
    });

  commander.parse(process.argv);
}

main();
