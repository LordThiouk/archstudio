import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { normalizeArchitecture } from '../defaults';
import { BAND_GUTTER, SHELF_GAP, withDescendants, zonePad, type Box } from '../zones';
import type { Architecture } from '../types';
import { CARD_GAP, CARD_H, CARD_W, bandWidth, columnX, clip, layoutSheet } from './layout';

/* A small landscape that exercises the four things the layout has to get right:
 * two layers, two scopes, a nested zone, and one dependency in each direction. */
const doc = (over: Partial<Architecture> = {}): Architecture => normalizeArchitecture({
  meta: { name: 'Landscape', lang: 'en' },
  layers: [{ id: 'clients', name: 'Clients' }, { id: 'services', name: 'Services' }],
  groups: [{ id: 'core', name: 'Core' }, { id: 'vendor', name: 'Third parties' }],
  zones: [
    { id: 'internal', name: 'Internal', kind: 'network' },
    { id: 'openshift', name: 'OpenShift', kind: 'platform', parent: 'internal' }
  ],
  components: [
    { id: 'web', name: 'Web', group: 'core', layer: 'clients', deps: ['api'] },
    { id: 'api', name: 'API', group: 'core', layer: 'services', zone: 'openshift' },
    { id: 'jobs', name: 'Jobs', group: 'core', layer: 'services', zone: 'openshift' },
    { id: 'psp', name: 'Payments', group: 'vendor', layer: 'services', deps: ['api'] }
  ],
  ...over
});

test('the grid arithmetic matches the stylesheet it mirrors', () => {
  const css = fs.readFileSync(
    path.join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8');

  /* Three numbers decide where every card lands, and two of them live in CSS.
   * Nothing at runtime can notice they have drifted — the export would simply
   * stop being the drawing the editor shows — so they are checked here. */
  assert.match(css, new RegExp(`--card-w:\\s*${CARD_W}px`),
    '--card-w on .canvas no longer matches CARD_W');
  assert.match(css, new RegExp(`row-gap:\\s*${SHELF_GAP}px;\\s*column-gap:\\s*${BAND_GUTTER}px`),
    '.layer-drop.banded gaps no longer match SHELF_GAP / BAND_GUTTER');
  assert.match(css, new RegExp(`\\.zrun\\s*\\{[^}]*gap:\\s*${CARD_GAP}px`),
    '.zrun gap no longer matches CARD_GAP');
});

test('a shelf gap is wide enough for the rules that sit in it', () => {
  /* The horizontal rule: a zone's inset ladder has to fit inside the gap, or its
   * rectangle reaches the card in the next band. The same has to hold vertically
   * once two zones can share a range of columns. */
  const deepest = zonePad('a', [
    { id: 'a', name: 'A' }, { id: 'b', name: 'B', parent: 'a' }, { id: 'c', name: 'C', parent: 'b' }
  ]);
  assert.ok(deepest.y <= SHELF_GAP, 'a zone rule would reach the card on the shelf above');
  assert.ok(deepest.x <= BAND_GUTTER, 'a zone rule would reach the card in the next band');
});

test('a band of n columns holds exactly n cards on a row', () => {
  /* The grid gutter is wider than the gap between two cards inside a run, so a
   * band is always a little wider than the cards it holds. It must never be wide
   * enough for one more, or a run would wrap differently from the band plan. */
  for (let span = 1; span <= 6; span++) {
    const room = bandWidth(span);
    assert.equal(Math.floor((room + CARD_GAP) / (CARD_W + CARD_GAP)), span,
      `a band of ${span} columns should hold ${span} cards`);
    assert.ok(room < (span + 1) * CARD_W + span * CARD_GAP,
      `a band of ${span} columns is wide enough for ${span + 1} cards`);
  }
});

test('columns are one card plus one gutter apart', () => {
  assert.equal(columnX(0), 0);
  assert.equal(columnX(1) - columnX(0), CARD_W + BAND_GUTTER);
  assert.equal(bandWidth(1), CARD_W);
  assert.equal(bandWidth(3), 3 * CARD_W + 2 * BAND_GUTTER);
});

test('every component is placed exactly once, at the card size', () => {
  const sheet = layoutSheet(doc());
  assert.equal(sheet.nodes.length, 4);
  assert.deepEqual(
    [...sheet.nodes.map(n => n.component.id)].sort(),
    ['api', 'jobs', 'psp', 'web']);
  sheet.nodes.forEach(n => {
    assert.equal(n.box.w, CARD_W);
    assert.equal(n.box.h, CARD_H);
  });
});

/* The same landscape with a zone shelved under its neighbour. `edge` and
 * `legacy` are siblings that both draw on `services` only, so `legacy` can share
 * `edge`'s columns one shelf down instead of costing the sheet a band — and once
 * two zones share columns, the containment guarantee has to hold on the vertical
 * axis, which is what the invariants below are really testing. */
const shelved = (): Architecture => normalizeArchitecture({
  meta: { name: 'Shelved', lang: 'en' },
  layers: [{ id: 'clients', name: 'Clients' }, { id: 'services', name: 'Services' }],
  groups: [{ id: 'core', name: 'Core' }],
  zones: [
    { id: 'edge', name: 'Edge', kind: 'network' },
    { id: 'legacy', name: 'Legacy', kind: 'platform', stack: true }
  ],
  components: [
    { id: 'web', name: 'Web', group: 'core', layer: 'clients', deps: ['gw'] },
    { id: 'gw', name: 'Gateway', group: 'core', layer: 'services', zone: 'edge' },
    { id: 'gw2', name: 'Gateway 2', group: 'core', layer: 'services', zone: 'edge' },
    { id: 'as400', name: 'AS/400', group: 'core', layer: 'services', zone: 'legacy' }
  ]
});

const holds = (box: Box, inner: Box) =>
  inner.x >= box.x && inner.x + inner.w <= box.x + box.w
  && inner.y >= box.y && inner.y + inner.h <= box.y + box.h;

[['the landscape', doc], ['a sheet with a shelved zone', shelved]].forEach(([what, make]) => {
  const build = make as () => Architecture;

  test(`no two cards overlap — ${what}`, () => {
    const boxes = layoutSheet(build()).nodes.map(n => n.box);
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        const apart = a.x + a.w <= b.x || b.x + b.w <= a.x
          || a.y + a.h <= b.y || b.y + b.h <= a.y;
        assert.ok(apart, `cards ${i} and ${j} overlap`);
      }
    }
  });

  test(`every zone rectangle holds its own members and nothing else — ${what}`, () => {
    /* The guarantee the whole mechanism exists for. Reserved columns give it on
     * the horizontal axis; shelves have to give it on the vertical one, which is
     * why every rectangle is checked against every card rather than one pair. */
    const source = build();
    const sheet = layoutSheet(source);
    assert.ok(sheet.zones.length, 'the fixture should draw at least one zone');

    sheet.zones.forEach(placed => {
      const family = withDescendants(placed.zone.id, source.zones);
      sheet.nodes.forEach(node => {
        if (!holds(placed.box, node.box)) return;
        assert.ok(node.component.zone && family.has(node.component.zone),
          `"${node.component.id}" fell inside the "${placed.zone.name}" rectangle`);
      });
    });
  });
});

