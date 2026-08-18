import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { blankArchitecture, normalizeArchitecture } from './defaults';
import { diffArchitecture } from './diff';
import {
  ancestry, BAND_GUTTER, BAND_MAX, bandPlan, describeZone, inflatedUnion, isZoneKind, layerRuns, subtreeHeight,
  withDescendants, zonesInTreeOrder,
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

test('an outer rule is inset further than its children on both axes', () => {
  /* That inset is the only thing telling a reader one neutral rectangle is
   * inside another, so the ordering matters more than the numbers. */
  const [outer, mid, inner] = ['internal', 'ocp', 'gw'].map(id => zonePad(id, NESTED));
  assert.ok(outer.x > mid.x && mid.x > inner.x, 'horizontal ladder is not strictly increasing');
  assert.ok(outer.y > mid.y && mid.y > inner.y, 'vertical ladder is not strictly increasing');
});

test('the whole horizontal ladder fits inside the gutter between two bands', () => {
  /* Anything wider reaches past the gutter and draws over the card in the next
   * band, which is precisely the false claim bands exist to prevent. */
  ['internal', 'ocp', 'gw'].forEach(id => {
    const pad = zonePad(id, NESTED);
    assert.ok(pad.x < BAND_GUTTER, `${id} insets ${pad.x}px, gutter is ${BAND_GUTTER}px`);
  });
});

test('the top inset clears the label sitting on the box edge', () => {
  /* `zoneSvg` puts the label baseline 11px below the top edge, so a smaller
   * inset would print the name across the first card. */
  assert.ok(zonePad('gw', NESTED).y >= 12);
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
  assert.deepEqual(inflatedUnion(boxes, { x: 10, y: 10 }), { x: 90, y: 40, w: 420, h: 230 });
});

test('one box is its own union, and the two axes inflate independently', () => {
  assert.deepEqual(inflatedUnion([{ x: 10, y: 10, w: 50, h: 20 }], { x: 5, y: 5 }),
    { x: 5, y: 5, w: 60, h: 30 });
  /* Asymmetric on purpose: horizontally the inset has to stay inside the gutter,
   * vertically it has to clear the label. */
  assert.deepEqual(inflatedUnion([{ x: 100, y: 100, w: 50, h: 20 }], { x: 7, y: 14 }),
    { x: 93, y: 86, w: 64, h: 48 });
});

test('nothing measured means no rectangle, not a rectangle at the origin', () => {
  /* Which is what happens when a scope filter empties every one of a zone's
   * runs: the box has to leave the sheet rather than collapse into the corner. */
  assert.equal(inflatedUnion([], { x: 7, y: 14 }), null);
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

/* ---------------------------------------------------------- the bands */

const LAYERS = [
  { id: 'clients', name: 'Client channels' },
  { id: 'services', name: 'Services & APIs' },
  { id: 'data', name: 'Data & storage' }
];

/** The exact shape from the screenshot that sent this back for a second pass:
 *  OpenShift holds Next.js on the top row and Aurora on the bottom one, and
 *  Flutter and the Anthropic API are unzoned on the rows between. */
const LANDSCAPE = [
  comp('flutter', { layer: 'clients' }),
  comp('next', { layer: 'clients', zone: 'ocp' }),
  comp('anthropic', { layer: 'services' }),
  comp('aurora', { layer: 'data', zone: 'ocp' })
];

test('with no zones every card is in the one unzoned bucket', () => {
  /* The renderers do not build a plan at all then — they check `zones.length`
   * first and keep the plain flex row, so no existing sheet gains a grid. */
  assert.deepEqual(bandPlan(LANDSCAPE, [], LAYERS).bands.map(b => b.zone), [undefined]);
});

test('the unzoned band comes first, so no unzoned card sits between two zones', () => {
  const plan = bandPlan(LANDSCAPE, NESTED, LAYERS);
  assert.equal(plan.bands[0].zone, undefined);
  assert.equal(plan.bands[0].start, 1);
});

test('bands do not overlap, and they tile the sheet without a gap', () => {
  /* This is the guarantee the whole mechanism exists for: a card is placed in
   * its own bucket's columns and nowhere else, so a zone's rectangle cannot
   * contain a card that is not its member. */
  const plan = bandPlan(LANDSCAPE, NESTED, LAYERS);
  let expected = 1;
  for (const b of plan.bands) {
    assert.equal(b.start, expected, `band ${b.zone} starts at ${b.start}, expected ${expected}`);
    assert.ok(b.span >= 1);
    expected += b.span;
  }
  assert.equal(plan.total, expected - 1);
});

test('the screenshot case: OpenShift owns a band the unzoned cards cannot enter', () => {
  const plan = bandPlan(LANDSCAPE, NESTED, LAYERS);
  const bare = plan.band(undefined)!;
  const ocp = plan.band('ocp')!;
  /* One unzoned card per layer at most, and one OpenShift card per layer. */
  assert.deepEqual(bare, { zone: undefined, start: 1, span: 1 });
  assert.deepEqual(ocp, { zone: 'ocp', start: 2, span: 1 });
  /* Disjoint: Flutter and the Anthropic API are in column 1 on every row, and
   * OpenShift's rectangle covers column 2 only. */
  assert.ok(bare.start + bare.span <= ocp.start);
});

test('a band is as wide as the busiest layer of its bucket', () => {
  const items = [
    comp('a', { layer: 'clients', zone: 'ocp' }),
    comp('b', { layer: 'clients', zone: 'ocp' }),
    comp('c', { layer: 'clients', zone: 'ocp' }),
    comp('d', { layer: 'data', zone: 'ocp' })
  ];
  /* Three on `clients`, one on `data` — sizing to `data` would wrap `clients`
   * inside a band built for a quieter row. */
  assert.equal(bandPlan(items, NESTED, LAYERS).band('ocp')!.span, 3);
});

test('a bucket wider than BAND_MAX is capped and wraps inside its own band', () => {
  const many = Array.from({ length: 11 }, (_, i) => comp(`c${i}`, { layer: 'clients', zone: 'ocp' }));
  assert.equal(bandPlan(many, NESTED, LAYERS).band('ocp')!.span, BAND_MAX);
});

test('a zone with no direct members gets no band, only its descendants do', () => {
  /* Its rectangle is the union of theirs, which the measure pass already
   * computes — a band nothing can be placed in would only widen the sheet. */
  const plan = bandPlan([comp('api', { layer: 'services', zone: 'gw' })], NESTED, LAYERS);
  assert.deepEqual(plan.bands.map(b => b.zone), ['gw']);
  assert.equal(plan.band('internal'), undefined);
  assert.equal(plan.band('ocp'), undefined);
});

test('a subtree gets contiguous bands, so a parent box is one range of columns', () => {
  /* Declared innermost-first on purpose: tree order, not array order, is what
   * has to decide, or `internal` ends up with a hole in the middle of its box. */
  const zones: Zone[] = [
    { id: 'gw', name: 'Gateway', parent: 'ocp' },
    { id: 'ocp', name: 'OpenShift', parent: 'internal' },
    { id: 'internal', name: 'Internal' }
  ];
  const items = [
    comp('bare', { layer: 'clients' }),
    comp('inZone', { layer: 'clients', zone: 'internal' }),
    comp('inOcp', { layer: 'services', zone: 'ocp' }),
    comp('inGw', { layer: 'clients', zone: 'gw' })
  ];
  const plan = bandPlan(items, zones, LAYERS);
  assert.deepEqual(plan.bands.map(b => b.zone), [undefined, 'internal', 'ocp', 'gw']);
  /* `internal` covers itself and both descendants — columns 2 through 4, with
   * nothing foreign in between. */
  const cols = ['internal', 'ocp', 'gw'].map(id => plan.band(id)!);
  assert.deepEqual(cols.map(b => b.start), [2, 3, 4]);
});

test('zonesInTreeOrder puts a parent before its children whatever the array says', () => {
  const zones: Zone[] = [
    { id: 'gw', name: 'Gateway', parent: 'ocp' },
    { id: 'ocp', name: 'OpenShift', parent: 'internal' },
    { id: 'internal', name: 'Internal' }
  ];
  assert.deepEqual(zonesInTreeOrder(zones).map(z => z.id), ['internal', 'ocp', 'gw']);
});

test('a document with no layers still gets one band per bucket', () => {
  /* `bandPlan` treats the whole component list as one row then — a blank
   * document being authored has components before it has layers. */
  const plan = bandPlan([comp('a', { zone: 'ocp' }), comp('b')], NESTED, []);
  assert.deepEqual(plan.bands.map(b => b.zone), [undefined, 'ocp']);
  assert.equal(plan.total, 2);
});
