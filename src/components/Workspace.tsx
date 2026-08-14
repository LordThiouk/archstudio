'use client';

import { useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable, type DragEndEvent, type DragStartEvent
} from '@dnd-kit/core';
import { Icon } from './Icon';
import { FOLDER_COLORS } from '@/lib/defaults';
import type { FolderRecord, ProjectSummary } from '@/lib/types';

type Scope = { kind: 'all' } | { kind: 'unfiled' } | { kind: 'folder'; id: string };

const api = {
  async json<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) }
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
    return res.json();
  }
};

export default function Workspace({
  initialFolders, initialProjects
}: { initialFolders: FolderRecord[]; initialProjects: ProjectSummary[] }) {
  const router = useRouter();
  const [folders, setFolders] = useState(initialFolders);
  const [projects, setProjects] = useState(initialProjects);
  const [scope, setScope] = useState<Scope>({ kind: 'all' });
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(initialFolders.map(f => [f.id, true])));
  const [query, setQuery] = useState('');
  const [dragging, setDragging] = useState<ProjectSummary | null>(null);
  const [dialog, setDialog] = useState<null | 'new' | 'import'>(null);
  const [busy, setBusy] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const refresh = useCallback(async () => {
    const [f, p] = await Promise.all([
      api.json<FolderRecord[]>('/api/folders'),
      api.json<ProjectSummary[]>('/api/projects')
    ]);
    setFolders(f); setProjects(p);
  }, []);

  const countIn = useCallback((folderId: string): number => {
    const kids = folders.filter(f => f.parentId === folderId).map(f => f.id);
    return projects.filter(p => p.folderId === folderId).length
      + kids.reduce((n, k) => n + countIn(k), 0);
  }, [folders, projects]);

  /* the scope filter includes sub-folders, which is what people expect */
  const inScope = useMemo(() => {
    if (scope.kind === 'all') return () => true;
    if (scope.kind === 'unfiled') return (p: ProjectSummary) => !p.folderId;
    const ids = new Set<string>([scope.id]);
    let added = true;
    while (added) {
      added = false;
      folders.forEach(f => {
        if (f.parentId && ids.has(f.parentId) && !ids.has(f.id)) { ids.add(f.id); added = true; }
      });
    }
    return (p: ProjectSummary) => !!p.folderId && ids.has(p.folderId);
  }, [scope, folders]);

  const visible = projects
    .filter(inScope)
    .filter(p => !query.trim() ||
      `${p.name} ${p.description || ''}`.toLowerCase().includes(query.trim().toLowerCase()));

  const scopeName =
    scope.kind === 'all' ? 'All projects'
    : scope.kind === 'unfiled' ? 'Unfiled'
    : folders.find(f => f.id === scope.id)?.name ?? 'Folder';

  const currentFolderId = scope.kind === 'folder' ? scope.id : null;

  async function onDragEnd(e: DragEndEvent) {
    setDragging(null);
    const projectId = String(e.active.id);
    const target = e.over?.id ? String(e.over.id) : null;
    if (!target) return;
    const folderId = target === 'drop:unfiled' ? null : target.replace('drop:', '');
    const project = projects.find(p => p.id === projectId);
    if (!project || project.folderId === folderId) return;

    setProjects(ps => ps.map(p => (p.id === projectId ? { ...p, folderId } : p)));
    try {
      await api.json(`/api/projects/${projectId}`, { method: 'PATCH', body: JSON.stringify({ folderId }) });
    } catch { refresh(); }
  }

  async function addFolder(parentId: string | null) {
    const name = prompt(parentId ? 'Name of the sub-folder' : 'Name of the folder');
    if (!name?.trim()) return;
    const color = FOLDER_COLORS[folders.length % FOLDER_COLORS.length];
    const f = await api.json<FolderRecord>('/api/folders', {
      method: 'POST', body: JSON.stringify({ name: name.trim(), parentId, color })
    });
    setFolders(list => [...list, f]);
    setOpen(o => ({ ...o, [f.id]: true, ...(parentId ? { [parentId]: true } : {}) }));
  }

  async function renameFolder(f: FolderRecord) {
    const name = prompt('Rename folder', f.name);
    if (!name?.trim() || name === f.name) return;
    await api.json(`/api/folders/${f.id}`, { method: 'PATCH', body: JSON.stringify({ name: name.trim() }) });
    setFolders(list => list.map(x => (x.id === f.id ? { ...x, name: name.trim() } : x)));
  }

  async function removeFolder(f: FolderRecord) {
    if (!confirm(`Delete "${f.name}"?\n\nSub-folders go with it. Projects inside are kept and moved to Unfiled.`)) return;
    await fetch(`/api/folders/${f.id}`, { method: 'DELETE' });
    if (scope.kind === 'folder' && scope.id === f.id) setScope({ kind: 'all' });
    refresh();
  }

  function toggleTheme() {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('studio-theme', next); } catch { /* private mode */ }
  }

  const roots = folders.filter(f => !f.parentId);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e: DragStartEvent) => setDragging(projects.find(p => p.id === String(e.active.id)) || null)}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <div className="shell">
        <aside className="sidebar">
          <div className="sidebar-head">
            <div className="logo"><Icon name="cube" size={17} /></div>
            <div>
              <b>Architecture Studio</b>
              <span>{projects.length} project{projects.length === 1 ? '' : 's'}</span>
            </div>
          </div>

          <div className="sidebar-scroll">
            <ScopeRow icon="grid" label="All projects" count={projects.length}
              active={scope.kind === 'all'} onClick={() => setScope({ kind: 'all' })} />
            <DropRow id="drop:unfiled" active={scope.kind === 'unfiled'}
              onClick={() => setScope({ kind: 'unfiled' })}
              icon="box" label="Unfiled" count={projects.filter(p => !p.folderId).length} />

            <div className="sect-label">
              Folders
              <span className="spacer" />
              <button className="iconbtn" style={{ width: 20, height: 20 }} title="New folder"
                onClick={() => addFolder(null)}><Icon name="plus" size={13} /></button>
            </div>

            {roots.length === 0 && (
              <div style={{ padding: '6px 10px', fontSize: 12, color: 'var(--ink-3)' }}>
                No folder yet. Create one, then drag projects into it.
              </div>
            )}

            {roots.map(f => (
              <FolderBranch
                key={f.id} folder={f} folders={folders} depth={0} open={open}
                setOpen={setOpen} scope={scope} setScope={setScope} countIn={countIn}
                onAddChild={addFolder} onRename={renameFolder} onDelete={removeFolder}
              />
            ))}
          </div>

          <div className="sidebar-foot">
            <button className="iconbtn" onClick={toggleTheme} title="Light / dark">
              <Icon name="moon" size={15} />
            </button>
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Self-hosted · SQLite</span>
          </div>
        </aside>

        <main className="workspace">
          <div className="ws-head">
            <div>
              <h1>{scopeName}</h1>
              <p>{visible.length} project{visible.length === 1 ? '' : 's'}
                {scope.kind === 'folder' ? ' in this folder and its sub-folders' : ''}</p>
            </div>
            <div className="ws-search">
              <Icon name="search" size={14} />
              <input className="input" placeholder="Search projects…" value={query}
                onChange={e => setQuery(e.target.value)} />
            </div>
            <button className="btn" onClick={() => setDialog('import')}>
              <Icon name="upload" size={15} />Import
            </button>
            <button className="btn primary" onClick={() => setDialog('new')}>
              <Icon name="plus" size={15} />New project
            </button>
          </div>

          <div className="ws-body">
            {visible.length === 0 ? (
              <div className="empty">
                {query ? 'No project matches this search.' : 'Nothing here yet — create a project or import one.'}
              </div>
            ) : (
              <div className="pgrid">
                {visible.map(p => (
                  <ProjectCard key={p.id} project={p} folders={folders}
                    onOpen={() => router.push(`/projects/${p.id}`)} onChanged={refresh} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      <DragOverlay dropAnimation={null}>
        {dragging && (
          <div className="pcard" style={{ width: 268, cursor: 'grabbing', boxShadow: 'var(--shadow-lg)' }}>
            <div className="accent" style={{ background: `color-mix(in srgb, ${dragging.accent || '#28519F'} 15%, transparent)` }}>
              <Icon name="cube" size={14} style={{ stroke: dragging.accent || '#28519F' }} />
            </div>
            <b>{dragging.name}</b>
          </div>
        )}
      </DragOverlay>

      {dialog === 'new' && (
        <NewProjectDialog
          folderId={currentFolderId} busy={busy} setBusy={setBusy}
          onClose={() => setDialog(null)}
          onCreated={id => router.push(`/projects/${id}`)}
        />
      )}
      {dialog === 'import' && (
        <ImportDialog
          folderId={currentFolderId} busy={busy} setBusy={setBusy}
          onClose={() => setDialog(null)}
          onCreated={id => router.push(`/projects/${id}`)}
        />
      )}
    </DndContext>
  );
}

/* ------------------------------------------------------------------ sidebar */

function ScopeRow({ icon, label, count, active, onClick }: {
  icon: string; label: string; count: number; active: boolean; onClick: () => void;
}) {
  return (
    <div className={`tree-row${active ? ' active' : ''}`} onClick={onClick}>
      <span style={{ width: 14 }} />
      <span className="ficon"><Icon name={icon} size={15} /></span>
      <span className="label">{label}</span>
      <span className="count">{count}</span>
    </div>
  );
}

function DropRow(props: {
  id: string; icon: string; label: string; count: number; active: boolean; onClick: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: props.id });
  return (
    <div ref={setNodeRef} className={`tree-row${props.active ? ' active' : ''}${isOver ? ' over' : ''}`}
      onClick={props.onClick}>
      <span style={{ width: 14 }} />
      <span className="ficon"><Icon name={props.icon} size={15} /></span>
      <span className="label">{props.label}</span>
      <span className="count">{props.count}</span>
    </div>
  );
}

function FolderBranch({
  folder, folders, depth, open, setOpen, scope, setScope, countIn, onAddChild, onRename, onDelete
}: {
  folder: FolderRecord; folders: FolderRecord[]; depth: number;
  open: Record<string, boolean>; setOpen: (fn: (o: Record<string, boolean>) => Record<string, boolean>) => void;
  scope: Scope; setScope: (s: Scope) => void; countIn: (id: string) => number;
  onAddChild: (parentId: string) => void; onRename: (f: FolderRecord) => void; onDelete: (f: FolderRecord) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `drop:${folder.id}` });
  const children = folders.filter(f => f.parentId === folder.id);
  const isOpen = open[folder.id] !== false;
  const active = scope.kind === 'folder' && scope.id === folder.id;

  return (
    <>
      <div ref={setNodeRef}
        className={`tree-row${active ? ' active' : ''}${isOver ? ' over' : ''}`}
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={() => setScope({ kind: 'folder', id: folder.id })}>
        {children.length > 0 ? (
          <span className={`caret${isOpen ? ' open' : ''}`}
            onClick={e => { e.stopPropagation(); setOpen(o => ({ ...o, [folder.id]: !isOpen })); }}>
            <Icon name="chevron" size={13} />
          </span>
        ) : <span style={{ width: 14 }} />}
        <span className="ficon" style={{ color: folder.color || undefined }}>
          <Icon name="folder" size={15} />
        </span>
        <span className="label">{folder.name}</span>
        <span className="rowbtns" onClick={e => e.stopPropagation()}>
          <button title="New sub-folder" onClick={() => onAddChild(folder.id)}><Icon name="plus" size={13} /></button>
          <button title="Rename" onClick={() => onRename(folder)}><Icon name="cog" size={13} /></button>
          <button title="Delete" onClick={() => onDelete(folder)}><Icon name="trash" size={13} /></button>
        </span>
        <span className="count">{countIn(folder.id)}</span>
      </div>
      {isOpen && children.map(c => (
        <FolderBranch key={c.id} folder={c} folders={folders} depth={depth + 1} open={open}
          setOpen={setOpen} scope={scope} setScope={setScope} countIn={countIn}
          onAddChild={onAddChild} onRename={onRename} onDelete={onDelete} />
      ))}
    </>
  );
}

/* --------------------------------------------------------------- project card */

function ProjectCard({ project, folders, onOpen, onChanged }: {
  project: ProjectSummary; folders: FolderRecord[]; onOpen: () => void; onChanged: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: project.id });
  const [menu, setMenu] = useState(false);
  const accent = project.accent || '#28519F';
  const folder = folders.find(f => f.id === project.folderId);

  return (
    <div ref={setNodeRef} {...listeners} {...attributes}
      className={`pcard${isDragging ? ' dragging' : ''}`}
      onClick={() => !menu && onOpen()}>
      <div className="accent" style={{ background: `color-mix(in srgb, ${accent} 15%, transparent)` }}>
        <Icon name="cube" size={14} style={{ stroke: accent }} />
      </div>
      <b>{project.name}</b>
      {project.description && <p>{project.description}</p>}
      <div className="foot">
        <span>{project.componentCount} component{project.componentCount === 1 ? '' : 's'}</span>
        {folder && <span>· {folder.name}</span>}
        <span style={{ marginLeft: 'auto' }}>{project.updatedAt.slice(0, 10)}</span>
      </div>

      <div className="menu" onClick={e => e.stopPropagation()}>
        <button className="iconbtn" onClick={() => setMenu(m => !m)} aria-label="Actions">
          <Icon name="dots" size={15} />
        </button>
        {menu && (
          <div className="menu-pop" onMouseLeave={() => setMenu(false)}>
            <button onClick={onOpen}><Icon name="external" size={14} />Open editor</button>
            <button onClick={() => window.open(`/api/projects/${project.id}/export?format=html`, '_blank')}>
              <Icon name="download" size={14} />Download HTML
            </button>
            <button onClick={() => window.open(`/api/projects/${project.id}/export?format=json`, '_blank')}>
              <Icon name="download" size={14} />Download JSON
            </button>
            <button onClick={async () => {
              await fetch(`/api/projects/${project.id}`, { method: 'POST' });
              setMenu(false); onChanged();
            }}><Icon name="copy" size={14} />Duplicate</button>
            <hr />
            <button className="danger" onClick={async () => {
              if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
              await fetch(`/api/projects/${project.id}`, { method: 'DELETE' });
              setMenu(false); onChanged();
            }}><Icon name="trash" size={14} />Delete</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ dialogs */

function NewProjectDialog({ folderId, busy, setBusy, onClose, onCreated }: {
  folderId: string | null; busy: boolean; setBusy: (b: boolean) => void;
  onClose: () => void; onCreated: (id: string) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  async function submit() {
    if (!name.trim()) { setError('Give it a name first.'); return; }
    setBusy(true); setError('');
    try {
      const p = await api.json<{ id: string }>('/api/projects', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined, folderId })
      });
      onCreated(p.id);
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>New project</h2>
        <p className="lede">Starts with two scopes and four layers — rename them as you go.</p>
        <label className="field"><span>Name</span>
          <input className="input" autoFocus value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()} placeholder="Payments platform" />
        </label>
        <label className="field"><span>Description (optional)</span>
          <input className="input" value={description} onChange={e => setDescription(e.target.value)}
            placeholder="What this system does, in one line" />
        </label>
        {error && <div className="err">{error}</div>}
        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={submit} disabled={busy}>
            {busy ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ImportDialog({ folderId, busy, setBusy, onClose, onCreated }: {
  folderId: string | null; busy: boolean; setBusy: (b: boolean) => void;
  onClose: () => void; onCreated: (id: string) => void;
}) {
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  async function submit() {
    if (!text.trim()) { setError('Paste a file or choose one first.'); return; }
    setBusy(true); setError('');
    try {
      const p = await api.json<{ id: string }>('/api/projects/import', {
        method: 'POST', body: JSON.stringify({ text, name: name.trim() || undefined, folderId })
      });
      onCreated(p.id);
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>Import an architecture</h2>
        <p className="lede">
          Accepts a JSON document, or an <code>architecture.js</code> data file from the
          standalone viewer.
        </p>
        <label className="field"><span>File</span>
          <input className="input" type="file" accept=".json,.js,.txt"
            onChange={async e => {
              const f = e.target.files?.[0];
              if (!f) return;
              setText(await f.text());
              if (!name) setName(f.name.replace(/\.(json|js|txt)$/i, ''));
            }} />
        </label>
        <label className="field"><span>…or paste it</span>
          <textarea className="textarea" style={{ minHeight: 140, fontFamily: 'ui-monospace, monospace', fontSize: 12 }}
            value={text} onChange={e => setText(e.target.value)}
            placeholder={'{ "meta": { … }, "components": [ … ] }'} />
        </label>
        <label className="field"><span>Project name (optional)</span>
          <input className="input" value={name} onChange={e => setName(e.target.value)}
            placeholder="Taken from the document if left empty" />
        </label>
        {error && <div className="err">{error}</div>}
        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={submit} disabled={busy}>
            {busy ? 'Importing…' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}
