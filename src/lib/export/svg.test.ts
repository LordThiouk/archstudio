import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { normalizeArchitecture } from '../defaults';
import type { Architecture } from '../types';
import { ICONS } from '../icons';
import { buildDiagramSvg } from './svg';

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

test('the file is a standalone SVG with its own size', () => {
  const svg = buildDiagramSvg(doc());
  assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" '));
  assert.match(svg, /width="\d+(\.\d)?" height="\d+(\.\d)?" viewBox="0 0 /);
  assert.ok(svg.endsWith('</svg>'));
});

test('every tag opened is closed', () => {
  const svg = buildDiagramSvg(doc());
  const opens = (svg.match(/<(?!\/)[a-zA-Z]/g) || []).length;
  const closes = (svg.match(/<\//g) || []).length + (svg.match(/\/>/g) || []).length;
  assert.equal(opens, closes);
});

/* The constraint the whole module is shaped by: this SVG is rasterised inside an
 * `<img>`, where an external request is not slow, it is blocked. */
test('nothing in the drawing reaches outside the file', () => {
  const svg = buildDiagramSvg(doc());
  assert.ok(!/xlink:href|<image|url\(http|src=/.test(svg));
  assert.ok(!svg.includes('foreignObject'), 'an <img> will not render one');
  assert.ok(!svg.includes('var(--'), 'a custom property has no stylesheet on the other side');
});

test('the typefaces travel with it when the caller supplies them', () => {
  const plain = buildDiagramSvg(doc());
  assert.ok(!plain.includes('@font-face'));
  const carried = buildDiagramSvg(doc(), { fontCss: "@font-face{font-family:'Archivo'}" });
  assert.ok(carried.includes('@font-face'));
});

test('every component appears once, with its role and its technologies', () => {
  const svg = buildDiagramSvg(doc());
  assert.equal((svg.match(/>Web</g) || []).length, 1);
  assert.ok(svg.includes('>React SPA<'));
  assert.ok(svg.includes('>Java<'));
});

test('an edge carries the two shapes that say which way it runs', () => {
  const svg = buildDiagramSvg(doc());
  const path = svg.match(/<path d="M[^"]+C[^"]+" fill="none" stroke="#0099A0"/);
  assert.ok(path, 'the cubic should be drawn in the caller scope colour');
  assert.match(svg, /<circle cx="[\d.]+" cy="[\d.]+" r="3.5" fill="#0099A0"\/>/);
  assert.match(svg, /<circle cx="[\d.]+" cy="[\d.]+" r="3" fill="#FFFFFF" stroke="#0099A0"/);
  assert.ok(!svg.includes('marker-end'), 'no arrowhead belongs on these lines');
});

test('a zone is drawn behind the cards, solid when you could point at it', () => {
  const svg = buildDiagramSvg(doc());
  const zoneAt = svg.indexOf('fill="#F8F8F9"');
  const cardAt = svg.indexOf('fill="#0099A0"');
  assert.ok(zoneAt > 0 && zoneAt < cardAt, 'the zone is the ground, not the figure');
  assert.ok(svg.includes('>OPENSHIFT — PLATFORM<'));
  assert.ok(!/fill="#F8F8F9"[^/]*stroke-dasharray/.test(svg), 'a platform is drawn solid');
});

test('a logical boundary is drawn dashed', () => {
  const svg = buildDiagramSvg(doc({
    zones: [{ id: 'dmz', name: 'DMZ', kind: 'network' }],
    components: [{ id: 'api', name: 'API', group: 'core', layer: 'services', zone: 'dmz' }]
  }));
  assert.match(svg, /fill="#F8F8F9" stroke="#D3DEE5" stroke-width="1" stroke-dasharray="5 4"/);
});

test('the transition takes the border and a tick, never a hue', () => {
  const svg = buildDiagramSvg(doc({
    components: [
      { id: 'web', name: 'Web', group: 'core', layer: 'clients', state: 'new' },
      { id: 'old', name: 'Old', group: 'core', layer: 'services', state: 'removed' }
    ]
  }));
  assert.ok(svg.includes('>NEW<'));
  assert.ok(svg.includes('>DEL<'));
  assert.match(svg, /stroke="#3D566B" stroke-width="1.8"/, 'a new component is drawn heavier');
  assert.match(svg, /stroke-dasharray="4 3"/, 'a removal is drawn as a ghost');
});

test('a card wears its own icon, not a swatch', () => {
  /* Three of the four renderers put the real glyph on the scope chip; this one
   * used to draw a plain square, so a database was a cylinder on screen and a
   * coloured box in the file people actually forward. */
  const svg = buildDiagramSvg(doc({
    components: [{ id: 'db', name: 'Aurora', group: 'core', layer: 'services', icon: 'db' }]
  }));
  assert.ok(svg.includes(ICONS.db), 'the cylinder should be in the file');
  assert.match(svg, /width="20" height="20" fill="#0099A0"/, 'the chip still carries the scope colour');
  assert.match(svg, /stroke="#FFFFFF" stroke-width="2"/, 'the glyph is stroked on the chip, never filled');
});

test('a component with no icon still gets one, and an unknown name does not break the file', () => {
  const svg = buildDiagramSvg(doc({
    components: [
      { id: 'a', name: 'Plain', group: 'core', layer: 'clients' },
      { id: 'b', name: 'Odd', group: 'core', layer: 'services', icon: 'not-a-real-icon' }
    ]
  }));
  assert.equal(svg.split(ICONS.box).length - 1, 2, 'both should fall back to the box glyph');
});

test('where a component runs leads the lower line, a step darker than what it is built with', () => {
  /* A file has no outline to give it — that is the treatment the three measured
   * surfaces use — so on the exported card the weight of the ink carries the
   * same distinction between "where it runs" and "what it is made of". */
  const svg = buildDiagramSvg(doc({
    components: [{
      id: 'api', name: 'API', group: 'core', layer: 'services',
      deployedOn: 'OpenShift', tech: ['Java']
    }]
  }));
  assert.match(svg, /fill="#3D566B">OpenShift ·/, 'the platform leads, in the darker ink');
  assert.match(svg, /fill="#8CA1B2">Java</, 'the technologies stay a step lighter');
  /* The gap between the two runs is the x offset, not rendered whitespace — SVG
   * collapses a trailing space and the second run would sit flush without it. */
  assert.match(svg, /x="104.8"[^>]*fill="#8CA1B2"/);
});

test('a card with no platform draws exactly the lower line it always did', () => {
  const svg = buildDiagramSvg(doc({
    components: [{ id: 'api', name: 'API', group: 'core', layer: 'services', tech: ['Java'], badge: 'B2B' }]
  }));
  assert.match(svg, />B2B · Java</);
  assert.ok(!svg.includes('OpenShift'));
});

test('authored text cannot become markup', () => {
  const svg = buildDiagramSvg(doc({
    components: [{
      id: 'web', name: '<script>x</script> & co', group: 'core', layer: 'clients'
    }]
  }));
  assert.ok(!svg.includes('<script>'));
  assert.ok(svg.includes('&lt;script&gt;'));
  assert.ok(!/&(?!amp;|lt;|gt;|quot;|#)/.test(svg), 'a bare ampersand is a broken SVG');
});

test('a name too wide for its card is cut rather than allowed to run over', () => {
  const svg = buildDiagramSvg(doc({
    components: [{
      id: 'web', group: 'core', layer: 'clients',
      name: 'A component whose name is far wider than two hundred and six pixels'
    }]
  }));
  assert.ok(svg.includes('…'));
  assert.ok(!svg.includes('two hundred and six pixels<'));
});

test('the legend and the protocol note are on the sheet', () => {
  const svg = buildDiagramSvg(doc({ ui: { architecture: { defaultProtocol: 'REST' } } }));
  assert.ok(svg.includes('>Core<'), 'colour carries scope; a sheet without the key is half a drawing');
  assert.ok(svg.includes('All calls are REST unless the line says otherwise.'));
});

test('an empty document still produces a valid picture', () => {
  const svg = buildDiagramSvg(normalizeArchitecture({ meta: { name: 'Empty' } }));
  assert.ok(svg.startsWith('<svg '));
  assert.ok(svg.endsWith('</svg>'));
  assert.ok(svg.includes('>Empty<'));
});
