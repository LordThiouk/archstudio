/* The first test in this repo that touches SQLite.
 *
 * Everything else under `src/lib` is a pure function over a document, which is
 * why the snapshot policy had no coverage at all: the five-minute gate, the
 * thirty-row cap that only ever catches unlabelled rows, the restore ceiling.
 * Versions are built on all three, so they get tested now.
 *
 * `DATABASE_PATH` is read at import time in db.ts, so the environment has to be
 * set before the module graph is pulled in — hence the dynamic import below
 * rather than a static one at the top of the file. Each run gets its own file
 * under `os.tmpdir()` and deletes it afterwards.
 */

import { strict as assert } from 'node:assert';
import { after, before, describe, test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { blankArchitecture } from './defaults';
import type { Architecture } from './types';

const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'archstudio-store-'));
process.env.DATABASE_PATH = path.join(DIR, 'test.db');

type Store = typeof import('./store');
let store: Store;

before(async () => { store = await import('./store'); });
after(() => { fs.rmSync(DIR, { recursive: true, force: true }); });

/** A document with `n` components, so a snapshot's size is legible in a test. */
const docOf = (n: number, version?: string): Architecture => {
  const doc = blankArchitecture('Test');
  if (version) doc.meta.version = version;
  doc.layers = [{ id: 'services', name: 'Services' }];
  doc.groups = [{ id: 'core', name: 'Core' }];
  doc.components = Array.from({ length: n }, (_, i) => ({
    id: `c${i}`, name: `C${i}`, group: 'core', layer: 'services',
    tech: [], features: [], notes: [], deps: []
  }));
  return doc;
};

const project = (n = 1) => store.createProject({ name: 'Test', data: docOf(n) });

describe('revisions', () => {
  test('a new project starts with no history at all', () => {
    const p = project();
    assert.deepEqual(store.listRevisions(p.id), []);
  });

  test('a snapshot carries the component count and the document’s own version', () => {
    const p = store.createProject({ name: 'T', data: docOf(3, 'v2.1') });
    store.createRevision(p.id, 'Kickoff');
    const [row] = store.listRevisions(p.id);
    assert.equal(row.componentCount, 3);
    assert.equal(row.version, 'v2.1');
    assert.equal(row.label, 'Kickoff');
    assert.equal(row.kind, 'version');
  });

  test('a document with no version of its own reports none', () => {
    const p = project();
    store.createRevision(p.id);
    assert.equal(store.listRevisions(p.id)[0].version, null);
    assert.equal(store.listRevisions(p.id)[0].kind, 'auto');
  });

  test('the five-minute gate stops a second automatic snapshot', () => {
    /* Two saves in a row must not leave two rows. The first `updateProject`
     * writes nothing either — there is no earlier document to keep. */
    const p = project(1);
    store.updateProject(p.id, { data: docOf(2) });
    const afterFirst = store.listRevisions(p.id).length;
    store.updateProject(p.id, { data: docOf(3) });
    assert.equal(store.listRevisions(p.id).length, afterFirst,
      'the second save inside the window should have been suppressed');
  });

  test('the cap only ever prunes rows nobody named', () => {
    /* The whole promise of naming a version: forty automatic rows cannot push it
     * out. `createRevision` bypasses the interval, so this fills the table
     * without waiting five minutes forty times. */
    const p = project();
    store.createRevision(p.id, 'Kept for good');
    for (let i = 0; i < 40; i++) store.createRevision(p.id);

    const rows = store.listRevisions(p.id);
    const named = rows.filter(r => r.label === 'Kept for good');
    assert.equal(named.length, 1, 'the named version should have survived');
    assert.ok(rows.filter(r => r.label === null).length <= 30,
      'automatic snapshots should be capped at thirty');
  });

  test('restoring keeps the document it replaced, and says what it is', () => {
    const p = store.createProject({ name: 'T', data: docOf(2) });
    const old = store.createRevision(p.id, 'Kickoff')!;
    store.updateProject(p.id, { data: docOf(7) });

    const restored = store.restoreRevision(p.id, old.id);
    assert.equal(restored?.data.components.length, 2, 'the old document should be live again');

    const before = store.listRevisions(p.id).find(r => r.label === 'Before restore');
    assert.ok(before, 'the pre-restore document should have been kept');
    assert.equal(before!.componentCount, 7);
    assert.equal(before!.kind, 'checkpoint', 'a safety net is not a version');
  });

  test('the pre-restore rows have a ceiling of their own', () => {
    const p = project();
    const target = store.createRevision(p.id, 'Kickoff')!;
    for (let i = 0; i < 8; i++) store.restoreRevision(p.id, target.id);
    const kept = store.listRevisions(p.id).filter(r => r.label === 'Before restore');
    assert.ok(kept.length <= 5, `expected at most 5 pre-restore rows, found ${kept.length}`);
  });

  test('naming a snapshot promotes it, and clearing the name demotes it', () => {
    const p = project();
    const r = store.createRevision(p.id)!;
    assert.equal(r.kind, 'auto');
    assert.equal(store.labelRevision(p.id, r.id, 'Comité archi')?.kind, 'version');
    assert.equal(store.labelRevision(p.id, r.id, '')?.kind, 'auto');
  });
});

describe('freezing a version', () => {
  test('the number lands in the document and in the snapshot at once', () => {
    /* This is the whole design: a frozen version is a document that knows what
     * it is called, so exporting it prints the number on its own cover without
     * anything downstream being told which revision it came from. */
    const p = store.createProject({ name: 'T', data: docOf(4) });
    const frozen = store.freezeVersion(p.id, 'v1.0', 'Kickoff')!;

    assert.equal(frozen.version, 'v1.0');
    assert.equal(frozen.label, 'Kickoff');
    assert.equal(frozen.kind, 'version');
    assert.equal(store.getProject(p.id)?.data.meta.version, 'v1.0',
      'the live document should carry the number too');
    assert.equal(store.getRevisionData(p.id, frozen.id)?.meta.version, 'v1.0',
      'and so should the snapshot');
  });

  test('a frozen version holds the drawing as it was, not as it becomes', () => {
    const p = store.createProject({ name: 'T', data: docOf(2) });
    const v1 = store.freezeVersion(p.id, 'v1.0')!;
    store.updateProject(p.id, { data: docOf(9) });

    assert.equal(store.getRevisionData(p.id, v1.id)?.components.length, 2);
    assert.equal(store.getProject(p.id)?.data.components.length, 9);
  });

  test('a version can be frozen without a title', () => {
    const p = project();
    const frozen = store.freezeVersion(p.id, 'v3.0')!;
    /* No title means no label, which means the row reads as an automatic
     * snapshot — the number alone is not what keeps it. Worth knowing. */
    assert.equal(frozen.version, 'v3.0');
    assert.equal(frozen.label, null);
  });

  test('freezing an unknown project returns null rather than throwing', () => {
    assert.equal(store.freezeVersion('p_nope', 'v1.0'), null);
  });
});
