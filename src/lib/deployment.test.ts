import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { blankArchitecture, normalizeArchitecture } from './defaults';
import { canonicalise, cleanDeployedOn, deploymentsInUse } from './deployment';
import type { Architecture, Component } from './types';

const comp = (id: string, over: Partial<Component> = {}): Component => ({
  id, name: id, group: 'core', layer: 'services', icon: 'box',
  tech: [], features: [], notes: [], deps: [], ...over
});

const build = (components: Component[]): Architecture =>
  normalizeArchitecture({ ...blankArchitecture('Test'), components });

/* -------------------------------------------------------------- cleaning */

test('a value is trimmed and its inner whitespace folded', () => {
  assert.equal(cleanDeployedOn('  OpenShift  '), 'OpenShift');
  assert.equal(cleanDeployedOn('OpenShift   4.14'), 'OpenShift 4.14');
});

test('nothing to say is stored as nothing, not as an empty string', () => {
  /* The contract `normalizeMarks` keeps, and what lets a document written before
   * this field existed export byte for byte as it did. */
  for (const v of ['', '   ', undefined, null, 42, {}]) {
    assert.equal(cleanDeployedOn(v), undefined, `${JSON.stringify(v)} should clean to undefined`);
  }
});

/* ---------------------------------------------------------- canonicalising */

test('one spelling per platform wins, and it is the first one the document uses', () => {
  /* Without this, "openshift" typed into the second component is a second filter
   * chip and a second inventory row for one platform. */
  const items = [
    comp('a', { deployedOn: 'OpenShift' }),
    comp('b', { deployedOn: 'openshift' }),
    comp('c', { deployedOn: 'OPENSHIFT' })
  ];
  canonicalise(items);
  assert.deepEqual(items.map(c => c.deployedOn), ['OpenShift', 'OpenShift', 'OpenShift']);
});

test('only case is folded — two real answers stay two answers', () => {
  const items = [comp('a', { deployedOn: 'OpenShift' }), comp('b', { deployedOn: 'OpenShift 4.14' })];
  canonicalise(items);
  assert.deepEqual(items.map(c => c.deployedOn), ['OpenShift', 'OpenShift 4.14']);
});

test('canonicalising cleans as it goes, and leaves an unset component unset', () => {
  const items = [comp('a', { deployedOn: '  AWS ' }), comp('b')];
  canonicalise(items);
  assert.equal(items[0].deployedOn, 'AWS');
  assert.equal(items[1].deployedOn, undefined);
});

/* ------------------------------------------------------------- in use */

test('the platforms in use are distinct and alphabetical', () => {
  /* Alphabetical rather than by count: this list is a row of filter chips, and a
   * row that reorders itself when a component is added is one you have to read
   * again every time. */
  const items = [
    comp('a', { deployedOn: 'OpenShift' }),
    comp('b', { deployedOn: 'AWS' }),
    comp('c', { deployedOn: 'OpenShift' }),
    comp('d')
  ];
  assert.deepEqual(deploymentsInUse(items), ['AWS', 'OpenShift']);
});

test('a document that names no platform offers no chips', () => {
  assert.deepEqual(deploymentsInUse([comp('a'), comp('b')]), []);
});

/* ------------------------------------------------- through the normaliser */

test('the field survives a round trip, and an empty one is never stored', () => {
  const doc = build([
    comp('a', { deployedOn: 'OpenShift' }),
    comp('b', { deployedOn: '   ' }),
    comp('c')
  ]);
  assert.equal(doc.components[0].deployedOn, 'OpenShift');
  assert.equal(doc.components[1].deployedOn, undefined);
  assert.equal(doc.components[2].deployedOn, undefined);
});

test('the normaliser canonicalises across the whole document', () => {
  /* It is the only pass that sees every component at once, which is why the fold
   * lives there rather than in the field's own cleaner. */
  const doc = build([comp('a', { deployedOn: 'Azure' }), comp('b', { deployedOn: 'azure' })]);
  assert.deepEqual(doc.components.map(c => c.deployedOn), ['Azure', 'Azure']);
  assert.deepEqual(deploymentsInUse(doc.components), ['Azure']);
});

test('a document that never names a platform is unchanged by any of this', () => {
  const before = build([comp('a'), comp('b')]);
  assert.ok(before.components.every(c => c.deployedOn === undefined));
  assert.deepEqual(JSON.parse(JSON.stringify(before)), JSON.parse(JSON.stringify(build(before.components))));
});
