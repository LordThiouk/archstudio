import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { blankArchitecture, STARTER_LAYERS } from './defaults';
import { byArea, diffArchitecture, summarise, type Change } from './diff';
import type { Architecture, Component } from './types';

const comp = (id: string, over: Partial<Component> = {}): Component => ({
  id, name: id, group: 'core', layer: 'services', icon: 'box',
  tech: [], features: [], notes: [], deps: [], ...over
});

const doc = (over: Partial<Architecture> = {}): Architecture => ({
  ...blankArchitecture('Test'),
  groups: [
    { id: 'core', name: 'Core', short: 'Core', color: '#0099A0' },
    { id: 'vendor', name: 'Third parties', short: 'Vendors', color: '#4F8AC6' }
  ],
  layers: STARTER_LAYERS.map(layer => ({ ...layer })),
  ...over
});

const find = (cs: Change[], label: string) => cs.find(c => c.label === label);

/* ------------------------------------------------------------- components */

test('an untouched document produces no changes at all', () => {
  const a = doc({ components: [comp('api'), comp('db', { layer: 'data' })] });
  const d = diffArchitecture(a, structuredClone(a));
  assert.equal(d.total, 0);
  assert.equal(summarise(d), null);
  assert.deepEqual(byArea(d), []);
});

test('added and removed components are named, and the added one says where it landed', () => {
  const before = doc({ components: [comp('api')] });
  const after = doc({ components: [comp('db', { name: 'Postgres', layer: 'data' })] });
  const { changes } = diffArchitecture(before, after);

  assert.deepEqual(find(changes, 'api'), { kind: 'removed', area: 'component', label: 'api' });
  assert.deepEqual(find(changes, 'Postgres'), {
    kind: 'added', area: 'component', label: 'Postgres', detail: 'in Data & storage'
  });
});

test('a rename reads as one arrow, not as a delete plus an add', () => {
  const before = doc({ components: [comp('api', { name: 'API' })] });
  const after = doc({ components: [comp('api', { name: 'Public API' })] });
  const { changes, added, removed, changed } = diffArchitecture(before, after);

  assert.deepEqual([added, removed, changed], [0, 0, 1]);
  assert.equal(changes[0].label, 'API → Public API');
  assert.equal(changes[0].detail, 'renamed');
});

test('a move names both layers, each from the document it belongs to', () => {
  const before = doc({ components: [comp('api')] });
  const after = doc({
    layers: STARTER_LAYERS.map(l => (l.id === 'data' ? { ...l, name: 'Persistence' } : { ...l })),
    components: [comp('api', { layer: 'data' })]
  });
  assert.equal(find(diffArchitecture(before, after).changes, 'api')?.detail,
    'layer: Services & APIs → Persistence');
});

test('edited fields are listed by name in one entry', () => {
  const before = doc({ components: [comp('api', { role: 'Old', tech: ['Node'] })] });
  const after = doc({ components: [comp('api', { role: 'New', tech: ['Node', 'Fastify'], badge: 'B2B' })] });
  assert.equal(find(diffArchitecture(before, after).changes, 'api')?.detail,
    'badge, role, technologies');
});

test('moving a component to another platform is reported, and named as a deployment', () => {
  /* Distinct from a zone move, which History already spells out with both sides'
   * names. This one is a fact about the component, not a boundary it crossed. */
  const before = doc({ components: [comp('api', { deployedOn: 'AWS' })] });
  const after = doc({ components: [comp('api', { deployedOn: 'OpenShift' })] });
  assert.equal(find(diffArchitecture(before, after).changes, 'api')?.detail, 'deployment');
});

test('absent and empty are the same document, not an edit', () => {
  /* The left side is what an imported or pre-normalisation revision looks like:
   * the list keys are simply missing. Normalising fills them with `[]`, and
   * that must not surface as an edit the user never made. */
  const before = doc({
    components: [{ id: 'api', name: 'api', group: 'core', layer: 'services', icon: 'box' }]
  });
  const after = doc({ components: [comp('api', { name: 'api' })] });
  assert.equal(diffArchitecture(before, after).total, 0);
});

