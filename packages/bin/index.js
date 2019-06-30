#!/usr/bin/env node
const cosmiconfig = require('cosmiconfig');
const commander = require('commander');
const readPkg = require('read-pkg');
const releasePackages = require('@iolaus/core').default;

const cfg = cosmiconfig('iolaus');

async function main() {
  const pkg = await readPkg({ cwd: __dirname });

  commander
    .version(pkg.version)
    .arguments('[options]')
    .option(
      '-c --config [config file]',
      'set the location of the config file to read or where to start searching',
      process.cwd()
    )
    .option('-b --branch [branch]', 'set the branch to release from', 'master')
    .option('-d --dry-run', 'skip any steps past "generateNotes"')
    .action(async (_, { branch, config, ...argOptions }) => {
      try {
        const res = await cfg.load(config).catch(() => cfg.search(config));
        const options = {
          ...(res ? res.config : {}),
          ...(branch && { branch }),
          ...('dryRun' in argOptions && { dryRun: argOptions.dryRun }),
        };

        releasePackages(options);
      } catch (err) {
        console.error(`unable to load file: "${config}"\n\n`, err);
      }
    });

  commander.parse(process.argv);
}

main();
