import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { blankArchitecture, normalizeArchitecture } from '../defaults';
import { instantiate, getTemplate } from '../templates';
import { tabRows } from '../tabs';
import type { Architecture, Section } from '../types';
import { buildOutline, partOf, slotKey, supportLayerId, toc } from './plan';
import { PRESET_SECTION_IDS, applyDesignDocumentPreset, missingPresetSections } from './preset';

const slotted = (id: string, chapter?: string): Section => ({
  id, type: 'text', title: id, blocks: [], ...(chapter ? { doc: { chapter } } : {})
});

const withSections = (sections: Section[]): Architecture => {
  const doc = blankArchitecture('Test');
  doc.meta.intro = 'An introduction.';
  doc.sections = sections;
  return doc;
};

/* ------------------------------------------------------------------ slots */

test('slotKey parses a dotted chapter, and rejects the rest', () => {
  assert.deepEqual(slotKey('2.10'), [2, 10]);
  assert.deepEqual(slotKey('3'), [3]);
  assert.equal(slotKey(''), null);
  assert.equal(slotKey(undefined), null);
  assert.equal(slotKey('two.four'), null);
});

test('a section with no slot, or a slot outside the spine, lands in the appendices', () => {
  assert.equal(partOf(slotted('a', '2.4')), '2');
  assert.equal(partOf(slotted('b')), '6');
  assert.equal(partOf(slotted('c', '9.1')), '6');
});

/* ---------------------------------------------------------------- outline */

test('chapters are numbered from position, not from the stored slot', () => {
  const doc = withSections([
    slotted('dr', '2.5'),
    slotted('data', '2.2'),
    slotted('cicd', '4.1')
  ]);
  const outline = buildOutline(doc);
  const flat = toc(outline).filter(r => r.level === 2);

  /* No components, so part 2 has no generated inventory: the two application
   * chapters number 2.1 and 2.2 even though they are stored as 2.2 and 2.5. */
  assert.deepEqual(
    flat.map(r => `${r.number} ${r.title}`),
    ['2.1 data', '2.2 dr', '3.1 cicd']
  );
});

test('an empty part is dropped, and the parts after it shift up', () => {
  const doc = withSections([slotted('cost', '5.1')]);
  const parts = buildOutline(doc).parts;
  assert.deepEqual(parts.map(p => p.number), ['1', '2']);
  assert.equal(parts[1].entries[0].number, '2.1');
});

test('unslotted sections keep their authoring order, behind the slotted ones', () => {
  const doc = withSections([
    slotted('free-b'),
    slotted('appendix-slotted', '6.1'),
    slotted('free-a')
  ]);
  const appendix = buildOutline(doc).parts.at(-1)!;
  assert.deepEqual(appendix.entries.map(e => e.title), ['appendix-slotted', 'free-b', 'free-a']);
});

test('the diagram leads part 2 and the inventory is its first chapter', () => {
  const doc = instantiate(getTemplate('serverless-mvp')!, {
    target: 'gcp', lang: 'en', projectName: 'Demo', today: '2026-08-14'
  });
  const part = buildOutline(doc).parts.find(p => p.title.includes('Application'))!;
  assert.deepEqual(part.lead.map(b => b.kind), ['diagram']);
  assert.equal(part.entries[0].body.kind, 'inventory');
  assert.equal(part.entries[0].number, '2.1');
});

test('flows and the stack table close the appendices', () => {
  const doc = instantiate(getTemplate('multi-service')!, {
    target: 'aws', lang: 'fr', projectName: 'Demo', today: '2026-08-14'
  });
  const kinds = buildOutline(doc).parts.at(-1)!.entries.map(e => e.body.kind);
  assert.equal(kinds.at(-1), 'stack');
  assert.ok(kinds.includes('flow'));
});

test('the outline speaks the document’s language', () => {
  const doc = instantiate(getTemplate('rag')!, {
    target: 'azure', lang: 'fr', projectName: 'Demo', today: '2026-08-14'
  });
  const outline = buildOutline(doc);
  assert.equal(outline.lang, 'fr');
  assert.ok(outline.parts.some(p => p.title === 'Architecture applicative'));
});