/* ------------------------------------------------------------ dependencies */

test('a new edge is reported with both endpoint names', () => {
  const before = doc({ components: [comp('api', { name: 'API' }), comp('db', { name: 'Postgres' })] });
  const after = doc({
    components: [comp('api', { name: 'API', deps: ['db'] }), comp('db', { name: 'Postgres' })]
  });
  const { changes } = diffArchitecture(before, after);
  assert.deepEqual(changes, [{ kind: 'added', area: 'dependency', label: 'API → Postgres' }]);
});

test('edges lost to a deleted component are not repeated once per edge', () => {
  const before = doc({
    components: [
      comp('api', { name: 'API', deps: ['db'] }),
      comp('worker', { name: 'Worker', deps: ['db'] }),
      comp('db', { name: 'Postgres', layer: 'data' })
    ]
  });
  const after = doc({ components: [comp('api', { name: 'API' }), comp('worker', { name: 'Worker' })] });
  const { changes } = diffArchitecture(before, after);

  assert.deepEqual(changes, [{ kind: 'removed', area: 'component', label: 'Postgres' }]);
});

/* ------------------------------------------------------------------ layers */

test('reordering layers is one entry, and only when the set is unchanged', () => {
  const base = STARTER_LAYERS.map(layer => ({ ...layer }));
  const before = doc();
  const after = doc({ layers: [base[1], base[0], base[2], base[3]] });
  const { changes } = diffArchitecture(before, after);

  assert.equal(changes.length, 1);
  assert.equal(changes[0].label, 'Layer order');
  assert.equal(changes[0].detail, 'Services & APIs · Client channels · Data & storage · Infrastructure');
});

test('deleting a layer explains the new sequence by itself', () => {
  const before = doc();
  const after = doc({ layers: STARTER_LAYERS.slice(0, 3).map(layer => ({ ...layer })) });
  const { changes } = diffArchitecture(before, after);

  assert.deepEqual(changes.map(c => c.kind), ['removed']);
  assert.equal(changes[0].label, 'Infrastructure');
});

/* ---------------------------------------------------------------- sections */

test('a section reports its slot move in chapter terms', () => {
  const before = doc({ sections: [{ id: 's', type: 'text', title: 'Scope', blocks: [] }] });
  const after = doc({
    sections: [{ id: 's', type: 'text', title: 'Scope', doc: { chapter: '2.1' }, blocks: [] }]
  });
  assert.equal(diffArchitecture(before, after).changes[0].detail, 'chapter: appendix → 2.1');
});

test('section payload edits read as content', () => {
  const before = doc({ sections: [{ id: 's', type: 'table', title: 'Risks', columns: [], rows: [] }] });
  const after = doc({
    sections: [{ id: 's', type: 'table', title: 'Risks', columns: [], rows: [['a', 'b']] }]
  });
  assert.equal(diffArchitecture(before, after).changes[0].detail, 'content');
});

/* ---------------------------------------------------------------- document */

test('meta fields are reported under their editor labels', () => {
  const before = doc();
  const after = doc();
  after.meta.intro = 'Something.';
  after.meta.principle = '<b>Principle.</b>';
  const labels = diffArchitecture(before, after).changes.map(c => c.label).sort();

  assert.deepEqual(labels, ['Guiding principle', 'Introduction']);
});

test('grouping keeps the concrete-first order and drops empty areas', () => {
  const before = doc({ components: [comp('api')] });
  const after = doc({ components: [comp('api'), comp('db', { layer: 'data' })] });
  after.meta.footer = 'Internal';

  assert.deepEqual(byArea(diffArchitecture(before, after)).map(g => g.area),
    ['component', 'document']);
});

test('the summary counts each kind it actually has', () => {
  const before = doc({ components: [comp('a'), comp('b')] });
  const after = doc({ components: [comp('a', { role: 'x' }), comp('c')] });
  assert.equal(summarise(diffArchitecture(before, after)), '1 added · 1 removed · 1 changed');
});
