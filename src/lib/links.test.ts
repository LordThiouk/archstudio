import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { blankArchitecture, normalizeArchitecture } from './defaults';
import { diffArchitecture } from './diff';
import {
  describeLink, dashFor, edgeLabel, edgeLabelSvg, edgeMidpoint, kindsInUse, labelPlateWidth,
  linkOf, protocolConvention, protocolNote, shortLink, type ProtocolLabels
} from './links';
import type { Architecture, Component, Link } from './types';

const comp = (id: string, over: Partial<Component> = {}): Component => ({
  id, name: id, group: 'core', layer: 'services', icon: 'box',
  tech: [], features: [], notes: [], deps: [], ...over
});

const withComponents = (components: Component[]): Architecture =>
  normalizeArchitecture({ ...blankArchitecture('Test'), components });

const linksOf = (doc: Architecture, id: string) => doc.components.find(c => c.id === id)?.links;

/* --------------------------------------------------------- normalisation */

test('a link survives only when it describes a dependency that exists', () => {
  const doc = withComponents([
    comp('api', {
      deps: ['db'],
      links: [{ to: 'db', kind: 'sync', protocol: 'SQL' }, { to: 'ghost', protocol: 'REST' }]
    }),
    comp('db', { layer: 'data' })
  ]);
  assert.deepEqual(linksOf(doc, 'api'), [{ to: 'db', kind: 'sync', protocol: 'SQL' }]);
});

test('deleting the component takes the dependency and its annotation with it', () => {
  /* `db` is gone, so `deps` loses it in normalisation — and the link that
   * described that edge must not outlive the edge. */
  const doc = withComponents([
    comp('api', { deps: ['db'], links: [{ to: 'db', kind: 'async', protocol: 'Kafka' }] })
  ]);
  assert.deepEqual(doc.components[0].deps, []);
  assert.equal(linksOf(doc, 'api'), undefined);
});

test('a link describing a dependency the component no longer has is dropped', () => {
  const doc = withComponents([
    comp('api', { deps: [], links: [{ to: 'db', protocol: 'SQL' }] }),
    comp('db', { layer: 'data' })
  ]);
  assert.equal(linksOf(doc, 'api'), undefined);
});

test('an empty link is noise, not data', () => {
  const doc = withComponents([
    comp('api', { deps: ['db'], links: [{ to: 'db' }, { to: 'db', protocol: '   ' }] }),
    comp('db', { layer: 'data' })
  ]);
  assert.equal(linksOf(doc, 'api'), undefined);
});

test('one annotation per target, and whitespace is trimmed', () => {
  const doc = withComponents([
    comp('api', {
      deps: ['db'],
      links: [{ to: 'db', protocol: '  SQL  ' }, { to: 'db', protocol: 'gRPC' }]
    }),
    comp('db', { layer: 'data' })
  ]);
  assert.deepEqual(linksOf(doc, 'api'), [{ to: 'db', protocol: 'SQL' }]);
});

test('an invented kind is discarded, the rest of the link is kept', () => {
  const doc = withComponents([
    comp('api', {
      deps: ['db'],
      links: [{ to: 'db', kind: 'carrier-pigeon' as unknown as Link['kind'], protocol: 'SQL' }]
    }),
    comp('db', { layer: 'data' })
  ]);
  assert.deepEqual(linksOf(doc, 'api'), [{ to: 'db', protocol: 'SQL' }]);
});

test('a document that annotates nothing exports exactly as it did before', () => {
  /* The guarantee behind adding this field at all: `links` must not appear in
   * the JSON of a document that never used it, or every existing export would
   * differ from its own re-export. */
  const doc = withComponents([comp('api', { deps: ['db'] }), comp('db', { layer: 'data' })]);
  assert.ok(!JSON.stringify(doc).includes('links'));
});

/* -------------------------------------------------------------- helpers */

