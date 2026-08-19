import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { blankArchitecture, normalizeArchitecture } from './defaults';
import {
  bandDropId, DEPTH, dropChangesAnything, layerDropId, PALETTE_NEW, parseDropId,
  railZoneDropId, resolveDrop
} from './dnd';
import type { Architecture, Component, Zone } from './types';

const comp = (id: string, layer: string, zone?: string): Component => ({
  id, name: id, group: 'core', layer, zone, icon: 'box',
  tech: [], features: [], notes: [], deps: []
});

const build = (components: Component[], zones: Zone[] = []): Architecture =>
  normalizeArchitecture({
    ...blankArchitecture('Test'),
    groups: [{ id: 'core', name: 'Core' }],
    layers: [{ id: 'edge', name: 'Edge' }, { id: 'data', name: 'Data' }],
    zones, components
  });

const ZONES: Zone[] = [{ id: 'ocp', name: 'OpenShift' }, { id: 'dmz', name: 'DMZ' }];

/* ------------------------------------------------------------------- ids */

test('a target id survives a round trip', () => {
  assert.deepEqual(parseDropId(layerDropId('edge')), { kind: 'layer', layer: 'edge' });
  assert.deepEqual(parseDropId(bandDropId('edge', 'ocp')), { kind: 'band', layer: 'edge', zone: 'ocp' });
  assert.deepEqual(parseDropId(bandDropId('edge', undefined)), { kind: 'band', layer: 'edge', zone: undefined });
  assert.deepEqual(parseDropId(railZoneDropId('ocp')), { kind: 'railzone', zone: 'ocp' });
});

test('an id containing the separator still parses', () => {
  /* Slugs never contain a colon, but an imported document brings its own ids and
   * nothing re-slugs them. JSON is what makes that a non-question. */
  const id = bandDropId('a:b:c', 'x:y');
  assert.deepEqual(parseDropId(id), { kind: 'band', layer: 'a:b:c', zone: 'x:y' });
});

test('a component id is not a target id', () => {
  assert.equal(parseDropId('api-gateway'), null);
  assert.equal(parseDropId('layer:not-json'), null);
  assert.equal(parseDropId(PALETTE_NEW), null);
});

test('the most specific target outranks the ones holding it', () => {
  assert.ok(DEPTH.component > DEPTH.band);
  assert.ok(DEPTH.band > DEPTH.layer);
});

/* -------------------------------------------------------------- onto a card */

test('dropping onto a card takes its place, its layer and its zone', () => {
  const doc = build([comp('a', 'edge'), comp('b', 'data', 'ocp')], ZONES);
  assert.deepEqual(resolveDrop(doc, 'a', 'b'),
    { componentId: 'a', layer: 'data', zone: 'ocp', before: 'b' });
});

test('a card dropped beside an unzoned card leaves the zone it was in', () => {
  /* The drawing would otherwise show a card inside a rectangle the data says it
   * is not in. */
  const doc = build([comp('a', 'edge', 'ocp'), comp('b', 'edge')], ZONES);
  assert.equal(resolveDrop(doc, 'a', 'b')?.zone, undefined);
});

test('dropping a card on itself means nothing', () => {
  const doc = build([comp('a', 'edge')]);
  assert.equal(resolveDrop(doc, 'a', 'a'), null);
});

/* -------------------------------------------------------------- onto a band */

test('dropping in a band moves into that zone and appends', () => {
  const doc = build([comp('a', 'edge')], ZONES);
  assert.deepEqual(resolveDrop(doc, 'a', bandDropId('data', 'ocp')),
    { componentId: 'a', layer: 'data', zone: 'ocp', before: undefined });
});

test('the unzoned band is how a card leaves a zone', () => {
  const doc = build([comp('a', 'edge', 'ocp')], ZONES);
  assert.equal(resolveDrop(doc, 'a', bandDropId('edge', undefined))?.zone, undefined);
});

