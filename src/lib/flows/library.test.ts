import { strict as assert } from 'node:assert';
import { after, before, test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { LIBRARY_MAX_ENTRIES } from './types';

/* `node --test` gives each file its own process, so pointing DATABASE_PATH at a
 * scratch file here cannot reach another test or the developer's own data. The
 * imports are deferred because db.ts reads that variable when it loads. */

const dbFile = path.join(os.tmpdir(), `archstudio-flowlib-${process.pid}.db`);
process.env.DATABASE_PATH = dbFile;

let L: typeof import('./library');
let DB: typeof import('../db');

before(async () => {
  L = await import('./library');
  DB = await import('../db');
});
after(() => {
  for (const f of [dbFile, `${dbFile}-wal`, `${dbFile}-shm`]) fs.rmSync(f, { force: true });
});

/** Write straight into the settings row, bypassing every guard. */
const poison = (value: string) => {
  DB.db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES ('flow-library', ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(value, DB.now());
};

const pattern = (name: string, steps = 3) => ({
  source: 'library',
  icon: 'route',
  name,
  tagline: `${steps} steps`,
  steps: Array.from({ length: steps }, (_, i) => ({
    key: `s${i}`, title: `Step ${i}`, hint: { name: ['api'] }
  }))
});

test('an empty library is empty rather than an error', () => {
  assert.deepEqual(L.listFlowLibrary(), []);
});

test('a saved pattern comes back with a server-minted id and timestamp', () => {
  const lib = L.saveFlowPattern({ ...pattern('Checkout'), id: 'attacker-chosen', savedAt: '1999' });
  assert.equal(lib.length, 1);
  assert.equal(lib[0].id, 'checkout', 'the client does not get to pick the id');
  assert.notEqual(lib[0].savedAt, '1999', 'nor the timestamp');
  assert.equal(lib[0].source, 'library');
  assert.equal(lib[0].steps.length, 3);
});

test('two patterns of the same name get distinct ids', () => {
  const lib = L.saveFlowPattern(pattern('Checkout'));
  assert.deepEqual(lib.map(e => e.id).sort(), ['checkout', 'checkout-2']);
});

test('the newest pattern is listed first', () => {
  L.saveFlowPattern(pattern('Newest'));
  assert.equal(L.listFlowLibrary()[0].name, 'Newest');
});

test('a pattern that could never be inserted is refused rather than stored', () => {
  assert.throws(() => L.saveFlowPattern(pattern('Too short', 1)), /two steps/);
  assert.throws(() => L.saveFlowPattern({ ...pattern('Nameless'), name: '' }), /name/);
  assert.equal(L.listFlowLibrary().some(e => e.name === 'Too short'), false);
});

test('renaming and deleting work, and leave the others alone', () => {
  const before = L.listFlowLibrary().length;
  L.saveFlowPattern(pattern('Temporary'));
  const id = L.listFlowLibrary().find(e => e.name === 'Temporary')!.id;

  assert.equal(L.renameFlowPattern(id, 'Renamed').find(e => e.id === id)?.name, 'Renamed');
  assert.throws(() => L.renameFlowPattern(id, '  '), /name/);

  assert.equal(L.deleteFlowPattern(id).length, before);
  assert.equal(L.deleteFlowPattern('never-existed').length, before, 'deleting nothing is not an error');
});

test('a corrupt row degrades to an empty library, never to a crash', () => {
  const saved = DB.plain<{ value: string }>(
    DB.db.prepare("SELECT value FROM settings WHERE key = 'flow-library'").get()
  ).value;

  for (const junk of ['not json at all', '{"nope":1}', 'null', '[1,2,3]', '["x"]']) {
    poison(junk);
    assert.deepEqual(L.listFlowLibrary(), [], `"${junk}" should read as empty`);
  }

  /* One bad entry among good ones costs that entry and nothing else. */
  poison(JSON.stringify([
    { ...pattern('Good'), id: 'good', savedAt: '2026-01-01 00:00:00' },
    { id: 'bad', name: 'Bad', steps: 'oops' },
    null,
    { ...pattern('Also good'), id: 'also', savedAt: '2026-01-02 00:00:00' }
  ]));
  assert.deepEqual(L.listFlowLibrary().map(e => e.id), ['also', 'good']);

  poison(saved);
});

test('a partial entry is filled in rather than dropped', () => {
  poison(JSON.stringify([{
    id: 'sparse', name: 'Sparse',
    steps: [
      { title: 'One', hint: { name: 'not a list' } },
      { title: 'Two' },
      { key: 'x', title: '   ' }
    ]
  }]));
  const [entry] = L.listFlowLibrary();
  assert.equal(entry.icon, 'route');
  assert.equal(entry.tagline, '2 steps', 'the blank-titled step was dropped before counting');
  assert.deepEqual(entry.steps.map(s => s.key), ['s0', 's1']);
  assert.deepEqual(entry.steps[0].hint, {}, 'a malformed hint becomes no hint');
});

test('the library is capped, and says so in words the user can act on', () => {
  poison(JSON.stringify(
    Array.from({ length: LIBRARY_MAX_ENTRIES }, (_, i) => ({
      ...pattern(`P${i}`), id: `p${i}`, savedAt: '2026-01-01 00:00:00'
    }))
  ));
  assert.equal(L.listFlowLibrary().length, LIBRARY_MAX_ENTRIES);
  assert.throws(() => L.saveFlowPattern(pattern('One too many')), /full \(40\)/);
});

test('a single oversized pattern is refused before it reaches the row', () => {
  /* Step count and description length are both capped on the way in, so the
   * only way left to bloat an entry is the hint lists — which is exactly what
   * the byte cap is there to catch. */
  poison('[]');
  const huge = {
    ...pattern('Huge', 24),
    steps: Array.from({ length: 24 }, (_, i) => ({
      key: `s${i}`, title: `Step ${i}`, description: 'x'.repeat(400),
      hint: { name: Array.from({ length: 20 }, (_, j) => `w${j}`.repeat(100)) }
    }))
  };
  assert.throws(() => L.saveFlowPattern(huge), /too long/);
  assert.deepEqual(L.listFlowLibrary(), []);
});