test('unset draws solid — the grammar every older document already had', () => {
  assert.equal(dashFor(undefined), '');
  assert.equal(dashFor('sync'), '');
  assert.notEqual(dashFor('async'), '');
  assert.notEqual(dashFor('batch'), dashFor('async'));
});

test('a link is described in the document language, protocol first', () => {
  const l: Link = { to: 'db', kind: 'async', protocol: 'Kafka' };
  assert.equal(describeLink(l, 'en'), 'Kafka · asynchronous');
  assert.equal(describeLink(l, 'fr'), 'Kafka · asynchrone');
  assert.equal(shortLink(l), 'Kafka · async');
  assert.equal(describeLink(undefined), null);
  assert.equal(describeLink({ to: 'db' }), null);
});

test('the legend lists only the kinds actually used, in a fixed order', () => {
  const cs = [
    comp('a', { links: [{ to: 'x', kind: 'batch' }] }),
    comp('b', { links: [{ to: 'y', kind: 'sync' }] }),
    comp('c', { links: [{ to: 'z', kind: 'batch' }] })
  ];
  assert.deepEqual(kindsInUse(cs), ['sync', 'batch']);
  assert.deepEqual(kindsInUse([comp('a')]), []);
});

test('linkOf finds the annotation for one target only', () => {
  const c = comp('api', { links: [{ to: 'db', protocol: 'SQL' }] });
  assert.equal(linkOf(c, 'db')?.protocol, 'SQL');
  assert.equal(linkOf(c, 'cache'), undefined);
});

/* ----------------------------------------------------------------- diff */

test('re-describing an edge is a change on the dependency, not a hidden field edit', () => {
  const before = withComponents([
    comp('api', { name: 'API', deps: ['db'], links: [{ to: 'db', kind: 'sync', protocol: 'REST' }] }),
    comp('db', { name: 'Postgres', layer: 'data' })
  ]);
  const after = withComponents([
    comp('api', { name: 'API', deps: ['db'], links: [{ to: 'db', kind: 'async', protocol: 'Kafka' }] }),
    comp('db', { name: 'Postgres', layer: 'data' })
  ]);
  const { changes } = diffArchitecture(before, after);

  assert.deepEqual(changes, [{
    kind: 'changed', area: 'dependency', label: 'API → Postgres',
    detail: 'REST · sync → Kafka · async'
  }]);
});

test('annotating a previously bare edge names both states', () => {
  const before = withComponents([
    comp('api', { name: 'API', deps: ['db'] }), comp('db', { name: 'Postgres', layer: 'data' })
  ]);
  const after = withComponents([
    comp('api', { name: 'API', deps: ['db'], links: [{ to: 'db', protocol: 'SQL' }] }),
    comp('db', { name: 'Postgres', layer: 'data' })
  ]);
  assert.equal(diffArchitecture(before, after).changes[0].detail, 'undescribed → SQL');
});

test('a new edge carries its description into the history', () => {
  const before = withComponents([
    comp('api', { name: 'API' }), comp('db', { name: 'Postgres', layer: 'data' })
  ]);
  const after = withComponents([
    comp('api', { name: 'API', deps: ['db'], links: [{ to: 'db', kind: 'batch', protocol: 'SQL' }] }),
    comp('db', { name: 'Postgres', layer: 'data' })
  ]);
  assert.deepEqual(diffArchitecture(before, after).changes, [
    { kind: 'added', area: 'dependency', label: 'API → Postgres', detail: 'SQL · batch' }
  ]);
});

/* ------------------------------------------------------- protocol labels */

const arch = (over: Partial<NonNullable<Architecture['ui']['architecture']>>) =>
  normalizeArchitecture({ ...blankArchitecture('Test'), ui: { architecture: over } })
    .ui.architecture;

test('no protocol convention means no labels, so an older document draws as it did', () => {
  const conv = protocolConvention(undefined);
  assert.equal(conv.mode, 'off');
  assert.equal(edgeLabel({ to: 'db', protocol: 'JDBC' }, conv), null);
  assert.equal(protocolNote(conv), null);
});

