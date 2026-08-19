import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { blankArchitecture, normalizeArchitecture } from './defaults';
import { isArrowKey, searchComponents, sheetRows, stepSelection } from './navigate';
import type { Architecture, Component } from './types';

const comp = (id: string, layer: string, over: Partial<Component> = {}): Component => ({
  id, name: id, group: 'core', layer, icon: 'box',
  tech: [], features: [], notes: [], deps: [], ...over
});

/** Three layers; `mid` is deliberately left empty in some tests. */
const build = (components: Component[], layers = ['edge', 'mid', 'data']): Architecture =>
  normalizeArchitecture({
    ...blankArchitecture('Test'),
    groups: [{ id: 'core', name: 'Core' }],
    layers: layers.map(id => ({ id, name: id })),
    components
  });

/* ---------------------------------------------------------------- the rows */

test('the sheet reads as layers top to bottom, cards left to right', () => {
  const doc = build([
    comp('web', 'edge'), comp('api', 'mid'), comp('db', 'data'), comp('mobile', 'edge')
  ]);
  assert.deepEqual(sheetRows(doc), [['web', 'mobile'], ['api'], ['db']]);
});

test('an empty layer keeps its row, so an index still means a layer', () => {
  const doc = build([comp('web', 'edge'), comp('db', 'data')]);
  assert.deepEqual(sheetRows(doc), [['web'], [], ['db']]);
});

/* -------------------------------------------------------------- the arrows */

test('left and right walk the row', () => {
  const doc = build([comp('a', 'edge'), comp('b', 'edge'), comp('c', 'edge')]);
  assert.equal(stepSelection(doc, 'b', 'ArrowRight'), 'c');
  assert.equal(stepSelection(doc, 'b', 'ArrowLeft'), 'a');
});

test('an arrow off the end of a row goes nowhere rather than wrapping', () => {
  /* Wrapping would move the eye across the whole sheet for a keystroke that
   * looks like it should move it one card. */
  const doc = build([comp('a', 'edge'), comp('b', 'edge')]);
  assert.equal(stepSelection(doc, 'b', 'ArrowRight'), null);
  assert.equal(stepSelection(doc, 'a', 'ArrowLeft'), null);
});

test('up and down cross layers and keep the column', () => {
  const doc = build([
    comp('a', 'edge'), comp('b', 'edge'), comp('c', 'edge'),
    comp('x', 'mid'), comp('y', 'mid'), comp('z', 'mid')
  ]);
  assert.equal(stepSelection(doc, 'b', 'ArrowDown'), 'y');
  assert.equal(stepSelection(doc, 'y', 'ArrowUp'), 'b');
});

test('a column past the end of the row below lands on its last card', () => {
  const doc = build([comp('a', 'edge'), comp('b', 'edge'), comp('c', 'edge'), comp('x', 'mid')]);
  assert.equal(stepSelection(doc, 'c', 'ArrowDown'), 'x');
});

test('an empty layer is stepped over, not landed on', () => {
  /* `mid` holds nothing. Stopping there would be a keystroke that appears to do
   * nothing at all, which reads as the key being broken. */
  const doc = build([comp('a', 'edge'), comp('d', 'data')]);
  assert.equal(stepSelection(doc, 'a', 'ArrowDown'), 'd');
  assert.equal(stepSelection(doc, 'd', 'ArrowUp'), 'a');
});

test('the top and bottom of the sheet are ends, not loops', () => {
  const doc = build([comp('a', 'edge'), comp('d', 'data')]);
  assert.equal(stepSelection(doc, 'a', 'ArrowUp'), null);
  assert.equal(stepSelection(doc, 'd', 'ArrowDown'), null);
});

test('a component that is not on the sheet moves nothing', () => {
  const doc = build([comp('a', 'edge')]);
  assert.equal(stepSelection(doc, 'ghost', 'ArrowRight'), null);
});

test('only the four arrows are arrows', () => {
  assert.equal(isArrowKey('ArrowUp'), true);
  assert.equal(isArrowKey('Tab'), false);
  assert.equal(isArrowKey('a'), false);
});

/* -------------------------------------------------------------- the search */

test('an empty query lists the sheet in reading order', () => {
  const doc = build([comp('web', 'edge'), comp('db', 'data'), comp('api', 'mid')]);
  assert.deepEqual(searchComponents(doc, '').map(h => h.component.id), ['web', 'api', 'db']);
});

test('a name beats a role, and a role beats a layer', () => {
  const doc = build([
    comp('gateway', 'edge', { name: 'Gateway' }),
    comp('router', 'edge', { name: 'Router', role: 'Sits behind the gateway' }),
    comp('worker', 'mid', { name: 'Worker' })
  ], ['edge', 'gateway-layer', 'data']);
  const hits = searchComponents(doc, 'gateway').map(h => h.component.id);
  assert.deepEqual(hits.slice(0, 2), ['gateway', 'router']);
});

test('an exact name wins over a name that merely starts with the query', () => {
  const doc = build([
    comp('api', 'edge', { name: 'API' }),
    comp('api-gw', 'edge', { name: 'API gateway' })
  ]);
  assert.equal(searchComponents(doc, 'api')[0].component.id, 'api');
});

test('a technology is searchable, which is most of why anyone opens this', () => {
  const doc = build([
    comp('store', 'data', { name: 'Store', tech: ['PostgreSQL'] }),
    comp('cache', 'data', { name: 'Cache', tech: ['Redis'] })
  ]);
  assert.deepEqual(searchComponents(doc, 'postgres').map(h => h.component.id), ['store']);
});

test('the search is case-insensitive and ignores the spaces around the query', () => {
  const doc = build([comp('gw', 'edge', { name: 'Gateway' })]);
  assert.equal(searchComponents(doc, '  GATE  ')[0].component.id, 'gw');
});

test('a hit carries the layer and scope names, so the list can say where it is', () => {
  /* The *names*, not the ids — normalisation gives a known layer id its proper
   * label ("edge" becomes "Edge & API"), and that label is what the row shows. */
  const doc = build([comp('gw', 'edge', { name: 'Gateway' })]);
  const hit = searchComponents(doc, 'gate')[0];
  assert.equal(hit.layerName, doc.layers.find(l => l.id === 'edge')!.name);
  assert.equal(hit.groupName, 'Core');
});

test('a component pointing at a layer that is gone falls back to the id', () => {
  /* Not hypothetical: normalisation prunes an unused layer, and a card can be
   * moved onto one that was created for it and later deleted. */
  const doc = build([comp('gw', 'edge', { name: 'Gateway' })]);
  doc.components[0].layer = 'vanished';
  assert.equal(searchComponents(doc, 'gate')[0].layerName, 'vanished');
});

test('nothing matching is an empty list, not the whole sheet', () => {
  const doc = build([comp('gw', 'edge', { name: 'Gateway' })]);
  assert.deepEqual(searchComponents(doc, 'kafka'), []);
});

test('the list is capped, so a hundred-component document does not render a hundred rows', () => {
  const many = Array.from({ length: 60 }, (_, i) => comp(`c${i}`, 'edge'));
  assert.equal(searchComponents(build(many), '', 40).length, 40);
});
