'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable, type DragEndEvent, type DragStartEvent
} from '@dnd-kit/core';
import { Icon } from './Icon';
import Inspector from './Inspector';
import ContentEditor from './ContentEditor';
import History from './History';
import { EnrichDialog, useAiStatus } from './Analyse';
import { PALETTE, PALETTE_DARK, slugify } from '@/lib/defaults';
import { dashFor, kindsInUse, LINK_DASH, LINK_KIND_LABELS, linkOf } from '@/lib/links';
import type { Architecture, Component, ProjectWithData } from '@/lib/types';

type SaveState = 'saved' | 'dirty' | 'saving' | 'error';
type Mode = 'edit' | 'content' | 'preview';

export default function Editor({ project }: { project: ProjectWithData }) {
  const router = useRouter();
  const [doc, setDoc] = useState<Architecture>(project.data);
  const [name, setName] = useState(project.name);
  const [save, setSave] = useState<SaveState>('saved');
  const [selected, setSelected] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('edit');
  const [dragId, setDragId] = useState<string | null>(null);
  const [link, setLink] = useState<{ from: string; x: number; y: number } | null>(null);
  const [hoverTarget, setHoverTarget] = useState<string | null>(null);
  const [history, setHistory] = useState(false);
  const [enrich, setEnrich] = useState(false);
  const ai = useAiStatus();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const first = useRef(true);

  /* A project just created from a template opens with its first component
   * selected, so the inspector shows immediately what can be changed. The flag
   * is dropped from the URL so a reload does not re-select. */
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('new') !== '1') return;
    setSelected(project.data.components[0]?.id ?? null);
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

  /* ------------------------------------------------------------ mutations */
  const addComponent = useCallback((layerId: string, index?: number) => {
    const id = slugify('component', doc.components.map(c => c.id));
    const comp: Component = {
      id, name: 'New component', group: doc.groups[0].id, layer: layerId,
      icon: 'box', tech: [], features: [], notes: [], deps: []
    };
    patch(d => {
      const list = [...d.components];
      list.splice(index ?? list.length, 0, comp);
      d.components = list;
      return d;
    });
    setSelected(id);
    return id;
  }, [doc.components, doc.groups, patch]);

  const moveComponent = useCallback((id: string, layerId: string, beforeId?: string) => {
    patch(d => {
      const i = d.components.findIndex(c => c.id === id);
      if (i < 0) return d;
      const [comp] = d.components.splice(i, 1);
      comp.layer = layerId;
      const at = beforeId ? d.components.findIndex(c => c.id === beforeId) : -1;
      if (at >= 0) d.components.splice(at, 0, comp);
      else d.components.push(comp);
      return d;
    });
  }, [patch]);

  const addDep = useCallback((from: string, to: string) => {
    if (from === to) return;
    patch(d => {
      const c = d.components.find(x => x.id === from);
      if (!c) return d;
      c.deps = c.deps || [];
      if (c.deps.includes(to)) c.deps = c.deps.filter(x => x !== to);   /* click again to remove */
      else c.deps.push(to);
      return d;
    });
  }, [patch]);

  /* -------------------------------------------------------------- linking */
  useEffect(() => {
    if (!link) return;
    const move = (e: PointerEvent) => {
      setLink(l => (l ? { ...l, x: e.clientX, y: e.clientY } : l));
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const card = el?.closest('[data-comp]') as HTMLElement | null;
      const id = card?.dataset.comp || null;
      setHoverTarget(id && id !== link.from ? id : null);
    };
    const up = (e: PointerEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const card = el?.closest('[data-comp]') as HTMLElement | null;
      if (card?.dataset.comp) addDep(link.from, card.dataset.comp);
      setLink(null); setHoverTarget(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up, { once: true });
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }, [link, addDep]);

  /* ----------------------------------------------------------------- dnd */
  function onDragEnd(e: DragEndEvent) {
    setDragId(null);
    const active = String(e.active.id);
    const over = e.over ? String(e.over.id) : null;
    if (!over) return;

    const targetLayer = over.startsWith('layer:')
      ? over.slice(6)
      : doc.components.find(c => c.id === over)?.layer;
    if (!targetLayer) return;
    const beforeId = over.startsWith('layer:') ? undefined : over;

    if (active === 'palette:new') {
      const idx = beforeId ? doc.components.findIndex(c => c.id === beforeId) : undefined;
      addComponent(targetLayer, idx);
      return;
    }
    if (active !== beforeId) moveComponent(active, targetLayer, beforeId);
  }

  const selectedComp = doc.components.find(c => c.id === selected) || null;
  const groupColor = useCallback((gid: string) => {
    const i = doc.groups.findIndex(g => g.id === gid);
    const g = doc.groups[i] || doc.groups[0];
    return { light: g?.color || PALETTE[i % PALETTE.length], dark: g?.colorDark || PALETTE_DARK[i % PALETTE_DARK.length] };
  }, [doc.groups]);

  return (
    <DndContext sensors={sensors}
      onDragStart={(e: DragStartEvent) => setDragId(String(e.active.id))}
      onDragEnd={onDragEnd} onDragCancel={() => setDragId(null)}>
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
            <ContentEditor doc={doc} patch={patch} />
          ) : (
            <div className="editor-body">
              <Palette doc={doc} patch={patch} onAdd={() => addComponent(doc.layers[0].id)} />

              <div className="canvas-wrap">
                <Canvas
                  doc={doc} selected={selected} setSelected={setSelected}
                  hoverTarget={hoverTarget} linking={!!link}
                  onStartLink={(id, x, y) => setLink({ from: id, x, y })}
                  groupColor={groupColor} patch={patch}
                />
              </div>

              <Inspector
                doc={doc} patch={patch} component={selectedComp}
                onClose={() => setSelected(null)} onSelect={setSelected}
              />
            </div>
          )}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {dragId && dragId !== 'palette:new' && (() => {
          const c = doc.components.find(x => x.id === dragId);
          if (!c) return null;
          return (
            <div className="ccard" style={{ ['--c' as string]: groupColor(c.group).light, cursor: 'grabbing', boxShadow: 'var(--shadow-lg)' }}>
              <div className="nh"><span className="ic"><Icon name={c.icon || 'box'} size={13} /></span>
                <span className="nm">{c.name}</span></div>
            </div>
          );
        })()}
        {dragId === 'palette:new' && (
          <div className="palette-item" style={{ background: 'var(--panel)', cursor: 'grabbing' }}>
            <Icon name="plus" size={14} />New component
          </div>
        )}
      </DragOverlay>

      {link && <LinkLine link={link} />}

      {history && (
        <History projectId={project.id} doc={doc} dirty={save !== 'saved'}
          onClose={() => setHistory(false)}
          onRestore={data => {
            /* The restore already wrote the document server-side. Adopting it
             * here keeps the canvas, the inspector and the preview in step —
             * the autosave that follows is a no-op against what is on disk. */
            setDoc(data);
            setSelected(s => (data.components.some(c => c.id === s) ? s : null));
          }} />
      )}

      {enrich && (
        <EnrichDialog projectId={project.id} doc={doc}
          onClose={() => setEnrich(false)}
          onApply={merged => {
            /* Adopted like a restore: the dialog has already checkpointed the
             * document, and the autosave that follows this state change is the
             * one and only write. */
            setDoc(merged);
            setEnrich(false);
          }} />
      )}
    </DndContext>
  );
}