test('a zone rectangle holds its own members and nothing else', () => {
  const sheet = layoutSheet(doc());
  const openshift = sheet.zones.find(z => z.zone.id === 'openshift');
  assert.ok(openshift, 'the platform zone should be drawn');

  const inside = (id: string) =>
    holds(openshift!.box, sheet.nodes.find(c => c.component.id === id)!.box);

  assert.ok(inside('api'), 'api is in the zone and should be inside its rectangle');
  assert.ok(inside('jobs'), 'jobs is in the zone and should be inside its rectangle');
  /* This is the whole reason bands are reserved: an unzoned card on the same row
   * must not fall inside a rectangle the document never drew around it. */
  assert.ok(!inside('psp'), 'an unzoned card fell inside the zone rectangle');
  assert.ok(!inside('web'), 'a card on another layer fell inside the zone rectangle');
});

test('a shelf costs the layer a row of height and gives the sheet back a band', () => {
  const stacked = layoutSheet(shelved());
  const flat = layoutSheet(normalizeArchitecture({
    ...shelved(),
    zones: shelved().zones.map(z => ({ ...z, stack: undefined }))
  }));

  assert.ok(stacked.w < flat.w, 'the shelved sheet should be narrower');
  assert.ok(stacked.h > flat.h, 'and taller, which is the trade');

  /* The shelf sits below, not beside: same columns, lower down. */
  const at = (sheet: typeof stacked, id: string) => sheet.zones.find(z => z.zone.id === id)!.box;
  const edge = at(stacked, 'edge');
  const legacy = at(stacked, 'legacy');
  assert.ok(legacy.y >= edge.y + edge.h, 'the shelved zone should clear the one above it');
  assert.ok(legacy.x >= edge.x, 'and start inside the same range of columns');
});

test('a layer that draws only its second shelf leaves no gap above it', () => {
  /* `clients` holds one unzoned card and neither zone, so its cards start at the
   * top of the layer body exactly as they would on an unshelved sheet. */
  const stacked = layoutSheet(shelved());
  const clients = stacked.layers.find(l => l.layer.id === 'clients')!;
  const web = stacked.nodes.find(n => n.component.id === 'web')!;
  assert.equal(web.box.y, clients.bodyY);
});

