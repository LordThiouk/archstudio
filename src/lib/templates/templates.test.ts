/* Every template resolved against every target, in both languages: 6 × 5 × 2 = 60
 * documents. The invariants below are the ones that would otherwise be found by
 * opening a project and seeing an empty layer or a broken arrow.
 *
 *   npm test                  check
 *   UPDATE_SNAPSHOTS=1 npm test   accept the new digests
 */

import { strict as assert } from 'node:assert';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, describe, it } from 'node:test';

import { TEMPLATES, instantiate, templateSummaries } from './index';
import { LANGS, TARGETS, isL10nPair, type CloudTarget, type Lang } from './types';
import type { Architecture } from '../types';

const SNAP_DIR = join(dirname(fileURLToPath(import.meta.url)), '__snapshots__');
const UPDATE = process.env.UPDATE_SNAPSHOTS === '1';
const TODAY = '2026-08-14';

const BUILTIN_TABS = ['overview', 'architecture', 'flows', 'stack'];
const PLACEHOLDERS = ['{{', 'TODO', 'FIXME', 'lorem', '…'];

/* ------------------------------------------------------------------ helpers */

/** A compact, readable fingerprint. Full documents would be megabytes. */
function digest(doc: Architecture) {
  return {
    title: doc.meta.title,
    kicker: doc.meta.kicker,
    groups: doc.groups.map(g => `${g.id}: ${g.name}`),
    layers: doc.layers.map(l => `${l.id}: ${l.name}`),
    components: doc.components.map(c =>
      `${c.id} [${c.layer}/${c.group}] ${c.name} → ${(c.deps || []).join(',') || '—'}`),
    flows: doc.flows.map(f => `${f.id}: ${f.name} (${f.steps.length}) ${f.steps.map(s => s.component).join('→')}`),
    sections: doc.sections.map(s => `${s.id}: ${s.type} — ${s.title}`),
    tabs: doc.ui.tabs
  };
}

/** Anything that still looks like an unresolved translation pair. */
function findL10nLeaks(value: unknown, path = '$'): string[] {
  if (isL10nPair(value)) return [path];
  if (Array.isArray(value)) return value.flatMap((v, i) => findL10nLeaks(v, `${path}[${i}]`));
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .flatMap(([k, v]) => findL10nLeaks(v, `${path}.${k}`));
  }
  return [];
}

function allStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach(v => allStrings(v, out));
  else if (value && typeof value === 'object') Object.values(value as object).forEach(v => allStrings(v, out));
  return out;
}

const snapshots = new Map<string, Record<string, unknown>>();

/* -------------------------------------------------------------------- tests */

