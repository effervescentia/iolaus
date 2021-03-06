#!/usr/bin/env node
const cosmiconfig = require('cosmiconfig');
const commander = require('commander');
const readPkg = require('read-pkg');
const releasePackages = require('@iolaus/core').default;

const cfg = cosmiconfig('iolaus');

async function main() {
  const pkg = await readPkg({ cwd: __dirname });

  commander.version(pkg.version);

  commander
    .arguments('[options]')
    .option(
      '-c --config [config file]',
      'set the location of the config file to read or where to start searching',
      process.cwd()
    )
    .option('-b --branch [branch]', 'set the branch to release from', 'master')
    .option(
      '-r --registry [npm registry]',
      'set npm registry url',
      'https://registry.npmjs.org/'
    )
    .option('-p --repository [github repository]', 'set github repository url')
    .option('-d --dry-run', 'skip any steps past "generateNotes"')
    .option(
      '-i --initial',
      'if any packages do not have an associated tagged release, create initial releases based off of their current versions'
    )
    .action(
      async (_, { branch, config, registry, repository, ...argOptions }) => {
        try {
          const res = await cfg.load(config).catch(() => cfg.search(config));
          const options = {
            ...(res ? res.config : {}),
            ...(branch && { branch }),
            ...(registry && { npmRegistry: registry }),
            ...(repository && { githubRepository: repository }),
            ...('initial' in argOptions && { initial: argOptions.initial }),
            ...('dryRun' in argOptions && { dryRun: argOptions.dryRun }),
          };

          releasePackages(options);
        } catch (err) {
          console.error(`unable to load file: "${config}"\n\n`, err);
        }
      }
    );

  // commander
  //   .command('init')
  //   .description('initialize a new iolaus project')
  //   .action(() => {
  //     process.exit(-1);
  //   });

  commander.parse(process.argv);
}

main();
