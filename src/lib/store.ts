import { db, uid, now, plain, plainAll } from './db';
import { blankArchitecture, normalizeArchitecture } from './defaults';
import type {
  Architecture, FolderRecord, ProjectRecord, ProjectSummary, ProjectWithData, RevisionRecord
} from './types';

/** Snapshots kept per project. Oldest are pruned past this. */
const REVISION_CAP = 30;
/** Minimum gap between two automatic snapshots of the same project. */
const REVISION_INTERVAL_MS = 5 * 60_000;

/* ------------------------------------------------------------------ folders */

const folderRow = (r: unknown): FolderRecord => {
  const o = plain<Record<string, unknown>>(r);
  return {
    id: o.id as string, name: o.name as string, color: (o.color ?? null) as string | null,
    position: o.position as number, parentId: (o.parent_id ?? null) as string | null,
    createdAt: o.created_at as string, updatedAt: o.updated_at as string
  };
};

export function listFolders(): FolderRecord[] {
  return db.prepare('SELECT * FROM folders ORDER BY position, name').all().map(folderRow);
}

export function createFolder(name: string, parentId: string | null = null, color?: string): FolderRecord {
  const id = uid('f_');
  const max = plain<{ m: number | null }>(
    db.prepare('SELECT MAX(position) AS m FROM folders WHERE parent_id IS ?').get(parentId)
  ).m ?? -1;
  db.prepare(
    'INSERT INTO folders (id, name, color, position, parent_id) VALUES (?, ?, ?, ?, ?)'
  ).run(id, name, color ?? null, max + 1, parentId);
  return folderRow(db.prepare('SELECT * FROM folders WHERE id = ?').get(id));
}

export function updateFolder(
  id: string,
  patch: Partial<Pick<FolderRecord, 'name' | 'color' | 'position' | 'parentId'>>
): FolderRecord | null {
  if (patch.parentId !== undefined && wouldCycle(id, patch.parentId)) {
    throw new Error('A folder cannot be moved inside one of its own descendants.');
  }
  const sets: string[] = [];
  const vals: (string | number | null)[] = [];
  if (patch.name !== undefined) { sets.push('name = ?'); vals.push(patch.name); }
  if (patch.color !== undefined) { sets.push('color = ?'); vals.push(patch.color); }
  if (patch.position !== undefined) { sets.push('position = ?'); vals.push(patch.position); }
  if (patch.parentId !== undefined) { sets.push('parent_id = ?'); vals.push(patch.parentId); }
  if (!sets.length) return getFolder(id);
  sets.push('updated_at = ?'); vals.push(now());
  db.prepare(`UPDATE folders SET ${sets.join(', ')} WHERE id = ?`).run(...vals, id);
  return getFolder(id);
}

export function getFolder(id: string): FolderRecord | null {
  const row = db.prepare('SELECT * FROM folders WHERE id = ?').get(id);
  return row ? folderRow(row) : null;
}

/** Deleting a folder cascades to sub-folders; its projects fall back to the root. */
export function deleteFolder(id: string): void {
  const ids = descendants(id);
  const marks = ids.map(() => '?').join(',');
  db.prepare(`UPDATE projects SET folder_id = NULL WHERE folder_id IN (${marks})`).run(...ids);
  db.prepare('DELETE FROM folders WHERE id = ?').run(id);
}

function descendants(id: string): string[] {
  const all = listFolders();
  const out = [id];
  for (let i = 0; i < out.length; i++) {
    all.filter(f => f.parentId === out[i]).forEach(f => out.push(f.id));
  }
  return out;
}

function wouldCycle(id: string, nextParent: string | null): boolean {
  if (!nextParent) return false;
  if (nextParent === id) return true;
  return descendants(id).includes(nextParent);
}

/* ----------------------------------------------------------------- projects */

const projectRow = (r: unknown): ProjectRecord & { data?: string } => {
  const o = plain<Record<string, unknown>>(r);
  return {
    id: o.id as string, name: o.name as string,
    description: (o.description ?? null) as string | null,
    accent: (o.accent ?? null) as string | null,
    position: o.position as number,
    folderId: (o.folder_id ?? null) as string | null,
    createdAt: o.created_at as string, updatedAt: o.updated_at as string,
    data: o.data as string | undefined
  };
};

export function listProjects(): ProjectSummary[] {
  const rows = db.prepare(
    'SELECT id, name, description, accent, position, folder_id, data, created_at, updated_at FROM projects ORDER BY position, name'
  ).all();
  return rows.map(r => {
    const p = projectRow(r);
    let componentCount = 0, groupCount = 0;
    try {
      const doc = JSON.parse(p.data as string) as Architecture;
      componentCount = doc.components?.length ?? 0;
      groupCount = doc.groups?.length ?? 0;
    } catch { /* a corrupt document should not break the list */ }
    const { data: _drop, ...rest } = p;
    return { ...rest, componentCount, groupCount };
  });
}

