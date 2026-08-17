import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { buildCatalogSnapshot } from './seed-data';
import { addSuggestedDependency, matchesSuggestionTarget, matchingDependencyTarget, visibleDependencies } from './dependencies';
import { protocolLabel } from './protocols';
import type { Component } from '../types';

const component = (id: string, brick?: Component['brick'], role?: string): Component => ({
  id, name: id, group: 'product', layer: 'services', brick, role, deps: [], links: []
});

test('snapshot seeds bilingual dependency suggestions', () => {
  const suggestion = buildCatalogSnapshot('fr').dependencies.find(value => value.from === 'webApp' && value.to === 'identity');
  assert.deepEqual(suggestion, {
    from: 'webApp', to: 'identity', strength: 'required',
    why_en: 'People need to sign in before using the product.',
    why_fr: 'Les gens doivent se connecter avant d’utiliser le produit.',
    protocol_id: 'oidc', kind: 'sync'
  });
});

test('visible dependencies rank required then recommended and cap at three', () => {
  const snapshot = buildCatalogSnapshot();
  snapshot.dependencies = [
    { from: 'webApp', to: 'one', strength: 'required', why_en: '', why_fr: '', protocol_id: 'rest', kind: 'sync' },
    { from: 'webApp', to: 'two', strength: 'required', why_en: '', why_fr: '', protocol_id: 'rest', kind: 'sync' },
    { from: 'webApp', to: 'three', strength: 'recommended', why_en: '', why_fr: '', protocol_id: 'rest', kind: 'sync' },
    { from: 'webApp', to: 'four', strength: 'recommended', why_en: '', why_fr: '', protocol_id: 'rest', kind: 'sync' },
    { from: 'webApp', to: 'later', strength: 'optional', why_en: '', why_fr: '', protocol_id: 'rest', kind: 'sync' }
  ];
  const visible = visibleDependencies(snapshot, component('web', 'webApp'));
  assert.equal(visible.length, 3);
  assert.deepEqual(visible.map(value => value.strength), ['required', 'required', 'recommended']);
  assert.ok(visible.every(value => value.strength !== 'optional'));
});

test('visible dependencies tolerate a snapshot missing the dependencies field', () => {
  const snapshot = buildCatalogSnapshot();
  delete (snapshot as { dependencies?: unknown }).dependencies;
  assert.deepEqual(visibleDependencies(snapshot, component('web', 'webApp')), []);
});

test('matching target uses brick before legacy role id', () => {
  assert.equal(matchingDependencyTarget([component('named-anything', undefined, 'identity')], 'identity')?.id, 'named-anything');
});

test('Link writes one explicit annotated dependency without duplicates', () => {
  const caller = component('web', 'webApp');
  const suggestion = buildCatalogSnapshot().dependencies.find(value => value.from === 'webApp' && value.to === 'identity')!;
  addSuggestedDependency(caller, 'auth', suggestion);
  addSuggestedDependency(caller, 'auth', suggestion);
  assert.deepEqual(caller.deps, ['auth']);
  assert.deepEqual(caller.links, [{ to: 'auth', protocol: 'OIDC/OAuth', kind: 'sync' }]);
});

test('Add & link accepts only a component matching the suggested target brick', () => {
  const suggestion = buildCatalogSnapshot().dependencies.find(value => value.from === 'webApp' && value.to === 'identity')!;
  assert.equal(matchesSuggestionTarget(component('auth', 'identity'), suggestion), true);
  assert.equal(matchesSuggestionTarget(component('db', 'sql'), suggestion), false);
});

test('protocol ids resolve to locked Link.protocol labels', () => {
  assert.equal(protocolLabel('oidc'), 'OIDC/OAuth');
  assert.equal(protocolLabel('rest'), 'REST/HTTPS');
  assert.equal(protocolLabel('queue'), 'Message queue');
});

test('Skip has no mutation because suggestions are read-only until accepted', () => {
  const caller = component('web', 'webApp');
  const before = structuredClone(caller);
  visibleDependencies(buildCatalogSnapshot(), caller);
  assert.deepEqual(caller, before);
});