for (const tpl of TEMPLATES) {
  describe(tpl.id, () => {
    for (const target of TARGETS as CloudTarget[]) {
      for (const lang of LANGS as Lang[]) {
        const label = `${target} · ${lang}`;

        it(label, () => {
          const warnings: unknown[] = [];
          const realWarn = console.warn, realError = console.error;
          console.warn = (...a) => warnings.push(a);
          console.error = (...a) => warnings.push(a);

          let doc: Architecture;
          try {
            doc = instantiate(tpl, { target, lang, projectName: 'Test project', today: TODAY });
          } finally {
            console.warn = realWarn; console.error = realError;
          }

          assert.deepEqual(warnings, [], 'instantiate must not warn');

          /* dependencies */
          const ids = new Set(doc.components.map(c => c.id));
          for (const c of doc.components) {
            for (const d of c.deps || []) {
              assert.ok(ids.has(d), `${c.id} depends on missing "${d}"`);
              assert.notEqual(d, c.id, `${c.id} depends on itself`);
            }
            assert.equal(new Set(c.deps).size, (c.deps || []).length, `${c.id} has duplicate deps`);
          }

          /* flows */
          for (const f of doc.flows) {
            assert.ok(f.steps.length >= 2, `flow "${f.id}" has ${f.steps.length} step(s)`);
            f.steps.forEach(s =>
              assert.ok(ids.has(s.component), `flow "${f.id}" steps on missing "${s.component}"`));
          }

          /* no empty band or empty scope */
          const usedGroups = new Set(doc.components.map(c => c.group));
          const usedLayers = new Set(doc.components.map(c => c.layer));
          doc.groups.forEach(g => assert.ok(usedGroups.has(g.id), `group "${g.id}" carries no component`));
          doc.layers.forEach(l => assert.ok(usedLayers.has(l.id), `layer "${l.id}" carries no component`));

          /* readability: the canvas stops being readable past eight per layer */
          doc.layers.forEach(l => {
            const n = doc.components.filter(c => c.layer === l.id).length;
            assert.ok(n <= 8, `layer "${l.id}" has ${n} components (max 8)`);
          });

          /* the deployment table exists exactly when a target was resolved */
          const deployment = doc.sections.find(s => s.id === 'deployment');
          if (target === 'agnostic') assert.equal(deployment, undefined, 'agnostic must not get a deployment table');
          else {
            assert.ok(deployment, 'a resolved target must get a deployment table');
            const rows = (deployment as unknown as { rows: string[][] }).rows;
            assert.ok(rows.length > 0, 'the deployment table must have rows');
            rows.forEach(r => assert.equal(r.length, 3, 'deployment rows are Component · Service · Notes'));
          }

          /* omission must stay marginal: the document has to remain the template */
          const ratio = doc.components.length / tpl.components.length;
          assert.ok(ratio >= 0.9, `only ${doc.components.length}/${tpl.components.length} components survived`);

          /* tabs: a section absent from a non-empty ui.tabs is unreachable */
          doc.sections.forEach(s => {
            assert.ok(doc.ui.tabs?.includes(s.id), `section "${s.id}" is missing from ui.tabs`);
            assert.ok(!BUILTIN_TABS.includes(s.id), `section id "${s.id}" collides with a built-in tab`);
          });
          assert.equal(new Set(doc.sections.map(s => s.id)).size, doc.sections.length, 'duplicate section id');

          /* language resolution */
          assert.equal(doc.meta.lang, lang);
          assert.deepEqual(findL10nLeaks(doc), [], 'an unresolved {en,fr} pair reached the document');

          /* no authoring leftovers */
          for (const s of allStrings(doc)) {
            for (const p of PLACEHOLDERS) {
              assert.ok(!s.includes(p), `placeholder ${JSON.stringify(p)} in ${JSON.stringify(s.slice(0, 80))}`);
            }
          }

          /* the warning has to be in the document, not only in the dialog */
          assert.match(String(doc.meta.principle), /starting point|point de départ/i);

          const store = snapshots.get(tpl.id) ?? {};
          store[label] = digest(doc);
          snapshots.set(tpl.id, store);
        });
      }
    }
  });
}

describe('registry', () => {
  it('ids, accents and icons are unique and well formed', () => {
    assert.equal(new Set(TEMPLATES.map(t => t.id)).size, TEMPLATES.length);
    TEMPLATES.forEach(t => {
      assert.match(t.accent, /^#[0-9A-Fa-f]{6}$/, `${t.id} accent`);
      assert.match(t.accentDark, /^#[0-9A-Fa-f]{6}$/, `${t.id} accentDark`);
      assert.ok(t.whenToUse.length >= 3, `${t.id} needs at least three whenToUse bullets`);
      assert.ok(t.whenNotToUse.length >= 2, `${t.id} needs at least two whenNotToUse bullets`);
      assert.equal(new Set(t.components.map(c => c.id)).size, t.components.length, `${t.id} duplicate component id`);
    });
  });

  it('summaries carry both languages and a count per target', () => {
    const list = templateSummaries();
    assert.equal(list.length, TEMPLATES.length);
    list.forEach(s => {
      LANGS.forEach(l => {
        assert.ok(s.name[l]?.length, `${s.id} name.${l}`);
        assert.ok(s.tagline[l]?.length, `${s.id} tagline.${l}`);
        assert.ok(s.whenNotToUse[l]?.length, `${s.id} whenNotToUse.${l}`);
      });
      TARGETS.forEach(t => assert.ok(s.counts[t] > 0, `${s.id} count for ${t}`));
    });
  });
});

/* Digests are written once, at the end, so one file per template holds all ten
 * resolutions — sixty separate files would be unreadable in a diff. */
after(() => {
  if (!existsSync(SNAP_DIR)) mkdirSync(SNAP_DIR, { recursive: true });
  const failures: string[] = [];

  for (const [id, store] of snapshots) {
    const file = join(SNAP_DIR, `${id}.json`);
    const next = JSON.stringify(store, null, 2) + '\n';
    if (UPDATE || !existsSync(file)) { writeFileSync(file, next); continue; }
    if (readFileSync(file, 'utf8') !== next) failures.push(id);
  }

  if (failures.length) {
    throw new Error(
      `Snapshot drift in: ${failures.join(', ')}.\n` +
      'Review the change, then run UPDATE_SNAPSHOTS=1 npm test to accept it.'
    );
  }
});