export function getProject(id: string): ProjectWithData | null {
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  if (!row) return null;
  const p = projectRow(row);
  const { data, ...rest } = p;
  return { ...rest, data: normalizeArchitecture(JSON.parse(data as string)) };
}

export function createProject(input: {
  name: string; folderId?: string | null; description?: string; accent?: string;
  data?: Partial<Architecture>;
}): ProjectWithData {
  const id = uid('p_');
  const doc = input.data
    ? normalizeArchitecture(input.data)
    : blankArchitecture(input.name);
  doc.meta.name = doc.meta.name || input.name;

  const max = plain<{ m: number | null }>(
    db.prepare('SELECT MAX(position) AS m FROM projects WHERE folder_id IS ?').get(input.folderId ?? null)
  ).m ?? -1;

  db.prepare(
    'INSERT INTO projects (id, name, description, accent, position, folder_id, data) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, input.name, input.description ?? null, input.accent ?? null,
        max + 1, input.folderId ?? null, JSON.stringify(doc));

  return getProject(id)!;
}

export function updateProject(
  id: string,
  patch: {
    name?: string; description?: string | null; accent?: string | null;
    folderId?: string | null; position?: number; data?: Architecture;
  }
): ProjectWithData | null {
  const current = getProject(id);
  if (!current) return null;

  if (patch.data) maybeSnapshot(id, current.data);

  const sets: string[] = [];
  const vals: (string | number | null)[] = [];
  if (patch.name !== undefined) { sets.push('name = ?'); vals.push(patch.name); }
  if (patch.description !== undefined) { sets.push('description = ?'); vals.push(patch.description); }
  if (patch.accent !== undefined) { sets.push('accent = ?'); vals.push(patch.accent); }
  if (patch.folderId !== undefined) { sets.push('folder_id = ?'); vals.push(patch.folderId); }
  if (patch.position !== undefined) { sets.push('position = ?'); vals.push(patch.position); }
  if (patch.data !== undefined) {
    sets.push('data = ?');
    vals.push(JSON.stringify(normalizeArchitecture(patch.data)));
  }
  if (!sets.length) return current;
  sets.push('updated_at = ?'); vals.push(now());
  db.prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`).run(...vals, id);
  return getProject(id);
}

export function deleteProject(id: string): void {
  db.prepare('DELETE FROM projects WHERE id = ?').run(id);
}

export function duplicateProject(id: string): ProjectWithData | null {
  const src = getProject(id);
  if (!src) return null;
  return createProject({
    name: `${src.name} (copy)`,
    folderId: src.folderId,
    description: src.description ?? undefined,
    accent: src.accent ?? undefined,
    data: src.data
  });
}

/* ---------------------------------------------------------------- revisions */

function maybeSnapshot(projectId: string, previous: Architecture): void {
  const last = db.prepare(
    'SELECT created_at FROM revisions WHERE project_id = ? ORDER BY created_at DESC LIMIT 1'
  ).get(projectId) as { created_at?: string } | undefined;

  if (last?.created_at) {
    const age = Date.now() - new Date(last.created_at.replace(' ', 'T') + 'Z').getTime();
    if (age < REVISION_INTERVAL_MS) return;
  }

  db.prepare('INSERT INTO revisions (id, project_id, data) VALUES (?, ?, ?)')
    .run(uid('r_'), projectId, JSON.stringify(previous));

  db.prepare(
    `DELETE FROM revisions WHERE project_id = ? AND id NOT IN
     (SELECT id FROM revisions WHERE project_id = ? ORDER BY created_at DESC LIMIT ?)`
  ).run(projectId, projectId, REVISION_CAP);
}

export function listRevisions(projectId: string): RevisionRecord[] {
  const rows = db.prepare(
    'SELECT id, project_id, label, created_at FROM revisions WHERE project_id = ? ORDER BY created_at DESC'
  ).all(projectId);
  return plainAll<Record<string, unknown>>(rows)
    .map(o => ({
      id: o.id as string, projectId: o.project_id as string,
      label: (o.label ?? null) as string | null, createdAt: o.created_at as string
    }));
}

export function restoreRevision(projectId: string, revisionId: string): ProjectWithData | null {
  const row = db.prepare('SELECT data FROM revisions WHERE id = ? AND project_id = ?')
    .get(revisionId, projectId) as { data?: string } | undefined;
  if (!row?.data) return null;
  return updateProject(projectId, { data: JSON.parse(row.data) });
}

/* -------------------------------------------------------------------- seed */

export function isEmpty(): boolean {
  const n = plain<{ n: number }>(db.prepare('SELECT COUNT(*) AS n FROM projects').get()).n;
  return n === 0;
}
