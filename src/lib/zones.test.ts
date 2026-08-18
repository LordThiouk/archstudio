import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { blankArchitecture, normalizeArchitecture } from './defaults';
import { diffArchitecture } from './diff';
import {
  ancestry, describeZone, inflatedUnion, isZoneKind, layerRuns, subtreeHeight, withDescendants,
  zoneDepth, zoneIndex, zonePad, zoneSortKey, zoneSvg, zonesInUse, type Box, type ZoneKind
} from './zones';
import type { Architecture, Component, Zone } from './types';

const comp = (id: string, over: Partial<Component> = {}): Component => ({
  id, name: id, group: 'core', layer: 'services', icon: 'box',
  tech: [], features: [], notes: [], deps: [], ...over
});

const build = (zones: Zone[], components: Component[] = []): Architecture =>
  normalizeArchitecture({ ...blankArchitecture('Test'), zones, components });

const found = (doc: Architecture, id: string) => doc.components.find(c => c.id === id)!;

/* Internal ▸ OpenShift ▸ Gateway, three levels, used by most tests below. */
const NESTED: Zone[] = [
  { id: 'internal', name: 'Internal', kind: 'network' },
  { id: 'ocp', name: 'OpenShift', kind: 'platform', parent: 'internal' },
  { id: 'gw', name: 'Gateway', kind: 'gateway', parent: 'ocp' }
];

/* ---------------------------------------------------------- normalisation */

test('a document with no zones keeps the key empty and draws as it always did', () => {
  const doc = normalizeArchitecture(blankArchitecture('Test'));
  assert.deepEqual(doc.zones, []);
  assert.deepEqual(zonesInUse(doc.zones, doc.components), []);
});

test('a zone with no name falls back to its id rather than rendering blank', () => {
  assert.deepEqual(build([{ id: 'ocp', name: '   ' }]).zones, [{ id: 'ocp', name: 'ocp' }]);
});

test('an invented kind is dropped, so the renderers cannot fall through', () => {
  const doc = build([{ id: 'z', name: 'Z', kind: 'datacentre' as ZoneKind }]);
  assert.deepEqual(doc.zones, [{ id: 'z', name: 'Z' }]);
  assert.equal(isZoneKind('platform'), true);
  assert.equal(isZoneKind('datacentre'), false);
});

test('a duplicate zone id is kept once', () => {
  const doc = build([{ id: 'z', name: 'First' }, { id: 'z', name: 'Second' }]);
  assert.deepEqual(doc.zones.map(z => z.name), ['First']);
});

test('a parent pointing at nothing is cut, and the zone becomes a root', () => {
  const doc = build([{ id: 'ocp', name: 'OpenShift', parent: 'ghost' }]);
  assert.equal(doc.zones[0].parent, undefined);
});

test('a parent declared after its child still resolves', () => {
  /* Order in the array must not be meaningful — dropping a forward reference
   * would make it so. */
  const doc = build([
    { id: 'gw', name: 'Gateway', parent: 'internal' },
    { id: 'internal', name: 'Internal' }
  ]);
  assert.equal(doc.zones.find(z => z.id === 'gw')!.parent, 'internal');
});

test('a zone cannot be its own parent', () => {
  assert.equal(build([{ id: 'z', name: 'Z', parent: 'z' }]).zones[0].parent, undefined);
});

test('a two-zone cycle is broken rather than stored', () => {
  /* Every surface walks a zone's ancestry to decide what its rectangle holds,
   * so a cycle is a hang in three renderers, not a wrong drawing. */
  const doc = build([
    { id: 'a', name: 'A', parent: 'b' },
    { id: 'b', name: 'B', parent: 'a' }
  ]);
  const parents = doc.zones.map(z => z.parent);
  assert.ok(parents.filter(Boolean).length <= 1, `cycle survived: ${JSON.stringify(parents)}`);
  /* And whichever survived, walking it terminates. */
  doc.zones.forEach(z => assert.ok(ancestry(z.id, zoneIndex(doc.zones)).length <= 2));
});

test('a three-zone cycle is broken too', () => {
  const doc = build([
    { id: 'a', name: 'A', parent: 'c' },
    { id: 'b', name: 'B', parent: 'a' },
    { id: 'c', name: 'C', parent: 'b' }
  ]);
  doc.zones.forEach(z => assert.ok(ancestry(z.id, zoneIndex(doc.zones)).length <= 3));
});

