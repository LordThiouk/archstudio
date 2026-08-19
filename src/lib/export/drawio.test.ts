import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { normalizeArchitecture } from '../defaults';
import { LINK_DASH } from '../links';
import type { Architecture } from '../types';
import { buildDrawioXml } from './drawio';

const doc = (over: Partial<Architecture> = {}): Architecture => normalizeArchitecture({
  meta: { name: 'Landscape', lang: 'en' },
  layers: [{ id: 'clients', name: 'Clients' }, { id: 'services', name: 'Services' }],
  groups: [{ id: 'core', name: 'Core', color: '#0099A0' }],
  zones: [{ id: 'openshift', name: 'OpenShift', kind: 'platform' }],
  components: [
    { id: 'web', name: 'Web', group: 'core', layer: 'clients', role: 'React SPA', deps: ['api'] },
    { id: 'api', name: 'API', group: 'core', layer: 'services', zone: 'openshift', tech: ['Java'] }
  ],
  ...over
});

/* A hand-rolled walk over the tags, which is all these assertions need and is
 * one fewer dependency than an XML parser. It also fails loudly on the one
 * mistake that matters — an unbalanced or unescaped document — because the
 * regexes below stop matching the moment the shape is wrong. */
const cells = (xml: string): string[] => xml.match(/<(mxCell|object)\b[^>]*>/g) || [];

test('the file is a well-formed mxfile with one diagram and a root', () => {
  const xml = buildDrawioXml(doc());
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?><mxfile '));
  assert.ok(xml.includes('<diagram id="architecture" name="Landscape">'));
  assert.ok(xml.includes('<mxGraphModel '));
  assert.ok(xml.includes('<root><mxCell id="0"/><mxCell id="1" parent="0"/>'));
  assert.ok(xml.endsWith('</mxGraphModel></diagram></mxfile>'));
});