/* ------------------------------------------------------------------ pieces */

function SaveFlag({ state }: { state: SaveState }) {
  const label = { saved: 'Saved', dirty: 'Editing…', saving: 'Saving…', error: 'Not saved' }[state];
  return (
    <span className={`saveflag${state === 'dirty' || state === 'saving' ? ' dirty' : ''}${state === 'error' ? ' error' : ''}`}>
      <i />{label}
    </span>
  );
}

function LinkLine({ link }: { link: { from: string; x: number; y: number } }) {
  const src = document.querySelector(`[data-comp="${CSS.escape(link.from)}"]`);
  if (!src) return null;
  const r = src.getBoundingClientRect();
  const x1 = r.left + r.width / 2, y1 = r.bottom;
  return (
    /* The edge you are dragging, in the grammar it will settle into: you are
       holding the caller, and the open end is looking for something to answer. */
    <svg className="linkline">
      <path d={`M${x1},${y1} C${x1},${y1 + 40} ${link.x},${link.y - 40} ${link.x},${link.y}`}
        fill="none" stroke="var(--brand)" strokeWidth="2" strokeDasharray="4 4" strokeLinecap="round" />
      <circle cx={x1} cy={y1} r="4" fill="var(--brand)" />
      <circle cx={link.x} cy={link.y} r="3.5" style={{ fill: 'var(--panel)' }}
        stroke="var(--brand)" strokeWidth="2" />
    </svg>
  );
}

