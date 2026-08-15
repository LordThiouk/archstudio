import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { FLOW_CATALOG, resolveCatalog } from './catalog';
import { matchSteps } from './match';
import { insertFlow } from './apply';
import { ICON_KEYS, blankArchitecture, normalizeArchitecture, slugify } from '../defaults';
import { LANGS, isL10nPair } from '../templates/types';
import { TEMPLATES, instantiate } from '../templates/index';
import demoJson from '../seed/demo.json';
import type { Architecture } from '../types';

/* No snapshots here, deliberately. `templates.test.ts` earns its digests
 * because sixty resolved documents cannot be read any other way; eight short
 * patterns can, and a snapshot of them would only be a staler copy of the file
 * next to it.
 *
 * What cannot be read off the file is whether a hint matches anything real.
 * That is what the last two tests are for, and they are the reason to trust the
 * catalogue at all. */

const DOCUMENTS: [string, Architecture][] = [
  ['demo', normalizeArchitecture(demoJson as unknown as Architecture)],
  ...TEMPLATES.map(t => [
    t.id,
    instantiate(t, { target: 'agnostic', lang: 'en', projectName: t.id })
  ] as [string, Architecture])
];

const knownIcons: Set<string> = new Set(ICON_KEYS);

test('ids are unique, stable and usable as slugs', () => {
  const ids = FLOW_CATALOG.map(p => p.id);
  assert.equal(new Set(ids).size, ids.length);
  ids.forEach(id => assert.equal(slugify(id), id, `${id} would be rewritten on insert`));
});

test('step keys are unique within their pattern', () => {
  for (const p of FLOW_CATALOG) {
    const keys = p.steps.map(s => s.key);
    assert.equal(new Set(keys).size, keys.length, `${p.id} reuses a step key`);
  }
});

test('every pattern is long enough to be a journey and short enough to review', () => {
  for (const p of FLOW_CATALOG) {
    assert.ok(p.steps.length >= 4, `${p.id} has only ${p.steps.length} steps`);
    assert.ok(p.steps.length <= 10, `${p.id} has ${p.steps.length} steps`);
  }
});

test('every hint carries a name or a stack signal — layer and icon alone decide nothing', () => {
  for (const p of FLOW_CATALOG) {
    for (const s of p.steps) {
      assert.ok(s.hint.name?.length || s.hint.tech?.length, `${p.id}/${s.key} has no real signal`);
    }
  }
});

test('icons are real, in the patterns and in the hints', () => {
  for (const p of FLOW_CATALOG) {
    assert.ok(knownIcons.has(p.icon), `${p.id} uses icon "${p.icon}"`);
    for (const s of p.steps) {
      for (const i of s.hint.icons || []) {
        assert.ok(knownIcons.has(i), `${p.id}/${s.key} hints at icon "${i}"`);
      }
    }
  }
});

test('layer hints name layers some real document actually uses', () => {
  /* A layer id nobody uses is dead weight that reads as a working signal. */
  const known = new Set([
    ...blankArchitecture().layers.map(l => l.id),
    ...DOCUMENTS.flatMap(([, d]) => d.layers.map(l => l.id))
  ]);
  for (const p of FLOW_CATALOG) {
    for (const s of p.steps) {
      for (const l of s.hint.layers || []) {
        assert.ok(known.has(l), `${p.id}/${s.key} hints at layer "${l}", which no document has`);
      }
    }
  }
});

test('resolution leaves no bilingual pair behind, in either language', () => {
  const leaks = (v: unknown, path: string): string[] => {
    if (isL10nPair(v)) return [path];
    if (Array.isArray(v)) return v.flatMap((x, i) => leaks(x, `${path}[${i}]`));
    if (v && typeof v === 'object') {
      return Object.entries(v).flatMap(([k, x]) => leaks(x, `${path}.${k}`));
    }
    return [];
  };

  for (const lang of LANGS) {
    const resolved = resolveCatalog(lang);
    assert.deepEqual(leaks(resolved, lang), []);
    assert.equal(resolved.length, FLOW_CATALOG.length);
    resolved.forEach(p => assert.equal(p.source, 'catalog'));
  }
});

test('the two languages really differ — nothing was left English by accident', () => {
  const en = resolveCatalog('en');
  const fr = resolveCatalog('fr');
  en.forEach((p, i) => {
    assert.notEqual(p.tagline, fr[i].tagline, `${p.id} has the same tagline in both languages`);
  });
});

test('every pattern recognises at least two components of every real document', () => {
  /* The only test that can catch a hint matching nothing that exists. Two
   * confident bindings is also exactly the threshold `insertFlow` needs, so
   * below it the pattern would be unusable rather than merely imprecise. */
  for (const p of resolveCatalog('en')) {
    for (const [label, doc] of DOCUMENTS) {
      const confident = matchSteps(p.steps, doc.components).filter(b => b.confident).length;
      assert.ok(confident >= 2, `${p.id} finds only ${confident} confident steps in ${label}`);
    }
  }
});

test('the auto-match alone produces a flow that survives a save', () => {
  /* End to end with no human correction: the worst case the modal allows. */
  for (const p of resolveCatalog('en')) {
    for (const [label, source] of DOCUMENTS) {
      const doc = structuredClone(source);
      const bindings = matchSteps(p.steps, doc.components).map(b => b.component);
      const res = insertFlow(doc, { pattern: p, bindings });
      assert.ok(res, `${p.id} produced no usable flow in ${label}`);

      const before = structuredClone(doc.flows);
      assert.deepEqual(normalizeArchitecture(doc).flows, before,
        `${p.id} lost steps to normalisation in ${label}`);
    }
  }
});