test('a component pointing at a zone that is gone becomes unzoned, not relocated', () => {
  /* Unlike a scope or a layer, where the component has to be *somewhere*. */
  const doc = build([{ id: 'ocp', name: 'OpenShift' }], [comp('api', { zone: 'ghost' })]);
  assert.equal(found(doc, 'api').zone, undefined);
  assert.equal(found(build(NESTED, [comp('api', { zone: 'gw' })]), 'api').zone, 'gw');
});

/* ------------------------------------------------------------- the tree */

test('ancestry is root-first with the zone itself last', () => {
  const by = zoneIndex(NESTED);
  assert.deepEqual(ancestry('gw', by), ['internal', 'ocp', 'gw']);
  assert.deepEqual(ancestry('internal', by), ['internal']);
  assert.deepEqual(ancestry(undefined, by), []);
  assert.deepEqual(ancestry('ghost', by), []);
});

test('a zone holds itself and everything under it', () => {
  assert.deepEqual([...withDescendants('internal', NESTED)].sort(), ['gw', 'internal', 'ocp']);
  assert.deepEqual([...withDescendants('gw', NESTED)], ['gw']);
});

test('depth and subtree height read the nesting from both ends', () => {
  assert.equal(zoneDepth('internal', NESTED), 0);
  assert.equal(zoneDepth('gw', NESTED), 2);
  assert.equal(subtreeHeight('internal', NESTED), 2);
  assert.equal(subtreeHeight('gw', NESTED), 0);
});

test('an outer rule is inset further than its children, so the two never coincide', () => {
  /* That inset is the only thing telling a reader one neutral rectangle is
   * inside another, so the ordering matters more than the numbers. */
  assert.ok(zonePad('internal', NESTED) > zonePad('ocp', NESTED));
  assert.ok(zonePad('ocp', NESTED) > zonePad('gw', NESTED));
});

/* --------------------------------------------------------------- in use */

test('only zones holding something are drawn, and a parent counts its descendants', () => {
  /* Nothing sits in `internal` or `ocp` directly — but a box around the gateway
   * has to be a box inside them, or the nesting is not drawn at all. */
  const doc = build(NESTED, [comp('api', { zone: 'gw' })]);
  assert.deepEqual(zonesInUse(doc.zones, doc.components).map(z => z.id),
    ['internal', 'ocp', 'gw']);
  assert.deepEqual(zonesInUse(doc.zones, [comp('api')]), []);
});

test('zones are drawn outermost first, so a nested tint paints over its parent', () => {
  const doc = build(
    [NESTED[2], NESTED[1], NESTED[0]],       // declared innermost first
    [comp('api', { zone: 'gw' })]
  );
  assert.deepEqual(zonesInUse(doc.zones, doc.components).map(z => z.id),
    ['internal', 'ocp', 'gw']);
});

/* ------------------------------------------------------------- ordering */

test('unzoned components sort first, and a subtree sorts together', () => {
  const key = (c: Component) => zoneSortKey(c, NESTED);
  const bare = key(comp('a'));
  assert.equal(bare, '');
  assert.ok(bare < key(comp('b', { zone: 'internal' })));
  /* A child's key extends its parent's, which is what puts a nested zone's
   * members next to the rest of the subtree rather than at the far end. */
  assert.ok(key(comp('c', { zone: 'gw' })).startsWith(key(comp('b', { zone: 'internal' }))));
});

test('runs are one per zone, unzoned first, then declaration order', () => {
  const items = [
    comp('gw1', { zone: 'gw' }), comp('bare1'), comp('ocp1', { zone: 'ocp' }),
    comp('bare2'), comp('gw2', { zone: 'gw' })
  ];
  const runs = layerRuns(items, NESTED);
  assert.deepEqual(runs.map(r => r.zone), [undefined, 'ocp', 'gw']);
  /* Contiguity is the point: both gateway cards land in one run even though the
   * source interleaved them with everything else. */
  assert.deepEqual(runs[0].items.map(c => c.id), ['bare1', 'bare2']);
  assert.deepEqual(runs[2].items.map(c => c.id), ['gw1', 'gw2']);
});

test('a run keeps the author\'s order inside it', () => {
  const runs = layerRuns([comp('b', { zone: 'gw' }), comp('a', { zone: 'gw' })], NESTED);
  assert.deepEqual(runs[0].items.map(c => c.id), ['b', 'a']);
});

test('a component pointing at an unknown zone runs with the unzoned ones', () => {
  /* The same reading normalisation gives it, so a renderer handed unnormalised
   * data cannot disagree with one handed clean data. */
  const runs = layerRuns([comp('a', { zone: 'ghost' }), comp('b')], NESTED);
  assert.deepEqual(runs.map(r => r.zone), [undefined]);
  assert.deepEqual(runs[0].items.map(c => c.id), ['a', 'b']);
});