/* One dependency, drawn the way the mark draws it: a filled disc where the
 * caller is, an open circle where the callee answers. The direction of an
 * edge is the only thing a curve cannot say by itself, and an arrowhead in a
 * diagram this dense turns into lint — this reads at a glance and survives
 * printing at 67 %.
 *
 * The stroke carries the second question: `dash` is empty for a synchronous or
 * unannotated call, and breaks the line for one that is queued or batched. It
 * is the stroke and not the colour because colour already means scope, and a
 * dash still reads in monochrome. The endpoints stay solid — direction must
 * not get quieter just because the call is asynchronous.
 *
 * The group is faded as a unit rather than per shape: compositing the group
 * first is what lets the open circle's paper fill still punch through the
 * line inside it, which is the whole point of the open circle.
 *
 * Kept in step with `drawEdges` in viewer/engine.js and `PaperDiagram` in the
 * document renderer — three surfaces, one grammar, one table in lib/links.ts. */
function edgeGlyph(
  x1: number, y1: number, k1: number, x2: number, y2: number, k2: number,
  colour: string, opacity: number, width: number, dash = ''
) {
  return `<g opacity="${opacity}">`
    + `<path d="M${x1},${y1} C${x1},${y1 + k1} ${x2},${y2 + k2} ${x2},${y2}" fill="none" `
    + `stroke="${colour}" stroke-width="${width}" stroke-linecap="round"`
    + `${dash ? ` stroke-dasharray="${dash}"` : ''}/>`
    + `<circle cx="${x1}" cy="${y1}" r="3.5" fill="${colour}"/>`
    + `<circle cx="${x2}" cy="${y2}" r="3" style="fill:var(--panel)" stroke="${colour}" stroke-width="1.5"/>`
    + `</g>`;
}

/* -------------------------------------------------------------------- canvas */

function Canvas({ doc, selected, setSelected, hoverTarget, linking, onStartLink, groupColor, patch }: {
  doc: Architecture; selected: string | null; setSelected: (id: string | null) => void;
  hoverTarget: string | null; linking: boolean;
  onStartLink: (id: string, x: number, y: number) => void;
  groupColor: (id: string) => { light: string; dark: string };
  patch: (fn: (d: Architecture) => Architecture) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState<string>('');

  const draw = useCallback(() => {
    const host = ref.current;
    if (!host) return;
    const box = host.getBoundingClientRect();
    const index = Object.fromEntries(doc.layers.map((l, i) => [l.id, i]));
    const byId = Object.fromEntries(doc.components.map(c => [c.id, c]));
    let out = '';
    doc.components.forEach(c => (c.deps || []).forEach(dep => {
      const a = host.querySelector(`[data-comp="${CSS.escape(c.id)}"]`);
      const b = host.querySelector(`[data-comp="${CSS.escape(dep)}"]`);
      if (!a || !b || !byId[dep]) return;
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      const x1 = ra.left - box.left + ra.width / 2;
      const x2 = rb.left - box.left + rb.width / 2;
      const la = index[c.layer], lb = index[byId[dep].layer];
      let y1: number, y2: number, k1: number, k2: number;
      if (la === lb) {
        y1 = ra.bottom - box.top; y2 = rb.bottom - box.top; k1 = 30; k2 = 30;
      } else {
        const up = la > lb;
        y1 = (up ? ra.top : ra.bottom) - box.top;
        y2 = (up ? rb.bottom : rb.top) - box.top;
        const k = (up ? -1 : 1) * Math.max(24, Math.abs(y2 - y1) * .5);
        k1 = k; k2 = -k;
      }
      const active = selected === c.id || selected === dep;
      const colour = groupColor(c.group).light;
      out += edgeGlyph(x1, y1, k1, x2, y2, k2, colour, active ? 1 : .34, active ? 2 : 1.2,
        dashFor(linkOf(c, dep)?.kind));
    }));
    setEdges(out);
  }, [doc, selected, groupColor]);

  useLayoutEffect(() => { draw(); }, [draw]);
  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(host);
    window.addEventListener('resize', draw);
    return () => { ro.disconnect(); window.removeEventListener('resize', draw); };
  }, [draw]);

  return (
    <div className={`canvas${linking ? ' linking' : ''}`} ref={ref}
      onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
      <svg className="canvas-edges" dangerouslySetInnerHTML={{ __html: edges }} />
      {doc.layers.map(layer => (
        <LayerRow key={layer.id} layer={layer} doc={doc} patch={patch}
          selected={selected} setSelected={setSelected} hoverTarget={hoverTarget}
          onStartLink={onStartLink} groupColor={groupColor} />
      ))}
    </div>
  );
}

