/* The personal pattern library: flows the user saved to reuse elsewhere.
 *
 * One row in `settings`, holding a JSON array. A table of its own would buy
 * indexing nobody needs on forty rows and a migration everybody would have to
 * run; the key-value table exists for exactly this.
 *
 * Everything read back goes through `normalizeEntry` before it is trusted. Not
 * paranoia about the browser — the row is on the same disk as the projects —
 * but about the future: this shape will change, older rows will not, and the
 * failure mode has to be "that entry is gone" rather than a 500 on the picker
 * that hides the other thirty-nine.
 */

import { db, now, plain } from '../db';
import { slugify } from '../defaults';
import {
  LIBRARY_MAX_BYTES, LIBRARY_MAX_DESC, LIBRARY_MAX_ENTRIES, LIBRARY_MAX_STEPS,
  type FlowHint, type FlowPatternStep, type LibraryPattern
} from './types';

const KEY = 'flow-library';

/* ---------------------------------------------------------------- the row */

function readRow(): unknown[] {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(KEY);
  if (!row) return [];
  try {
    const parsed = JSON.parse(plain<{ value: string }>(row).value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRow(entries: LibraryPattern[]): void {
  db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).run(KEY, JSON.stringify(entries), now());
}

/* ------------------------------------------------------------ normalisation */

const str = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() ? v : undefined;

const strList = (v: unknown): string[] | undefined => {
  if (!Array.isArray(v)) return undefined;
  const out = v.filter((x): x is string => typeof x === 'string' && !!x.trim());
  return out.length ? out : undefined;
};

function normalizeHint(v: unknown): FlowHint {
  if (!v || typeof v !== 'object') return {};
  const raw = v as Record<string, unknown>;
  const out: FlowHint = {};
  for (const k of ['name', 'tech', 'layers', 'icons', 'avoid'] as const) {
    const list = strList(raw[k]);
    if (list) out[k] = list;
  }
  return out;
}

function normalizeStep(v: unknown, i: number): FlowPatternStep | null {
  if (!v || typeof v !== 'object') return null;
  const raw = v as Record<string, unknown>;
  const title = str(raw.title);
  if (!title) return null;
  const description = str(raw.description);
  return {
    key: str(raw.key) || `s${i}`,
    title,
    ...(description ? { description: description.slice(0, LIBRARY_MAX_DESC) } : {}),
    hint: normalizeHint(raw.hint)
  };
}

/** A stored entry, or null if there is not enough left of it to show. */
function normalizeEntry(v: unknown): LibraryPattern | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const raw = v as Record<string, unknown>;

  const id = str(raw.id);
  const name = str(raw.name);
  if (!id || !name) return null;

  const steps = (Array.isArray(raw.steps) ? raw.steps : [])
    .slice(0, LIBRARY_MAX_STEPS)
    .map(normalizeStep)
    .filter((s): s is FlowPatternStep => s !== null);
  /* Below two steps `insertFlow` would refuse it anyway, so it would sit in the
   * picker as an entry that does nothing when clicked. */
  if (steps.length < 2) return null;

  const sub = str(raw.sub);
  const note = str(raw.note);
  const from = str(raw.from);
  return {
    id,
    source: 'library',
    icon: str(raw.icon) || 'route',
    name,
    tagline: str(raw.tagline) || `${steps.length} steps`,
    ...(sub ? { sub } : {}),
    ...(note ? { note } : {}),
    ...(from ? { from } : {}),
    savedAt: str(raw.savedAt) || now(),
    steps
  };
}

/* -------------------------------------------------------------------- api */

/** Newest first — the order the picker shows them in. */
export function listFlowLibrary(): LibraryPattern[] {
  return readRow()
    .map(normalizeEntry)
    .filter((e): e is LibraryPattern => e !== null)
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

/**
 * Store a derived pattern. `id` and `savedAt` are minted here rather than taken
 * from the caller: a client-chosen id could collide with an entry saved from
 * another tab, and a client-chosen timestamp would order the library by
 * whatever the browser thinks the time is.
 *
 * Throws with a message meant for the user — `api.json` carries the server's
 * `error` string straight back up to the button that triggered this.
 */
export function saveFlowPattern(raw: unknown): LibraryPattern[] {
  const existing = listFlowLibrary();
  if (existing.length >= LIBRARY_MAX_ENTRIES) {
    throw new Error(
      `Your pattern library is full (${LIBRARY_MAX_ENTRIES}). Delete one before saving another.`
    );
  }

  const candidate = normalizeEntry({
    ...(raw && typeof raw === 'object' ? raw : {}),
    id: slugify(
      typeof (raw as { name?: unknown })?.name === 'string' ? (raw as { name: string }).name : 'pattern',
      existing.map(e => e.id)
    ),
    savedAt: now()
  });
  if (!candidate) throw new Error('A pattern needs a name and at least two steps.');

  const next = [candidate, ...existing];
  if (JSON.stringify(next).length > LIBRARY_MAX_BYTES) {
    throw new Error('That pattern is too long to store. Shorten the step descriptions and try again.');
  }

  writeRow(next);
  return listFlowLibrary();
}

export function renameFlowPattern(id: string, name: string): LibraryPattern[] {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('A pattern needs a name.');
  writeRow(listFlowLibrary().map(e => (e.id === id ? { ...e, name: trimmed } : e)));
  return listFlowLibrary();
}

export function deleteFlowPattern(id: string): LibraryPattern[] {
  writeRow(listFlowLibrary().filter(e => e.id !== id));
  return listFlowLibrary();
}