test('naming a default protocol is what turns the labels on', () => {
  const conv = protocolConvention({ defaultProtocol: 'REST' });
  assert.equal(conv.mode, 'exceptions');
  assert.equal(edgeLabel({ to: 'db', protocol: 'JDBC' }, conv), 'JDBC');
  assert.equal(protocolNote(conv), 'All calls are REST unless the line says otherwise.');
  assert.equal(protocolNote(conv, 'fr'),
    'Tous les appels sont en REST, sauf mention contraire sur la ligne.');
});

test('an edge speaking the default protocol stays silent, whatever its casing', () => {
  const conv = protocolConvention({ defaultProtocol: 'REST' });
  assert.equal(edgeLabel({ to: 'a', protocol: 'REST' }, conv), null);
  assert.equal(edgeLabel({ to: 'a', protocol: 'rest' }, conv), null);
  assert.equal(edgeLabel({ to: 'a', protocol: ' REST ' }, conv), null);
});

test('`all` labels every annotated edge, `off` keeps the note and drops the plates', () => {
  const all = protocolConvention({ defaultProtocol: 'REST', protocolLabels: 'all' });
  assert.equal(edgeLabel({ to: 'a', protocol: 'REST' }, all), 'REST');

  const off = protocolConvention({ defaultProtocol: 'REST', protocolLabels: 'off' });
  assert.equal(edgeLabel({ to: 'a', protocol: 'JDBC' }, off), null);
  assert.equal(protocolNote(off), 'All calls are REST unless the line says otherwise.');
});

test('an edge with no protocol is never labelled, and neither is a bare one', () => {
  const conv = protocolConvention({ defaultProtocol: 'REST', protocolLabels: 'all' });
  assert.equal(edgeLabel(undefined, conv), null);
  assert.equal(edgeLabel({ to: 'a' }, conv), null);
  assert.equal(edgeLabel({ to: 'a', protocol: '   ' }, conv), null);
});

test('a blank default protocol is dropped rather than printed as an empty sentence', () => {
  assert.equal(arch({ defaultProtocol: '   ' }), undefined);
  assert.deepEqual(arch({ defaultProtocol: '  REST ' }), { defaultProtocol: 'REST' });
});

test('an invented label mode is dropped, so three renderers cannot fall through', () => {
  assert.deepEqual(
    arch({ defaultProtocol: 'REST', protocolLabels: 'loud' as ProtocolLabels }),
    { defaultProtocol: 'REST' }
  );
  assert.deepEqual(
    arch({ defaultProtocol: 'REST', protocolLabels: 'all' }),
    { defaultProtocol: 'REST', protocolLabels: 'all' }
  );
});

test('setting nothing leaves `ui.architecture` absent instead of an empty object', () => {
  assert.equal(arch({}), undefined);
  assert.deepEqual(arch({ title: 'Landscape' }), { title: 'Landscape' });
});

/* --------------------------------------------------------- label geometry */

test('a cross-layer edge labels on the straight-line midpoint', () => {
  /* k2 = -k1 there, so the 3(k1+k2)/8 term vanishes by construction. */
  assert.deepEqual(edgeMidpoint(0, 0, 40, 100, 200, -40), { x: 50, y: 100 });
});

test('a within-layer edge labels on the belly of its arc, below the row', () => {
  /* Both control offsets are +30, so the label clears the row it passes under
   * rather than landing inside it. */
  const { x, y } = edgeMidpoint(0, 100, 30, 100, 100, 30);
  assert.equal(x, 50);
  assert.equal(y, 122.5);
});

test('the plate is centred on the midpoint and the text is escaped', () => {
  const svg = edgeLabelSvg(0, 0, 40, 100, 200, -40, 'A&B');
  const w = labelPlateWidth('A&B');
  assert.match(svg, new RegExp(`<rect x="${(50 - w / 2).toFixed(1)}" y="93.5" `));
  assert.match(svg, /<text x="50.0" y="103.2">A&amp;B<\/text>/);
});