test('a band naming a zone that has been deleted lands unzoned, not in a ghost', () => {
  const doc = build([comp('a', 'edge')], ZONES);
  assert.equal(resolveDrop(doc, 'a', bandDropId('edge', 'gone'))?.zone, undefined);
});

test('a band naming a layer that does not exist is refused outright', () => {
  const doc = build([comp('a', 'edge')], ZONES);
  assert.equal(resolveDrop(doc, 'a', bandDropId('nowhere', 'ocp')), null);
});

/* --------------------------------------------------------------- onto a row */

test('the bare row changes the layer and keeps the zone', () => {
  /* On a zoned sheet the only bare row is the gutter between two bands — too
   * ambiguous to read as "leave your zone". */
  const doc = build([comp('a', 'edge', 'ocp')], ZONES);
  assert.deepEqual(resolveDrop(doc, 'a', layerDropId('data')),
    { componentId: 'a', layer: 'data', zone: 'ocp', before: undefined });
});

/* ------------------------------------------------------------- the palette */

test('the palette creates rather than moves, and creates unzoned', () => {
  const doc = build([comp('a', 'edge')], ZONES);
  assert.deepEqual(resolveDrop(doc, PALETTE_NEW, layerDropId('data')),
    { componentId: null, layer: 'data', zone: undefined, before: undefined });
});

test('the palette dropped in a band creates inside that zone', () => {
  const doc = build([comp('a', 'edge')], ZONES);
  assert.equal(resolveDrop(doc, PALETTE_NEW, bandDropId('edge', 'dmz'))?.zone, 'dmz');
});

test('the palette dropped on a rail zone row says nothing about the layer, so nothing happens', () => {
  const doc = build([comp('a', 'edge')], ZONES);
  assert.equal(resolveDrop(doc, PALETTE_NEW, railZoneDropId('ocp')), null);
});

/* ------------------------------------------------------------ the rail rows */

test('a rail zone row changes the zone and leaves the layer alone', () => {
  /* The only way into a zone that holds nothing yet: an empty zone reserves no
   * band, so it has no target on the sheet. */
  const doc = build([comp('a', 'edge')], ZONES);
  assert.deepEqual(resolveDrop(doc, 'a', railZoneDropId('ocp')),
    { componentId: 'a', layer: 'edge', zone: 'ocp', before: undefined });
});

/* -------------------------------------------------------------- no-op drops */

test('a release that changes nothing is not a step on the undo stack', () => {
  const doc = build([comp('a', 'edge'), comp('b', 'edge')]);
  /* `b` is already last in its run; appending it again changes nothing. */
  const drop = resolveDrop(doc, 'b', layerDropId('edge'))!;
  assert.equal(dropChangesAnything(doc, drop), false);
});

test('dropping a card on the one already behind it changes nothing', () => {
  const doc = build([comp('a', 'edge'), comp('b', 'edge'), comp('c', 'edge')]);
  /* Dropping `a` in front of `b` leaves the order exactly as it was. */
  assert.equal(dropChangesAnything(doc, resolveDrop(doc, 'a', 'b')!), false);
  assert.equal(dropChangesAnything(doc, resolveDrop(doc, 'a', 'c')!), true);
});

test('a change of layer or zone always counts', () => {
  const doc = build([comp('a', 'edge')], ZONES);
  assert.equal(dropChangesAnything(doc, resolveDrop(doc, 'a', layerDropId('data'))!), true);
  assert.equal(dropChangesAnything(doc, resolveDrop(doc, 'a', bandDropId('edge', 'ocp'))!), true);
});

test('appending a card that is not already last counts', () => {
  const doc = build([comp('a', 'edge'), comp('b', 'edge')]);
  assert.equal(dropChangesAnything(doc, resolveDrop(doc, 'a', layerDropId('edge'))!), true);
});

test('a creation always counts, even onto the row it would already be in', () => {
  const doc = build([comp('a', 'edge')]);
  assert.equal(
    dropChangesAnything(doc, resolveDrop(doc, PALETTE_NEW, layerDropId('edge'))!), true);
});
