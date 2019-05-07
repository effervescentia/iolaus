// tslint:disable:no-expression-statement
// tslint:disable-next-line:no-implicit-dependencies
import test from 'ava';

import * as Module from '.';

test('exports commit analyzer', t => {
  t.deepEqual(Object.keys(Module), ['analyzeCommits']);
});
