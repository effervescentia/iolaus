// tslint:disable:no-expression-statement
// tslint:disable-next-line:no-implicit-dependencies
import test from 'ava';

import * as Module from '.';

test('exports release note generator', t => {
  t.deepEqual(Object.keys(Module), ['generateNotes']);
});
