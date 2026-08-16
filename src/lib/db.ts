/* SQLite access layer.
 *
 * Uses `node:sqlite`, which ships inside Node 22.5+. No native compilation, no
 * engine download, no ORM: `npm install` stays small and `npm run dev` works on
 * a fresh clone with nothing else installed. The trade-off is hand-written SQL
 * — acceptable for three tables, and the whole surface is in this file plus
 * store.ts. See the README for the Prisma migration path if you outgrow it.
 */
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(process.cwd(), 'data', 'studio.db');

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
-- WAL lets one writer and many readers coexist, but a second *writer* still
-- gets SQLITE_BUSY immediately unless it is told to wait. Next runs more than
-- one process against this file — dev server and a build, or several workers —
-- so the honest default is to block briefly rather than fail the request.
PRAGMA busy_timeout = 5000;
-- Deleted content is overwritten with zeros rather than left in a free page.
-- The default is off because zeroing costs writes, and for folders and
-- projects nobody would care — but this file also holds an API key, and
-- "forget my key" has to mean the bytes are gone, not that a row stopped
-- pointing at them. It applies to future deletions only, so settings.ts
-- vacuums when a key changes, to scrub any copy written before this existed.
PRAGMA secure_delete = ON;

CREATE TABLE IF NOT EXISTS folders (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  color      TEXT,
  position   INTEGER NOT NULL DEFAULT 0,
  parent_id  TEXT REFERENCES folders(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_id);

CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  accent      TEXT,
  position    INTEGER NOT NULL DEFAULT 0,
  folder_id   TEXT REFERENCES folders(id) ON DELETE SET NULL,
  data        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_projects_folder ON projects(folder_id);

-- One row per settings group, holding JSON. A key-value table rather than
-- columns because this holds operator configuration, not domain data: it grows
-- by whatever the next feature needs to remember, and a migration per field
-- would be a lot of ceremony for a single-user file.
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS revisions (
  id         TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  data       TEXT NOT NULL,
  label      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_revisions_project ON revisions(project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS lego_catalog_versions (
  version TEXT PRIMARY KEY,
  seeded_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS lego_scopes (
  catalog_version TEXT NOT NULL REFERENCES lego_catalog_versions(version) ON DELETE CASCADE,
  id TEXT NOT NULL,
  label_en TEXT NOT NULL,
  label_fr TEXT NOT NULL,
  PRIMARY KEY (catalog_version, id)
);
CREATE TABLE IF NOT EXISTS lego_scope_aliases (
  catalog_version TEXT NOT NULL REFERENCES lego_catalog_versions(version) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  scope_id TEXT NOT NULL,
  PRIMARY KEY (catalog_version, alias),
  FOREIGN KEY (catalog_version, scope_id) REFERENCES lego_scopes(catalog_version, id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS lego_bricks (
  catalog_version TEXT NOT NULL REFERENCES lego_catalog_versions(version) ON DELETE CASCADE,
  id TEXT NOT NULL,
  icon TEXT NOT NULL,
  layer_id TEXT NOT NULL,
  default_scope_id TEXT NOT NULL,
  capabilities_json TEXT NOT NULL,
  PRIMARY KEY (catalog_version, id),
  FOREIGN KEY (catalog_version, default_scope_id) REFERENCES lego_scopes(catalog_version, id)
);
CREATE TABLE IF NOT EXISTS lego_brick_texts (
  catalog_version TEXT NOT NULL,
  brick_id TEXT NOT NULL,
  lang TEXT NOT NULL CHECK(lang IN ('en', 'fr')),
  role TEXT NOT NULL,
  responsibilities_json TEXT NOT NULL,
  notes_json TEXT NOT NULL,
  PRIMARY KEY (catalog_version, brick_id, lang),
  FOREIGN KEY (catalog_version, brick_id) REFERENCES lego_bricks(catalog_version, id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS lego_brick_scope_affinities (
  catalog_version TEXT NOT NULL,
  brick_id TEXT NOT NULL,
  scope_id TEXT NOT NULL,
  PRIMARY KEY (catalog_version, brick_id, scope_id),
  FOREIGN KEY (catalog_version, brick_id) REFERENCES lego_bricks(catalog_version, id) ON DELETE CASCADE,
  FOREIGN KEY (catalog_version, scope_id) REFERENCES lego_scopes(catalog_version, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_lego_affinity_scope ON lego_brick_scope_affinities(catalog_version, scope_id);
CREATE TABLE IF NOT EXISTS lego_intents (
  catalog_version TEXT NOT NULL REFERENCES lego_catalog_versions(version) ON DELETE CASCADE,
  id TEXT NOT NULL,
  label TEXT NOT NULL,
  PRIMARY KEY (catalog_version, id)
);
CREATE TABLE IF NOT EXISTS lego_intent_modes (
  catalog_version TEXT NOT NULL,
  intent_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  position INTEGER NOT NULL,
  PRIMARY KEY (catalog_version, intent_id, mode),
  FOREIGN KEY (catalog_version, intent_id) REFERENCES lego_intents(catalog_version, id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS lego_intent_shapes (
  catalog_version TEXT NOT NULL,
  intent_id TEXT NOT NULL,
  shape TEXT NOT NULL,
  position INTEGER NOT NULL,
  PRIMARY KEY (catalog_version, intent_id, shape),
  FOREIGN KEY (catalog_version, intent_id) REFERENCES lego_intents(catalog_version, id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS lego_variants (
  catalog_version TEXT NOT NULL REFERENCES lego_catalog_versions(version) ON DELETE CASCADE,
  id TEXT NOT NULL,
  intent_id TEXT NOT NULL,
  label TEXT NOT NULL,
  mode TEXT NOT NULL,
  brick_id TEXT NOT NULL,
  PRIMARY KEY (catalog_version, id),
  FOREIGN KEY (catalog_version, intent_id) REFERENCES lego_intents(catalog_version, id),
  FOREIGN KEY (catalog_version, brick_id) REFERENCES lego_bricks(catalog_version, id)
);
CREATE INDEX IF NOT EXISTS idx_lego_variants_filter ON lego_variants(catalog_version, intent_id, mode, brick_id);
CREATE TABLE IF NOT EXISTS lego_technology_descriptions (
  catalog_version TEXT NOT NULL REFERENCES lego_catalog_versions(version) ON DELETE CASCADE,
  technology_key TEXT NOT NULL,
  lang TEXT NOT NULL CHECK(lang IN ('en', 'fr')),
  description TEXT NOT NULL,
  PRIMARY KEY (catalog_version, technology_key, lang)
);
CREATE TABLE IF NOT EXISTS lego_capability_phrases (
  catalog_version TEXT NOT NULL,
  brick_id TEXT NOT NULL,
  lang TEXT NOT NULL CHECK(lang IN ('en', 'fr')),
  phrase TEXT NOT NULL,
  PRIMARY KEY (catalog_version, brick_id, lang),
  FOREIGN KEY (catalog_version, brick_id) REFERENCES lego_bricks(catalog_version, id) ON DELETE CASCADE
);
`;

declare global {
  // eslint-disable-next-line no-var
  var __studioDb: DatabaseSync | undefined;
}

function open(): DatabaseSync {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec(SCHEMA);
  return db;
}

/* Cached on globalThis so Next's dev-mode module reloading does not open a new
 * handle on every hot update. */
function connect(): DatabaseSync {
  return globalThis.__studioDb ?? (globalThis.__studioDb = open());
}

/* Opened on first query, never at import time.
 *
 * `next build` collects page data by importing every route module. When
 * opening the database was an import-time side effect, that meant a build
 * created `data/studio.db` for no reason — and, with several collection
 * workers racing to run the schema against the same fresh file, intermittently
 * died on `SQLITE_ERROR: database is locked`. It passed locally and on one CI
 * leg while failing on another, which is the signature of a race rather than a
 * bug in the build.
 *
 * The proxy keeps `db.prepare(…)` reading the same everywhere — store.ts is
 * the one file you rewrite if you outgrow this layer, and it should not have
 * to thread a getter through 25 call sites. Methods are bound to the real
 * handle: node:sqlite's natives reject being called on anything else. */
export const db: DatabaseSync = new Proxy({} as DatabaseSync, {
  get(_target, prop, receiver) {
    const real = connect() as unknown as Record<string | symbol, unknown>;
    const value = Reflect.get(real, prop, receiver);
    return typeof value === 'function' ? value.bind(real) : value;
  },
  has: (_target, prop) => prop in (connect() as unknown as object),
  getPrototypeOf: () => Object.getPrototypeOf(connect())
});

export const dbPath = DB_PATH;

export const now = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

export const uid = (prefix = '') =>
  prefix + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

/** node:sqlite returns null-prototype objects; spread them before use in React. */
export const plain = <T>(row: unknown): T => ({ ...(row as object) }) as T;
export const plainAll = <T>(rows: unknown[]): T[] => rows.map(r => plain<T>(r));
