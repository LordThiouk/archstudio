import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { blankArchitecture } from '../defaults';
import { DEFAULT_MERGE, mergeProposal } from './merge';
import type { Architecture, Component } from '../types';

/* One property matters more than every other in this file: **the author's work
 * survives.** Every test below is a way of asking that question — a filled
 * field, an existing dependency, a component the proposal does not mention. */

const comp = (id: string, over: Partial<Component> = {}): Component => ({
  id, name: id, group: 'core', layer: 'services',
  tech: [], features: [], notes: [], deps: [], ...over
});

const doc = (components: Component[]): Architecture => ({
  ...blankArchitecture('Existing'),
  groups: [{ id: 'core', name: 'Core' }],
  layers: [{ id: 'services', name: 'Services' }, { id: 'data', name: 'Data' }],
  components
});

test('a field the author has written in is never overwritten', () => {
  const current = doc([comp('api', { role: 'Mine', tech: ['Go'] })]);
  const merged = mergeProposal(current, {
    components: [comp('api', { role: 'The model’s', tech: ['Rust'], features: ['Serves traffic'] })]
  }, DEFAULT_MERGE);

  const api = merged.components[0];
  assert.equal(api.role, 'Mine');
  assert.deepEqual(api.tech, ['Go']);
  /* …but a field left empty is filled, which is the whole point. */
  assert.deepEqual(api.features, ['Serves traffic']);
});

test('nothing is ever removed', () => {
  const current = doc([comp('api', { deps: ['db'] }), comp('db', { layer: 'data' }), comp('legacy')]);
  const merged = mergeProposal(current, { components: [comp('api')] }, DEFAULT_MERGE);

  assert.equal(merged.components.length, 3);
  assert.deepEqual(merged.components.find(c => c.id === 'api')!.deps, ['db']);
});

test('new components arrive with the scopes and layers they need', () => {
  const current = doc([comp('api')]);
  const merged = mergeProposal(current, {
    groups: [{ id: 'payments', name: 'Payments' }],
    layers: [{ id: 'vendors', name: 'Third parties' }],
    components: [comp('psp', { group: 'payments', layer: 'vendors' })]
  }, DEFAULT_MERGE);

  assert.equal(merged.components.length, 2);
  assert.ok(merged.groups.some(g => g.id === 'payments'));
  /* Appended at the bottom: only the author knows where a new tier belongs. */
  assert.equal(merged.layers[merged.layers.length - 1].id, 'vendors');
});

test('a dependency on a component that is not being added is dropped, not left dangling', () => {
  const current = doc([comp('api')]);
  const merged = mergeProposal(current, {
    components: [comp('api', { deps: ['queue'] }), comp('queue')]
  }, { addComponents: false, fillGaps: false, addDeps: true });

  assert.equal(merged.components.length, 1);
  assert.deepEqual(merged.components[0].deps, []);
});

test('an annotation only travels with an edge this merge actually drew', () => {
  const current = doc([
    comp('api', { deps: ['db'], links: [{ to: 'db', protocol: 'Mine' }] }),
    comp('db', { layer: 'data' }),
    comp('cache', { layer: 'data' })
  ]);
  const merged = mergeProposal(current, {
    components: [comp('api', {
      deps: ['db', 'cache'],
      links: [{ to: 'db', protocol: 'The model’s' }, { to: 'cache', protocol: 'Redis' }]
    })]
  }, DEFAULT_MERGE);

  const api = merged.components[0];
  assert.deepEqual(api.deps, ['db', 'cache']);
  assert.deepEqual(api.links, [{ to: 'db', protocol: 'Mine' }, { to: 'cache', protocol: 'Redis' }]);
});

test('each option can be turned off on its own', () => {
  const current = doc([comp('api')]);
  const proposal = {
    components: [comp('api', { role: 'Filled in' , deps: ['new'] }), comp('new')]
  };

  const onlyGaps = mergeProposal(current, proposal, { addComponents: false, fillGaps: true, addDeps: false });
  assert.equal(onlyGaps.components.length, 1);
  assert.equal(onlyGaps.components[0].role, 'Filled in');
  assert.deepEqual(onlyGaps.components[0].deps, []);

  const onlyNew = mergeProposal(current, proposal, { addComponents: true, fillGaps: false, addDeps: false });
  assert.equal(onlyNew.components.length, 2);
  assert.equal(onlyNew.components[0].role, undefined);

  const none = mergeProposal(current, proposal, { addComponents: false, fillGaps: false, addDeps: false });
  assert.deepEqual(none, current);
});

test('the current document is not mutated', () => {
  const current = doc([comp('api')]);
  const before = JSON.stringify(current);
  mergeProposal(current, { components: [comp('api', { role: 'x' }), comp('other')] }, DEFAULT_MERGE);
  assert.equal(JSON.stringify(current), before);
});