test('with no zones at all there is exactly one run, in source order', () => {
  const runs = layerRuns([comp('a'), comp('b')], []);
  assert.deepEqual(runs.map(r => r.zone), [undefined]);
  assert.deepEqual(runs[0].items.map(c => c.id), ['a', 'b']);
});

/* ------------------------------------------------------------- geometry */

test('the union of two boxes is inflated on all four sides', () => {
  const boxes: Box[] = [{ x: 100, y: 50, w: 200, h: 80 }, { x: 400, y: 200, w: 100, h: 60 }];
  assert.deepEqual(inflatedUnion(boxes, 10), { x: 90, y: 40, w: 420, h: 230 });
});

test('one box is its own union', () => {
  assert.deepEqual(inflatedUnion([{ x: 10, y: 10, w: 50, h: 20 }], 5),
    { x: 5, y: 5, w: 60, h: 30 });
});

test('nothing measured means no rectangle, not a rectangle at the origin', () => {
  /* Which is what happens when a scope filter empties every one of a zone's
   * runs: the box has to leave the sheet rather than collapse into the corner. */
  assert.equal(inflatedUnion([], 12), null);
});

test('the kind picks the stroke treatment, and nothing picks a colour', () => {
  const box: Box = { x: 0, y: 0, w: 100, h: 50 };
  const solid = zoneSvg({ id: 'ocp', name: 'OpenShift', kind: 'platform' }, box, 0, 'OpenShift');
  const dashed = zoneSvg({ id: 'dmz', name: 'DMZ', kind: 'network' }, box, 1, 'DMZ');
  assert.match(solid, /class="zone zone-solid"/);
  assert.match(dashed, /class="zone zone-dashed"/);
  assert.match(dashed, /data-depth="1"/);
  /* Geometry only — fill, stroke and dash live in the three stylesheets. */
  assert.doesNotMatch(solid, /fill=|stroke=/);
});

test('an untyped zone is drawn dashed, and its label is escaped', () => {
  const svg = zoneSvg({ id: 'z', name: 'A & B' }, { x: 0, y: 0, w: 10, h: 10 }, 0, 'A & B');
  assert.match(svg, /class="zone zone-dashed"/);
  assert.match(svg, /A &amp; B<\/text>/);
});

test('the label names the kind when there is one', () => {
  assert.equal(describeZone({ id: 'ocp', name: 'OpenShift', kind: 'platform' }), 'OpenShift — platform');
  assert.equal(describeZone({ id: 'ocp', name: 'OpenShift', kind: 'platform' }, 'fr'), 'OpenShift — plateforme');
  assert.equal(describeZone({ id: 'z', name: 'Z' }), 'Z');
});

/* -------------------------------------------------------------- history */

test('moving a component between zones is named with both sides\' vocabulary', () => {
  const before = build(NESTED, [comp('api', { name: 'API', zone: 'ocp' })]);
  const after = build(NESTED, [comp('api', { name: 'API', zone: 'gw' })]);
  assert.deepEqual(diffArchitecture(before, after).changes, [
    { kind: 'changed', area: 'component', label: 'API', detail: 'zone: OpenShift → Gateway' }
  ]);
});

test('leaving a zone reads as a move to "no zone", not as a blank', () => {
  const before = build(NESTED, [comp('api', { name: 'API', zone: 'ocp' })]);
  const after = build(NESTED, [comp('api', { name: 'API' })]);
  assert.equal(diffArchitecture(before, after).changes[0].detail, 'zone: OpenShift → no zone');
});

test('a zone\'s own edits land under Zones, and re-nesting says where', () => {
  const before = build([{ id: 'gw', name: 'Gateway', kind: 'gateway' }, NESTED[1], NESTED[0]]);
  const after = build([{ id: 'gw', name: 'Gateway', kind: 'gateway', parent: 'ocp' }, NESTED[1], NESTED[0]]);
  assert.deepEqual(diffArchitecture(before, after).changes, [
    { kind: 'changed', area: 'zone', label: 'Gateway', detail: 'inside: nothing → OpenShift' }
  ]);
});

test('adding and removing a zone is reported, once each', () => {
  const before = build([]);
  const after = build([{ id: 'ocp', name: 'OpenShift' }]);
  assert.deepEqual(diffArchitecture(before, after).changes, [
    { kind: 'added', area: 'zone', label: 'OpenShift' }
  ]);
  assert.deepEqual(diffArchitecture(after, before).changes, [
    { kind: 'removed', area: 'zone', label: 'OpenShift' }
  ]);
});
