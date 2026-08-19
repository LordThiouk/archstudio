import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  FIRST_VERSION, MACHINE_LABELS, RESTORE_LABEL, nextVersionNumber, revisionKind,
  snapshotsOf, versionsOf, type RevisionKind
} from './versions';

/* ------------------------------------------------------------- the kinds */

test('a row with no label is an automatic snapshot', () => {
  assert.equal(revisionKind(null), 'auto');
  assert.equal(revisionKind(undefined), 'auto');
  assert.equal(revisionKind(''), 'auto');
});

test('a row the app labelled for itself is a checkpoint, not a version', () => {
  /* These are safety nets the app wrote without being asked. Listing them among
   * the versions someone decided to keep would bury the ones that mean
   * something. */
  assert.equal(revisionKind('Before restore'), 'checkpoint');
  assert.equal(revisionKind('Before enrichment'), 'checkpoint');
});

test('a row somebody named is a version', () => {
  assert.equal(revisionKind('Sent to the client'), 'version');
  assert.equal(revisionKind('Comité archi'), 'version');
});

test('the restore label is one of the machine labels, not a second list', () => {
  /* The prune SQL in store.ts compares this string literally. If it ever drifts
   * from the set the panel classifies by, restore checkpoints start showing up
   * as versions. */
  assert.ok(MACHINE_LABELS.has(RESTORE_LABEL));
});

/* --------------------------------------------------------- the next number */

test('the last integer is what gets bumped, wherever it sits', () => {
  assert.equal(nextVersionNumber('v1.3'), 'v1.4');
  assert.equal(nextVersionNumber('v0.1'), 'v0.2');
  assert.equal(nextVersionNumber('2.4.1'), '2.4.2');
  assert.equal(nextVersionNumber('v2'), 'v3');
  assert.equal(nextVersionNumber('v9'), 'v10');
});

test('it works on the version numbers that are not version numbers', () => {
  /* The field is free text and always was — a document is as likely to be on a
   * sprint or a date as on a semver triple, and refusing those would mean
   * refusing an answer the author already gave. */
  assert.equal(nextVersionNumber('Sprint 4'), 'Sprint 5');
  assert.equal(nextVersionNumber('v1.0-rc1'), 'v1.0-rc2');
});

test('leading zeros survive, because a date is not a decimal', () => {
  assert.equal(nextVersionNumber('2026.09'), '2026.10');
  assert.equal(nextVersionNumber('v1.09'), 'v1.10');
});

test('nothing to read from means the series starts at the beginning', () => {
  assert.equal(nextVersionNumber(undefined), FIRST_VERSION);
  assert.equal(nextVersionNumber(null), FIRST_VERSION);
  assert.equal(nextVersionNumber('   '), FIRST_VERSION);
  assert.equal(nextVersionNumber('draft'), FIRST_VERSION);
});

test('bumping twice from the same start walks the series', () => {
  assert.equal(nextVersionNumber(nextVersionNumber('v1.0')), 'v1.2');
});

/* ------------------------------------------------------------- the panel */

const rows = [
  { id: 'a', kind: 'version' as RevisionKind },
  { id: 'b', kind: 'auto' as RevisionKind },
  { id: 'c', kind: 'checkpoint' as RevisionKind },
  { id: 'd', kind: 'version' as RevisionKind }
];

test('the series is the named rows, and everything else folds away together', () => {
  assert.deepEqual(versionsOf(rows).map(r => r.id), ['a', 'd']);
  assert.deepEqual(snapshotsOf(rows).map(r => r.id), ['b', 'c']);
});

test('the two halves partition the list — nothing is shown twice or lost', () => {
  assert.equal(versionsOf(rows).length + snapshotsOf(rows).length, rows.length);
});