function LayerRow({ layer, doc, patch, selected, setSelected, hoverTarget, onStartLink, groupColor }: {
  layer: { id: string; name: string; desc?: string };
  doc: Architecture; patch: (fn: (d: Architecture) => Architecture) => void;
  selected: string | null; setSelected: (id: string | null) => void; hoverTarget: string | null;
  onStartLink: (id: string, x: number, y: number) => void;
  groupColor: (id: string) => { light: string; dark: string };
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `layer:${layer.id}` });
  const items = doc.components.filter(c => c.layer === layer.id);

  return (
    <div className={`layer${isOver ? ' over' : ''}`}>
      <div className="layer-head">
        <b>{layer.name}</b>
        {layer.desc && <em>{layer.desc}</em>}
        <span className="layer-tools">
          <button className="iconbtn" style={{ width: 24, height: 24 }} title="Rename layer"
            onClick={() => {
              const name = prompt('Layer name', layer.name);
              if (name?.trim()) patch(d => {
                const l = d.layers.find(x => x.id === layer.id); if (l) l.name = name.trim(); return d;
              });
            }}><Icon name="cog" size={13} /></button>
          <button className="iconbtn" style={{ width: 24, height: 24 }} title="Delete layer"
            onClick={() => {
              if (doc.layers.length <= 1) { alert('Keep at least one layer.'); return; }
              if (items.length && !confirm(`Delete "${layer.name}"? Its ${items.length} component(s) move to "${doc.layers[0].name}".`)) return;
              patch(d => {
                const fallback = d.layers.find(l => l.id !== layer.id)!.id;
                d.components.forEach(c => { if (c.layer === layer.id) c.layer = fallback; });
                d.layers = d.layers.filter(l => l.id !== layer.id);
                return d;
              });
            }}><Icon name="trash" size={13} /></button>
        </span>
      </div>
      <div ref={setNodeRef} className={`layer-drop${items.length ? '' : ' empty-hint'}`}>
        {items.length === 0 && 'Drop a component here'}
        {items.map(c => (
          <ComponentCard key={c.id} comp={c} colour={groupColor(c.group).light}
            selected={selected === c.id} isLinkTarget={hoverTarget === c.id}
            onSelect={() => setSelected(c.id)} onStartLink={onStartLink} />
        ))}
      </div>
    </div>
  );
}

