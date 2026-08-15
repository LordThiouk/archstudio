import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { insertFlow } from './apply';
import { blankArchitecture, normalizeArchitecture } from '../defaults';
import type { Architecture, Component } from '../types';
import type { FlowPattern } from './types';

/* The load-bearing property here is the last test in the file: what this module
 * pushes must survive `normalizeArchitecture`, because that runs on every save
 * and would otherwise hollow out the flow without saying anything. */

const comp = (id: string, name: string, group = 'core'): Component =>
  ({ id, name, group, layer: 'services' });

function doc(): Architecture {
  const d = blankArchitecture('Test');
  d.components = [
    comp('web', 'Web app', 'core'),
    comp('api', 'API', 'core'),
    comp('db', 'Database', 'vendor')
  ];
  return d;
}

const PATTERN: FlowPattern = {
  id: 'checkout', source: 'catalog', icon: 'card',
  name: 'Checkout', tagline: 'Order and payment.',
  steps: [
    { key: 'a', title: 'Basket submitted', description: 'The customer confirms.', hint: {} },
    { key: 'b', title: 'Order priced', hint: {} },
    { key: 'c', title: 'Order stored', hint: {} }
  ]
};

const insert = (d: Architecture, bindings: (string | null)[], rest = {}) =>
  insertFlow(d, { pattern: PATTERN, bindings, ...rest });

test('a bound pattern becomes a flow, descriptions and all', () => {
  const d = doc();
  const res = insert(d, ['web', 'api', 'db']);
  assert.deepEqual(res, { id: 'checkout', steps: 3, dropped: 0 });
  assert.equal(d.flows.length, 1);
  assert.deepEqual(d.flows[0].steps[0], {
    component: 'web', title: 'Basket submitted', description: 'The customer confirms.'
  });
  assert.equal('description' in d.flows[0].steps[1], false, 'no empty description field');
});

test('skipped and dead bindings are dropped and counted', () => {
  const d = doc();
  const res = insert(d, ['web', null, 'gone']);
  assert.equal(res, null, 'one surviving step is not a flow');
  assert.deepEqual(d.flows, [], 'and the document is left untouched');

  const res2 = insert(d, ['web', 'api', 'gone']);
  assert.deepEqual(res2, { id: 'checkout', steps: 2, dropped: 1 });
});

test('inserting the same pattern twice gives two flows with distinct ids', () => {
  const d = doc();
  insert(d, ['web', 'api', 'db']);
  insert(d, ['web', 'api', 'db']);
  assert.deepEqual(d.flows.map(f => f.id), ['checkout', 'checkout-2']);
});

test('the scope defaults to the first bound component, and an explicit one wins', () => {
  const d = doc();
  insert(d, ['db', 'api', 'web']);
  assert.equal(d.flows[0].group, 'vendor');

  insert(d, ['web', 'api', 'db'], { group: 'vendor' });
  assert.equal(d.flows[1].group, 'vendor');
});

test('a renamed flow drives the id', () => {
  const d = doc();
  const res = insert(d, ['web', 'api', 'db'], { name: 'Commande B2B' });
  assert.equal(res?.id, 'commande-b2b');
  assert.equal(d.flows[0].name, 'Commande B2B');
});

test('sub and note ride along when the pattern carries them', () => {
  const d = doc();
  insertFlow(d, {
    pattern: { ...PATTERN, sub: 'Consumer · under a minute', note: '<b>Watch out.</b>' },
    bindings: ['web', 'api', 'db']
  });
  assert.equal(d.flows[0].sub, 'Consumer · under a minute');
  assert.equal(d.flows[0].note, '<b>Watch out.</b>');
});

test('the Flows tab is made reachable when the tab order was pinned without it', () => {
  const d = doc();
  d.ui.tabs = ['overview', 'architecture', 'stack'];
  insert(d, ['web', 'api', 'db']);
  assert.deepEqual(d.ui.tabs, ['overview', 'architecture', 'flows', 'stack'],
    'slotted where the viewer would put it, not appended after the stack');
});

test('an empty tab order means "natural" and is left alone', () => {
  const d = doc();
  insert(d, ['web', 'api', 'db']);
  assert.deepEqual(d.ui.tabs, undefined);
});

test('a Flows view previously switched off is switched back on', () => {
  const d = doc();
  d.ui.views = { ...d.ui.views, flows: false };
  insert(d, ['web', 'api', 'db']);
  assert.equal(d.ui.views?.flows, true);
});

test('an already-listed tab is not duplicated', () => {
  const d = doc();
  d.ui.tabs = ['overview', 'flows', 'architecture'];
  insert(d, ['web', 'api', 'db']);
  assert.deepEqual(d.ui.tabs, ['overview', 'flows', 'architecture']);
});

test('the inserted flow survives normalisation byte for byte', () => {
  const d = doc();
  insert(d, ['web', 'api', 'db']);
  const before = structuredClone(d.flows);
  assert.deepEqual(normalizeArchitecture(d).flows, before);
});
