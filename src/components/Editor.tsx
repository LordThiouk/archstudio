'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from './Icon';
import ArchitectureDiagramSurface from './ArchitectureDiagramSurface';
import ContentEditor from './ContentEditor';
import History from './History';
import { EnrichDialog, useAiStatus } from './Analyse';
import { loadLegoCatalog } from '@/lib/lego/client';
import type { LegoCatalogSnapshot } from '@/lib/lego/types';
import type { Architecture, ProjectWithData } from '@/lib/types';

type SaveState = 'saved' | 'dirty' | 'saving' | 'error';
type Mode = 'edit' | 'content' | 'preview';

export default function Editor({ project }: { project: ProjectWithData }) {
  const router = useRouter();
  const [doc, setDoc] = useState<Architecture>(project.data);
  const [name, setName] = useState(project.name);
  const [save, setSave] = useState<SaveState>('saved');
  const [mode, setMode] = useState<Mode>('edit');
  const [history, setHistory] = useState(false);
  const [enrich, setEnrich] = useState(false);
  const [catalog, setCatalog] = useState<LegoCatalogSnapshot | null>(null);
  const ai = useAiStatus();

  const first = useRef(true);
  const [initialSelected, setInitialSelected] = useState<string | null>(null);

  useEffect(() => {
    loadLegoCatalog(doc.meta.lang === 'fr' ? 'fr' : 'en').then(setCatalog).catch(() => setCatalog(null));
  }, [doc.meta.lang]);

  /* A project just created from a template opens with its first component
   * selected, so the inspector shows immediately what can be changed. The flag
   * is dropped from the URL so a reload does not re-select. */
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('new') !== '1') return;
    setInitialSelected(project.data.components[0]?.id ?? null);
    window.history.replaceState(null, '', `/projects/${project.id}`);
  }, [project.id, project.data.components]);

  /* ------------------------------------------------------------- autosave */
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setSave('dirty');
    const t = setTimeout(async () => {
      setSave('saving');
      try {
        const res = await fetch(`/api/projects/${project.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: doc, name })
        });
        setSave(res.ok ? 'saved' : 'error');
      } catch { setSave('error'); }
    }, 700);
    return () => clearTimeout(t);
  }, [doc, name, project.id]);

  /* warn before losing an unsaved edit */
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (save !== 'saved') e.preventDefault(); };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [save]);

  const patch = useCallback((fn: (d: Architecture) => Architecture) => {
    setDoc(d => fn(structuredClone(d)));
  }, []);

  return (
    <div className="shell">
      <div className="editor">
        <div className="topbar">
          <button className="iconbtn" onClick={() => router.push('/')} title="Back to projects">
            <Icon name="back" size={16} />
          </button>
          <input className="name" value={name} onChange={e => setName(e.target.value)}
            aria-label="Project name" />
          <SaveFlag state={save} />

          <div style={{ flex: 1 }} />

          <div className="segmented">
            <button aria-pressed={mode === 'edit'} onClick={() => setMode('edit')}>Diagram</button>
            <button aria-pressed={mode === 'content'} onClick={() => setMode('content')}>Content</button>
            <button aria-pressed={mode === 'preview'} onClick={() => setMode('preview')}>Preview</button>
          </div>

          {ai?.enabled && (
            <button className="btn" onClick={() => setEnrich(true)}
              title="Read a document against this project and add what it is missing">
              <Icon name="ai" size={15} />Enrich
            </button>
          )}

          <button className="btn" onClick={() => setHistory(true)}
            title="Earlier versions, and what changed since each one">
            <Icon name="clock" size={15} />History
          </button>

          <a className="btn" href={`/projects/${project.id}/document`} target="_blank" rel="noreferrer"
            title="The same document, linear and numbered — print it to PDF from there">
            <Icon name="file" size={15} />Document
          </a>
          <a className="btn" href={`/api/projects/${project.id}/export?format=html`}>
            <Icon name="download" size={15} />HTML
          </a>
          <a className="btn" href={`/api/projects/${project.id}/export?format=json`}>
            <Icon name="download" size={15} />JSON
          </a>
        </div>

        {mode === 'preview' ? (
          <PreviewPane projectId={project.id} version={doc} saveState={save} />
        ) : mode === 'content' ? (
          <ContentEditor doc={doc} patch={patch} catalog={catalog} />
        ) : (
          <ArchitectureDiagramSurface
            key={initialSelected ?? 'diagram'}
            doc={doc}
            patch={patch}
            initialSelected={initialSelected}
          />
        )}
      </div>

      {history && (
        <History projectId={project.id} doc={doc} dirty={save !== 'saved'}
          onClose={() => setHistory(false)}
          onRestore={data => {
            setDoc(data);
          }} />
      )}

      {enrich && (
        <EnrichDialog projectId={project.id} doc={doc}
          onClose={() => setEnrich(false)}
          onApply={merged => {
            setDoc(merged);
            setEnrich(false);
          }} />
      )}
    </div>
  );
}

function SaveFlag({ state }: { state: SaveState }) {
  const label = { saved: 'Saved', dirty: 'Editing…', saving: 'Saving…', error: 'Not saved' }[state];
  return (
    <span className={`saveflag${state === 'dirty' || state === 'saving' ? ' dirty' : ''}${state === 'error' ? ' error' : ''}`}>
      <i />{label}
    </span>
  );
}

function PreviewPane({ projectId, version, saveState }: {
  projectId: string; version: Architecture; saveState: SaveState;
}) {
  const [src, setSrc] = useState('');
  const key = useMemo(() => JSON.stringify(version).length + ':' + saveState, [version, saveState]);

  useEffect(() => {
    if (saveState !== 'saved') return;
    let alive = true;
    fetch(`/api/projects/${projectId}/export?format=html&inline=1`)
      .then(r => r.text())
      .then(html => { if (alive) setSrc(html); });
    return () => { alive = false; };
  }, [projectId, key, saveState]);

  if (saveState !== 'saved' && !src) {
    return <div className="empty">Saving your last change…</div>;
  }
  return <iframe className="previewframe" srcDoc={src} title="Preview" sandbox="allow-scripts allow-popups" />;
}