function ComponentCard({ comp, colour, selected, isLinkTarget, onSelect, onStartLink }: {
  comp: Component; colour: string; selected: boolean; isLinkTarget: boolean;
  onSelect: () => void; onStartLink: (id: string, x: number, y: number) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: comp.id });
  const { setNodeRef: dropRef } = useDroppable({ id: comp.id });

  return (
    <div
      ref={node => { setNodeRef(node); dropRef(node); }}
      {...listeners} {...attributes}
      data-comp={comp.id}
      className={`ccard${selected ? ' selected' : ''}${isDragging ? ' dragging' : ''}${isLinkTarget ? ' linktarget' : ''}`}
      style={{ ['--c' as string]: colour }}
      onClick={e => { e.stopPropagation(); onSelect(); }}
    >
      {comp.badge && <span className="badge">{comp.badge}</span>}
      <div className="nh">
        <span className="ic"><Icon name={comp.icon || 'box'} size={13} /></span>
        <span className="nm">{comp.name}</span>
      </div>
      {!!comp.tech?.length && (
        <div className="tech">{comp.tech.slice(0, 3).map(t => <span key={t}>{t}</span>)}</div>
      )}
      {!!comp.deps?.length && <span className="depcount">{comp.deps.length} →</span>}
      <span
        className="linkdot" title="Drag onto another component to create a dependency"
        onPointerDown={e => {
          e.stopPropagation(); e.preventDefault();
          onStartLink(comp.id, e.clientX, e.clientY);
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ palette */

function Palette({ doc, patch, onAdd }: {
  doc: Architecture; patch: (fn: (d: Architecture) => Architecture) => void; onAdd: () => void;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: 'palette:new' });

  return (
    <aside className="palette">
      <div className="sect-label">Add</div>
      <div ref={setNodeRef} {...listeners} {...attributes} className="palette-item">
        <Icon name="plus" size={14} />Drag me into a layer
      </div>
      <button className="btn sm" style={{ width: '100%', justifyContent: 'center' }} onClick={onAdd}>
        Add to first layer
      </button>

      <div className="sect-label">
        Scopes<span className="spacer" />
        <button className="iconbtn" style={{ width: 20, height: 20 }} title="Add scope"
          onClick={() => {
            /* Derived from the palette, not typed as a literal: there are five
             * hues, and a sixth scope would be handed `PALETTE[0]` again —
             * two scopes with one colour, which is the thing the palette is
             * built to prevent. */
            if (doc.groups.length >= PALETTE.length) {
              alert(`${PALETTE.length} scopes is the maximum — a sixth would reuse the first colour.`);
              return;
            }
            const name = prompt('Scope name');
            if (!name?.trim()) return;
            patch(d => {
              const i = d.groups.length;
              d.groups.push({
                id: slugify(name, d.groups.map(g => g.id)), name: name.trim(), short: name.trim(),
                color: PALETTE[i % PALETTE.length], colorDark: PALETTE_DARK[i % PALETTE_DARK.length]
              });
              return d;
            });
          }}><Icon name="plus" size={13} /></button>
      </div>
      {doc.groups.map((g, i) => (
        <div className="grouprow" key={g.id}>
          <input type="color" className="swatch" value={g.color || PALETTE[i % PALETTE.length]}
            title="Scope colour"
            onChange={e => patch(d => { const x = d.groups.find(y => y.id === g.id); if (x) x.color = e.target.value; return d; })} />
          <input value={g.name}
            onChange={e => patch(d => { const x = d.groups.find(y => y.id === g.id); if (x) { x.name = e.target.value; x.short = e.target.value; } return d; })} />
          {doc.groups.length > 1 && (
            <button className="iconbtn" style={{ width: 22, height: 22 }} title="Delete scope"
              onClick={() => {
                const used = doc.components.filter(c => c.group === g.id).length;
                if (used && !confirm(`${used} component(s) use this scope. They will move to "${doc.groups.find(x => x.id !== g.id)!.name}".`)) return;
                patch(d => {
                  const fallback = d.groups.find(x => x.id !== g.id)!.id;
                  d.components.forEach(c => { if (c.group === g.id) c.group = fallback; });
                  d.groups = d.groups.filter(x => x.id !== g.id);
                  return d;
                });
              }}><Icon name="trash" size={12} /></button>
          )}
        </div>
      ))}

      <div className="sect-label">
        Layers<span className="spacer" />
        <button className="iconbtn" style={{ width: 20, height: 20 }} title="Add layer"
          onClick={() => {
            const name = prompt('Layer name');
            if (!name?.trim()) return;
            patch(d => {
              d.layers.push({ id: slugify(name, d.layers.map(l => l.id)), name: name.trim() });
              return d;
            });
          }}><Icon name="plus" size={13} /></button>
      </div>
      {doc.layers.map((l, i) => (
        <div className="grouprow" key={l.id}>
          <input value={l.name}
            onChange={e => patch(d => { const x = d.layers.find(y => y.id === l.id); if (x) x.name = e.target.value; return d; })} />
          <button className="iconbtn" style={{ width: 22, height: 22 }} disabled={i === 0} title="Move up"
            onClick={() => patch(d => {
              const arr = d.layers; [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; return d;
            })}><Icon name="chevron" size={12} style={{ transform: 'rotate(-90deg)' }} /></button>
          <button className="iconbtn" style={{ width: 22, height: 22 }} disabled={i === doc.layers.length - 1} title="Move down"
            onClick={() => patch(d => {
              const arr = d.layers; [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; return d;
            })}><Icon name="chevron" size={12} style={{ transform: 'rotate(90deg)' }} /></button>
        </div>
      ))}

      <EdgeLegend doc={doc} />
    </aside>
  );
}

/* Only drawn once the document actually annotates an edge. A legend explaining
 * three line styles on a diagram that uses one is furniture. */
function EdgeLegend({ doc }: { doc: Architecture }) {
  const kinds = kindsInUse(doc.components);
  if (!kinds.length) return null;

  return (
    <>
      <div className="sect-label">Dependencies</div>
      <div className="edgekey">
        {kinds.map(k => (
          <span key={k}>
            <svg viewBox="0 0 34 8" aria-hidden="true">
              <path d="M1 4h32" fill="none" stroke="currentColor" strokeWidth="1.6"
                strokeLinecap="round" strokeDasharray={LINK_DASH[k] || undefined} />
            </svg>
            {LINK_KIND_LABELS[k].en}
          </span>
        ))}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ preview */

function PreviewPane({ projectId, version, saveState }: {
  projectId: string; version: Architecture; saveState: SaveState;
}) {
  const [src, setSrc] = useState('');
  const key = useMemo(() => JSON.stringify(version).length + ':' + saveState, [version, saveState]);

  useEffect(() => {
    /* wait for the autosave to land, then render the real export */
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