test('every tag opened is closed, and every attribute quote is balanced', () => {
  const xml = buildDrawioXml(doc());
  const opens = (xml.match(/<(?!\/|\?)[a-zA-Z]/g) || []).length;
  const closes = (xml.match(/<\//g) || []).length + (xml.match(/\/>/g) || []).length;
  assert.equal(opens, closes, 'an unbalanced tag would be a file draw.io refuses to open');
  assert.equal((xml.match(/"/g) || []).length % 2, 0);
});

test('every component is a cell, and every edge points at two of them', () => {
  const xml = buildDrawioXml(doc());
  assert.ok(xml.includes('<object id="n-web"'));
  assert.ok(xml.includes('<object id="n-api"'));
  assert.ok(xml.includes('source="n-web" target="n-api"'),
    'the edge should reference its endpoints by id so draw.io reroutes them');
  assert.ok(xml.includes('<mxGeometry relative="1" as="geometry"/>'));
});

test('the edge grammar survives the trip: a filled disc, an open circle, no arrowhead', () => {
  const xml = buildDrawioXml(doc());
  assert.ok(xml.includes('startArrow=oval;startFill=1'));
  assert.ok(xml.includes('endArrow=oval;endFill=0'));
  assert.ok(!/endArrow=(block|classic|open)/.test(xml), 'no arrowhead belongs on these lines');
});

test('a link kind crosses as the dash pattern it is drawn with here', () => {
  const xml = buildDrawioXml(doc({
    components: [
      { id: 'web', name: 'Web', group: 'core', layer: 'clients', deps: ['api'],
        links: [{ to: 'api', kind: 'async' }] },
      { id: 'api', name: 'API', group: 'core', layer: 'services' }
    ]
  }));
  assert.ok(xml.includes(`dashPattern=${LINK_DASH.async};`),
    'the dash table in lib/links.ts is the single source and this export reads it');
});

test('a scope colour rides in the card label rather than on its border', () => {
  const xml = buildDrawioXml(doc());
  assert.ok(xml.includes('&lt;font color=&quot;#0099A0&quot;&gt;'),
    'the scope square carries the colour, inside the value');

  /* Rule 1 is about the card. An edge *is* drawn in its caller's scope colour —
   * that is the reading the canvas and the printed sheet both give it — so the
   * assertion has to be about the component cells and not about the file. */
  const card = xml.match(/<object id="n-web"[\s\S]*?<\/object>/)![0];
  assert.ok(!card.includes('strokeColor=#0099A0'), 'a scope colour never touches a border');
  assert.ok(card.includes('strokeColor=#D3DEE5'), 'the border is the neutral card edge');
});

test('a platform zone is solid and a logical one is dashed', () => {
  const solid = buildDrawioXml(doc());
  assert.match(solid, /fillColor=#F8F8F9;[^"]*dashed=0;/);

  const dashed = buildDrawioXml(doc({
    zones: [{ id: 'dmz', name: 'DMZ', kind: 'network' }],
    components: [{ id: 'api', name: 'API', group: 'core', layer: 'services', zone: 'dmz' }]
  }));
  assert.match(dashed, /fillColor=#F8F8F9;[^"]*dashed=1;dashPattern=5 4;/);
});

test('what the picture cannot carry travels as cell data', () => {
  const xml = buildDrawioXml(doc({
    components: [{
      id: 'api', name: 'API', group: 'core', layer: 'services', zone: 'openshift',
      tech: ['Java', 'Spring'], marks: ['sso', 'pii'], state: 'changed', url: 'https://x.test'
    }]
  }));
  assert.ok(xml.includes('archId="api"'));
  assert.ok(xml.includes('scope="Core"'));
  assert.ok(xml.includes('layer="Services"'));
  assert.ok(xml.includes('zone="OpenShift"'));
  assert.ok(xml.includes('tech="Java, Spring"'));
  assert.ok(xml.includes('security="SSO protected, holds personal data"'));
  assert.ok(xml.includes('state="updated"'));
  assert.ok(xml.includes('link="https://x.test"'));
});

/* The bug this file exists to prevent. A cell's value is HTML inside an XML
 * attribute, so authored text is escaped twice; getting either half wrong is
 * either a card reading "R&amp;D" or a file draw.io will not open at all. */
test('an ampersand in a name survives both parsers', () => {
  const xml = buildDrawioXml(doc({
    groups: [{ id: 'core', name: 'R&D <ops>', color: '#0099A0' }],
    components: [{ id: 'web', name: 'Search & Rescue', group: 'core', layer: 'clients' }]
  }));
  assert.ok(xml.includes('Search &amp;amp; Rescue'),
    'the HTML parser has to see &amp; so the reader sees &');
  assert.ok(!/&(?!amp;|lt;|gt;|quot;|#)/.test(xml),
    'a bare ampersand anywhere is a file that will not parse');
  assert.ok(xml.includes('R&amp;amp;D &amp;lt;ops&amp;gt;'),
    'angle brackets in a legend label must not become markup');
  /* Cell *data* is plain text rather than HTML, so it is escaped once — the
   * asymmetry is deliberate and this is where it would silently drift. */
  assert.ok(xml.includes('scope="R&amp;D &lt;ops&gt;"'));
});

test('a quote in a name cannot break out of an attribute', () => {
  const xml = buildDrawioXml(doc({
    components: [{ id: 'web', name: 'The "Web" app', group: 'core', layer: 'clients' }]
  }));
  assert.ok(xml.includes('&quot;Web&quot;'));
  assert.equal((xml.match(/"/g) || []).length % 2, 0);
});

test('an id that is not a slug cannot break a cell reference', () => {
  const xml = buildDrawioXml({
    ...doc(),
    zones: [],
    components: [
      { id: 'a b"c', name: 'A', group: 'core', layer: 'clients', deps: ['d/e'] },
      { id: 'd/e', name: 'D', group: 'core', layer: 'services' }
    ]
  });
  assert.ok(xml.includes('<object id="n-a_b_c"'));
  assert.ok(xml.includes('source="n-a_b_c" target="n-d_e"'));
});

test('zones come before the cards they sit behind, and cards before their lines', () => {
  const xml = buildDrawioXml(doc());
  const order = cells(xml).map(c =>
    /id="z-/.test(c) ? 'zone' : /id="n-/.test(c) ? 'node' : /id="e-/.test(c) ? 'edge' : 'other');
  assert.ok(order.indexOf('zone') < order.indexOf('node'), 'a zone is the ground, not the figure');
  assert.ok(order.indexOf('node') < order.indexOf('edge'));
});

test('an empty document still produces a file draw.io can open', () => {
  const xml = buildDrawioXml(normalizeArchitecture({ meta: { name: 'Empty' } }));
  assert.ok(xml.includes('<root><mxCell id="0"/><mxCell id="1" parent="0"/>'));
  assert.ok(xml.endsWith('</mxfile>'));
});
