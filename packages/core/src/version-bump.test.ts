// tslint:disable:no-expression-statement no-implicit-dependencies no-string-literal no-object-mutation
import test from 'ava';

import { VersionCommand } from '@lerna/version';
import sinon from 'sinon';

import VersionBump from './version-bump';

test('VersionBump#getVersionsForUpdates()', async t => {
  const packageName = '@some/package';
  const versionMap = new Map([
    [packageName, '1.4.0'],
    ['other', '1.4.2'],
    ['last', '3.4.2']
  ]);
  const packageGraph = new Map([
    [packageName, { version: '1.3.4' }],
    ['other', { version: '1.4.3' }],
    ['more', { version: '1.3.3' }],
    ['last', { version: '3.4.3' }]
  ]);
  const superGetVersionForUpdates = sinon
    .stub(VersionCommand.prototype, 'getVersionsForUpdates')
    .returns(Promise.resolve(versionMap));

  const bump = new VersionBump({}, packageName);
  (bump as any).packageGraph = packageGraph;

  await bump.getVersionsForUpdates();

  t.is(bump.pkgName, packageName);
  t.true(superGetVersionForUpdates.called);
  t.is(versionMap.get(packageName), '1.4.0');
  t.is(versionMap.get('other'), '1.4.3');
  t.is(versionMap.get('last'), '3.4.3');
  t.deepEqual(Array.from(versionMap.keys()), [packageName, 'other', 'last']);
});