test('the support layer follows the viewer’s rule', () => {
  const four = blankArchitecture('four');
  four.layers = [
    { id: 'clients', name: 'Clients' },
    { id: 'services', name: 'Services' },
    { id: 'data', name: 'Data' },
    { id: 'infra', name: 'Infrastructure' }
  ];
  assert.equal(supportLayerId(four), four.layers.at(-1)!.id);

  const three = normalizeArchitecture({ ...four, layers: four.layers.slice(0, 3) });
  assert.equal(supportLayerId(three), null);

  four.ui.supportLayer = false;
  assert.equal(supportLayerId(four), null);
});

/* ----------------------------------------------------------------- preset */

test('the preset adds every chapter once, and never twice', () => {
  const doc = blankArchitecture('Test');
  assert.equal(missingPresetSections(doc), PRESET_SECTION_IDS.length);

  const first = applyDesignDocumentPreset(doc);
  assert.deepEqual(first.added, PRESET_SECTION_IDS);
  assert.equal(missingPresetSections(doc), 0);

  const edited = doc.sections.find(s => s.id === 'add-dr')!;
  edited.title = 'Renamed by hand';

  const second = applyDesignDocumentPreset(doc);
  assert.deepEqual(second.added, []);
  assert.equal(doc.sections.filter(s => s.id === 'add-dr').length, 1);
  assert.equal(doc.sections.find(s => s.id === 'add-dr')!.title, 'Renamed by hand');
});

test('preset chapters stay off the viewer’s tab bar', () => {
  const doc = instantiate(getTemplate('saas-multitenant')!, {
    target: 'agnostic', lang: 'en', projectName: 'Demo', today: '2026-08-14'
  });
  const before = tabRows(doc).filter(t => t.visible).map(t => t.id);

  applyDesignDocumentPreset(doc);

  assert.deepEqual(tabRows(doc).filter(t => t.visible).map(t => t.id), before);
  assert.ok(PRESET_SECTION_IDS.every(id => !doc.ui.tabs!.includes(id)));
});

test('a document that never pinned its tabs keeps the ones it showed', () => {
  const doc = blankArchitecture('Test');
  doc.sections = [slotted('mine')];
  doc.ui.tabs = undefined;
  const before = tabRows(doc).filter(t => t.visible).map(t => t.id);

  applyDesignDocumentPreset(doc);

  assert.deepEqual(tabRows(doc).filter(t => t.visible).map(t => t.id), before);
});

test('the generated deployment table becomes the service-selection chapter', () => {
  const doc = instantiate(getTemplate('event-driven')!, {
    target: 'gcp', lang: 'en', projectName: 'Demo', today: '2026-08-14'
  });
  applyDesignDocumentPreset(doc);
  assert.equal(doc.sections.find(s => s.id === 'deployment')!.doc?.chapter, '2.1');

  const part = buildOutline(doc).parts.find(p => p.number === '2')!;
  assert.deepEqual(part.entries.slice(0, 2).map(e => e.body.kind), ['inventory', 'section']);
});

test('the preset is translated, and only in the document’s language', () => {
  const fr = blankArchitecture('Test');
  fr.meta.lang = 'fr';
  applyDesignDocumentPreset(fr);
  const dr = fr.sections.find(s => s.id === 'add-dr')!;
  assert.equal(dr.title, 'Sauvegarde et reprise d’activité');
  assert.equal(JSON.stringify(dr).includes('"en":'), false);

  const en = blankArchitecture('Test');
  applyDesignDocumentPreset(en);
  assert.equal(en.sections.find(s => s.id === 'add-dr')!.title, 'Backup and disaster recovery');
});

test('a preset document survives a round trip through normalisation', () => {
  const doc = blankArchitecture('Test');
  applyDesignDocumentPreset(doc);
  const round = normalizeArchitecture(JSON.parse(JSON.stringify(doc)));
  assert.equal(missingPresetSections(round), 0);
  assert.equal(round.sections.find(s => s.id === 'add-cicd')!.doc?.chapter, '4.1');
});

test('the whole plan renders from a preset document without a hole', () => {
  const doc = instantiate(getTemplate('monolith')!, {
    target: 'selfhosted', lang: 'en', projectName: 'Demo', today: '2026-08-14'
  });
  applyDesignDocumentPreset(doc);
  const outline = buildOutline(doc);

  assert.deepEqual(outline.parts.map(p => p.number), ['1', '2', '3', '4', '5', '6']);
  toc(outline).forEach(row => {
    assert.ok(row.title.trim().length, 'every heading has a title');
    assert.match(row.number, /^\d+(\.\d+)?$/);
  });
});
