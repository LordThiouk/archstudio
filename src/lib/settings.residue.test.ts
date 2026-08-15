import { strict as assert } from 'node:assert';
import { after, before, test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/* "Forget my key" has to be true on disk.
 *
 * Deleting a row in SQLite unlinks it; it does not erase it. Without
 * `secure_delete` and a vacuum, a key stays legible in a free page — and in
 * the write-ahead log — long after the studio says it is gone, and travels
 * into every copy of the file made afterwards. This test reads the raw bytes,
 * because that is the only place the claim can be checked. */

const dbFile = path.join(os.tmpdir(), `archstudio-residue-${process.pid}.db`);
process.env.DATABASE_PATH = dbFile;

let S: typeof import('./settings');

const files = () => [dbFile, `${dbFile}-wal`, `${dbFile}-shm`];

/** Every byte the studio has written, across the main file and the WAL. */
const onDisk = (): string =>
  files().filter(f => fs.existsSync(f)).map(f => fs.readFileSync(f, 'latin1')).join('');

before(async () => { S = await import('./settings'); });
after(() => { for (const f of files()) fs.rmSync(f, { force: true }); });

test('a stored key is on disk — that much is the documented trade', () => {
  S.saveAiSettings({ provider: 'anthropic', model: 'claude-opus-5', apiKey: 'sk-ant-FIRSTKEY-aaaa' });
  assert.ok(onDisk().includes('sk-ant-FIRSTKEY-aaaa'), 'the key is stored in clear text, as the dialog says');
});

test('replacing a key leaves no trace of the one it replaced', () => {
  S.saveAiSettings({ apiKey: 'sk-ant-SECONDKEY-bbbb' });
  const bytes = onDisk();
  assert.equal(bytes.includes('sk-ant-FIRSTKEY-aaaa'), false, 'the replaced key must not survive in a free page');
  assert.ok(bytes.includes('sk-ant-SECONDKEY-bbbb'), 'the current key is of course still there');
});

test('forgetting a key removes it from the file, not just from the row', () => {
  S.saveAiSettings({ apiKey: null });
  assert.equal(S.publicAiSettings().hasKey, false);
  assert.equal(onDisk().includes('sk-ant-SECONDKEY-bbbb'), false, 'the forgotten key must be gone from the bytes');
});

test('the rest of the document survives the scrubbing', () => {
  /* A vacuum rewrites the whole file; the point is to lose the key, not the
   * settings around it. */
  assert.equal(S.publicAiSettings().model, 'claude-opus-5');
  assert.equal(S.publicAiSettings().provider, 'anthropic');
});
