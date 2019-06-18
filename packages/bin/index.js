#!/usr/bin/env node
const comisconfig = require('cosmiconfig');
const releasePackages = require('@iolaus/core').default;

comisconfig('iolaus')
  .search()
  .then(res => releasePackages(res ? res.config : {}));
