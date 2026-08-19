/* Versions — the history, read as the architecture's own evolution.
 *
 * ------------------------------------------------------------ what was there
 *
 * The snapshots were always being written. They were framed as insurance: a
 * rolling log you open after a misdrop, where the only question asked of a row
 * is "what did I have then that I do not have now". That is a real question and
 * it stays answered. It is just not the one someone asks of a diagram that has
 * been evolving for six months — which is "show me the version we sent in
 * September", and that one needs the row to be a *thing you can open* rather
 * than a point to subtract from.
 *
 * ------------------------------------------------------------ what a version is
 *
 * A row of `revisions` with a name on it. Nothing more: no column was added and
 * none could be — the schema is `CREATE TABLE IF NOT EXISTS` re-exec'd on every
 * connection and there is no `ALTER TABLE` anywhere, so a new column would land
 * on fresh databases and never on an installed one.
 *
 * It does not need one. The *title* is the row's `label`, which is what a label
 * already was. The *number* is the `meta.version` of the document inside the
 * snapshot — which is where a document's version belongs, is already printed on
 * the paper cover and in the viewer's subtitle, and comes back for free because
 * `listRevisions` already parses that JSON to count components.
 *
 * The consequence worth stating: freezing a version *edits the document*. It
 * writes the number into `meta.version` and then snapshots. So a version is not
 * a label stuck on the side of the history — it is a document that knows what it
 * is called, and every export of it says so on its own.
 *
 * -------------------------------------------------------------- three kinds
 *
 * `version`     someone froze it, with a number and a title. Never pruned.
 * `checkpoint`  the app protected an operation — a restore, an enrichment.
 * `auto`        the five-minute save.
 *
 * The discriminant is the label, and that is not new: the prune SQL in store.ts
 * already compares `'Before restore'` literally. What is new is that the machine
 * labels live in one place instead of two. Someone who titles a version "Before
 * restore" gets a checkpoint — a real edge, and the honest price of not being
 * able to add a column.
 */

/** Labels the app writes for itself. A row carrying one is a safety net rather
 *  than a version someone decided to keep. */
export const MACHINE_LABELS: ReadonlySet<string> = new Set([
  'Before restore',
  'Before enrichment'
]);

/** The label a restore leaves behind, so the restore itself can be undone.
 *  Exported from here rather than declared in the store: it is one of the two
 *  strings that decide what a row *is*, and both belong together. */
export const RESTORE_LABEL = 'Before restore';

export type RevisionKind = 'version' | 'checkpoint' | 'auto';

export const revisionKind = (label: string | null | undefined): RevisionKind => {
  if (!label) return 'auto';
  return MACHINE_LABELS.has(label) ? 'checkpoint' : 'version';
};

/** Where a version series starts when nothing before it can be read. */
export const FIRST_VERSION = 'v1.0';

/** The number to offer for the next freeze: the last integer in the current one,
 *  plus one.
 *
 *  Bumping the *last* integer rather than parsing semver on purpose. This field
 *  is free text and always was — templates seed `v0.1`, and a document is just
 *  as likely to be on "Sprint 4" or "2026.09" as on a version triple. Taking the
 *  last run of digits and incrementing it does the right thing for all of those
 *  and never has to reject an answer the author already gave.
 *
 *    v1.3 → v1.4      v0.1 → v0.2      2.4.1 → 2.4.2
 *    v2   → v3        Sprint 4 → Sprint 5      (nothing) → v1.0
 *
 *  Leading zeros survive, because "2026.09" incrementing to "2026.10" is what
 *  someone writing dates means, and "2026.1" is not. */
export function nextVersionNumber(current: string | null | undefined): string {
  const from = (current || '').trim();
  if (!from) return FIRST_VERSION;

  /* The last run of digits, wherever it is — `v1.3` and `Sprint 4` both end on
   * one, and a trailing `-rc2` would too, which is the right answer for it. */
  const match = from.match(/(\d+)(\D*)$/);
  if (!match) return FIRST_VERSION;

  const [whole, digits, tail] = match;
  const next = String(Number(digits) + 1).padStart(digits.length, '0');
  return from.slice(0, from.length - whole.length) + next + tail;
}

/* --------------------------------------------------------------- the panel */

/** Anything with a `kind`. Keeps these two usable from the store, from the
 *  panel, and from a test, without any of them importing the others' types. */
interface Kinded { kind: RevisionKind }

/** The named series — what the panel lists as the architecture's evolution. */
export const versionsOf = <T extends Kinded>(rows: T[]): T[] =>
  rows.filter(r => r.kind === 'version');

/** Everything else, folded away: the five-minute saves and the app's own safety
 *  nets. Still restorable, still nameable — naming one promotes it. */
export const snapshotsOf = <T extends Kinded>(rows: T[]): T[] =>
  rows.filter(r => r.kind !== 'version');