test('a nested zone is drawn after — and inside — its parent', () => {
  const sheet = layoutSheet(doc());
  const at = (id: string) => sheet.zones.findIndex(z => z.zone.id === id);
  assert.ok(at('internal') < at('openshift'),
    'the outer zone must be emitted first or the nested tint is buried');

  const outer = sheet.zones[at('internal')].box;
  const inner = sheet.zones[at('openshift')].box;
  assert.ok(inner.x >= outer.x && inner.y >= outer.y
    && inner.x + inner.w <= outer.x + outer.w
    && inner.y + inner.h <= outer.y + outer.h,
    'the nested rectangle should sit inside its parent');
  assert.equal(sheet.zones[at('openshift')].depth, 1);
  assert.equal(sheet.zones[at('openshift')].physical, true);
  assert.equal(sheet.zones[at('internal')].physical, false);
});

test('an edge leaves the caller and arrives at the callee, on the right edges', () => {
  const sheet = layoutSheet(doc());
  const web = sheet.nodes.find(n => n.component.id === 'web')!.box;
  const api = sheet.nodes.find(n => n.component.id === 'api')!.box;
  const edge = sheet.edges.find(e => e.from === 'web' && e.to === 'api')!;

  assert.equal(edge.x1, web.x + web.w / 2);
  assert.equal(edge.x2, api.x + api.w / 2);
  /* Clients is above Services, so the line leaves the bottom of the caller and
   * arrives at the top of the callee — the same reading as `draw()`. */
  assert.equal(edge.y1, web.y + web.h);
  assert.equal(edge.y2, api.y);
  assert.equal(edge.k1, -edge.k2, 'a cross-layer edge mirrors its control offsets');
});

test('a call that does not leave its layer arcs under the row', () => {
  const sheet = layoutSheet(doc({
    components: [
      { id: 'a', name: 'A', group: 'core', layer: 'services', deps: ['b'] },
      { id: 'b', name: 'B', group: 'core', layer: 'services' }
    ]
  }));
  const edge = sheet.edges[0];
  assert.equal(edge.k1, 30);
  assert.equal(edge.k2, 30);
});

test('a dependency on a component that is gone draws no line', () => {
  const sheet = layoutSheet({
    ...doc(),
    components: [{ id: 'web', name: 'Web', group: 'core', layer: 'clients', deps: ['ghost'] }]
  });
  assert.equal(sheet.edges.length, 0);
});

test('the transition rides on stroke and opacity, never on colour', () => {
  const sheet = layoutSheet(doc({
    components: [
      { id: 'web', name: 'Web', group: 'core', layer: 'clients', state: 'new', deps: ['api'],
        links: [{ to: 'api', kind: 'async', state: 'removed', protocol: 'Kafka' }] },
      { id: 'api', name: 'API', group: 'core', layer: 'services' }
    ],
    ui: { architecture: { protocolLabels: 'all' } }
  }));

  assert.equal(sheet.nodes.find(n => n.component.id === 'web')!.tick, 'NEW');
  const edge = sheet.edges[0];
  assert.equal(edge.dash, '6 4', 'an asynchronous call is dashed');
  assert.ok(edge.opacity < 0.45, 'a removed edge is a ghost of an ordinary one');
  assert.equal(edge.label, '- Kafka', 'the sign leads the protocol in the plate');
});

test('an empty document lays out without throwing, and has room for nothing', () => {
  const sheet = layoutSheet(normalizeArchitecture({ meta: { name: 'Empty' } }));
  assert.equal(sheet.nodes.length, 0);
  assert.equal(sheet.edges.length, 0);
  assert.equal(sheet.zones.length, 0);
  assert.ok(sheet.w > 0 && sheet.h > 0);
});

test('a document with components but no layers still draws them', () => {
  const sheet = layoutSheet({
    ...normalizeArchitecture({ meta: { name: 'Flat' } }),
    layers: [],
    groups: [{ id: 'core', name: 'Core', color: '#0099A0' }],
    components: [
      { id: 'a', name: 'A', group: 'core', layer: 'gone', deps: ['b'] },
      { id: 'b', name: 'B', group: 'core', layer: 'gone' }
    ]
  });
  assert.equal(sheet.nodes.length, 2);
  assert.equal(sheet.edges.length, 1);
});

test('the legend names only the scopes the drawing uses', () => {
  const sheet = layoutSheet(doc({
    components: [{ id: 'web', name: 'Web', group: 'core', layer: 'clients' }]
  }));
  assert.deepEqual(sheet.legend.map(g => g.id), ['core']);
});

test('turning layer tints off emits no colour at all', () => {
  assert.ok(layoutSheet(doc()).layers.every(l => l.tint));
  const off = layoutSheet(doc({ ui: { architecture: { layerTint: false } } }));
  assert.ok(off.layers.every(l => l.tint === null));
});

test('a string too wide for its box is cut rather than allowed to run over', () => {
  assert.equal(clip('Web', 200, 12, 0.53), 'Web');
  const cut = clip('An extremely long component name that will not fit', 80, 12, 0.53);
  assert.ok(cut.endsWith('…'));
  assert.ok(cut.length < 'An extremely long component name that will not fit'.length);
});
