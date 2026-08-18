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
import PlacementWizard from './editors/PlacementWizard';
import { EnrichDialog, useAiStatus } from './Analyse';
import { PALETTE, PALETTE_DARK, slugify } from '@/lib/defaults';
import { displayLayerLabel } from '@/lib/layers';
import { ensurePlacementScaffold, componentBrick } from '@/lib/lego/place';
import { syncTechnologies } from '@/lib/lego/stack';
import { loadLegoCatalog } from '@/lib/lego/client';
import { addSuggestedDependency, matchesSuggestionTarget, matchingDependencyTarget, visibleDependencies } from '@/lib/lego/dependencies';
import type { LegoCatalogSnapshot, LegoDependencySuggestion } from '@/lib/lego/types';
import {
  dashFor, describeLink, edgeLabelSvg, edgePlateText, kindsInUse, LINK_DASH, LINK_KIND_LABELS,
  linkOf, protocolConvention, protocolNote
} from '@/lib/links';
import {
  edgeOpacity, edgeStroke, STATE_LABELS, STATE_SIGN, stateTick, statesInUse
} from '@/lib/lifecycle';
import { MARK_BLURBS, MARK_ICON, MARK_LABELS, marksInUse } from '@/lib/marks';
import {
  describeZone, inflatedUnion, layerRuns, withDescendants, zoneDepth, zonePad, zoneSvg,
  zonesInUse, ZONE_KINDS, ZONE_KIND_BLURBS, ZONE_KIND_LABELS, type Box, type ZoneKind
} from '@/lib/zones';
import { protocolLabel, suggestedLinkForBrick } from '@/lib/lego/protocols';
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
  const [catalog, setCatalog] = useState<LegoCatalogSnapshot | null>(null);
  const [placementRequest, setPlacementRequest] = useState<{ callerId?: string; suggestion?: LegoDependencySuggestion } | null>(null);
  const [suggestionCallerId, setSuggestionCallerId] = useState<string | null>(null);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const ai = useAiStatus();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const first = useRef(true);

  useEffect(() => {
    loadLegoCatalog(doc.meta.lang === 'fr' ? 'fr' : 'en').then(setCatalog).catch(() => setCatalog(null));
  }, [doc.meta.lang]);

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
    const groupId = doc.groups[0]?.id || 'product';
    const comp: Component = {
      id, name: 'New component', group: groupId, layer: layerId,
      icon: 'box', tech: [], features: [], notes: [], deps: []
    };
    patch(d => {
      if (!d.groups.some(group => group.id === groupId)) {
        d.groups.push({ id: groupId, name: 'Product', short: 'Product', color: PALETTE[0], colorDark: PALETTE_DARK[0] });
      }
      if (!d.layers.some(layer => layer.id === layerId)) {
        d.layers.push({ id: layerId, name: displayLayerLabel(layerId) });
      }
      const list = [...d.components];
      list.splice(index ?? list.length, 0, comp);
      d.components = list;
      return d;
    });
    setSelected(id);
    return id;
  }, [doc.components, doc.groups, patch]);

  const placeBrick = useCallback((component: Component) => {
    if (!catalog) return;
    patch(d => {
      ensurePlacementScaffold(component, d, catalog);
      d.components.push(component);
      syncTechnologies(d, catalog);
      return d;
    });
    setSelected(component.id);
  }, [catalog, patch]);

  const acceptSuggestedLink = useCallback((callerId: string, calleeId: string, suggestion: LegoDependencySuggestion) => {
    patch(d => {
      const caller = d.components.find(component => component.id === callerId);
      if (caller) addSuggestedDependency(caller, calleeId, suggestion);
      return d;
    });
  }, [patch]);

  const confirmPlacedBrick = useCallback((component: Component) => {
    const request = placementRequest;
    placeBrick(component);
    if (request?.callerId && request.suggestion) {
      if (matchesSuggestionTarget(component, request.suggestion)) {
        acceptSuggestedLink(request.callerId, component.id, request.suggestion);
        setSuggestionError(null);
      } else {
        const target = catalog?.bricks[request.suggestion.to]?.capabilityPhrase || request.suggestion.to;
        setSuggestionError(doc.meta.lang === 'fr'
          ? `La brique placée ne fournit pas ${target}. Choisis une variante proposée pour cette dépendance.`
          : `The placed brick does not provide ${target}. Choose one of the variants offered for this dependency.`);
      }
      setSuggestionCallerId(request.callerId);
    } else if (catalog && visibleDependencies(catalog, component).length) {
      setSuggestionCallerId(component.id);
      setSuggestionError(null);
    }
    setPlacementRequest(null);
  }, [acceptSuggestedLink, catalog, doc.meta.lang, placeBrick, placementRequest]);

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
      const callee = d.components.find(x => x.id === to);
      if (!c) return d;
      c.deps = c.deps || [];
      if (c.deps.includes(to)) {
        c.deps = c.deps.filter(x => x !== to);
        c.links = (c.links || []).filter(link => link.to !== to);
      } else {
        c.deps.push(to);
        const suggestion = suggestedLinkForBrick(componentBrick(callee || {}));
        c.links = [...(c.links || []).filter(link => link.to !== to), { to, ...suggestion }];
      }
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
            <ContentEditor doc={doc} patch={patch} catalog={catalog} />
          ) : (
            <div className="editor-body">
              <Palette doc={doc} patch={patch} catalog={catalog} onOpenPlacement={() => setPlacementRequest({})} />

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

      {placementRequest && (
        <PlacementWizard
          existingIds={doc.components.map(component => component.id)}
          groups={doc.groups}
          lang={doc.meta.lang === 'fr' ? 'fr' : 'en'}
          catalog={catalog}
          initialBrick={placementRequest.suggestion?.to}
          onPlace={confirmPlacedBrick}
          onClose={() => {
            if (placementRequest.callerId) setSuggestionCallerId(placementRequest.callerId);
            setPlacementRequest(null);
          }}
        />
      )}

      {suggestionCallerId && catalog && (() => {
        const caller = doc.components.find(component => component.id === suggestionCallerId);
        return caller ? (
          <DependencySuggestions
            caller={caller}
            components={doc.components}
            catalog={catalog}
            lang={doc.meta.lang === 'fr' ? 'fr' : 'en'}
            error={suggestionError}
            onLink={(targetId, suggestion) => acceptSuggestedLink(caller.id, targetId, suggestion)}
            onAddAndLink={suggestion => {
              setSuggestionCallerId(null);
              setSuggestionError(null);
              setPlacementRequest({ callerId: caller.id, suggestion });
            }}
            onClose={() => { setSuggestionCallerId(null); setSuggestionError(null); }}
          />
        ) : null;
      })()}

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

function DependencySuggestions({ caller, components, catalog, lang, error, onLink, onAddAndLink, onClose }: {
  caller: Component;
  components: readonly Component[];
  catalog: LegoCatalogSnapshot;
  lang: 'en' | 'fr';
  error: string | null;
  onLink: (targetId: string, suggestion: LegoDependencySuggestion) => void;
  onAddAndLink: (suggestion: LegoDependencySuggestion) => void;
  onClose: () => void;
}) {
  const [skipped, setSkipped] = useState<string[]>([]);
  const suggestions = visibleDependencies(catalog, caller).filter(suggestion => !skipped.includes(suggestion.to));
  const copy = lang === 'fr'
    ? { title: 'Ce dont ça a souvent besoin', done: 'Déjà lié', link: 'Lier', add: 'Ajouter et lier', manual: 'Ajoute ce composant manuellement', skip: 'Passer', close: 'Terminé' }
    : { title: 'What this usually needs', done: 'Already linked', link: 'Link', add: 'Add & link', manual: 'Add this component manually', skip: 'Skip', close: 'Done' };

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal dependency-sheet" onClick={event => event.stopPropagation()} role="dialog" aria-label={copy.title}>
        <div className="modal-head"><div><h2>{copy.title}</h2></div></div>
        {error && <div className="warnbox"><Icon name="alert" size={15} />{error}</div>}
        {suggestions.map(suggestion => {
          const target = matchingDependencyTarget(components, suggestion.to);
          const linked = target && caller.deps?.includes(target.id);
          const placeable = catalog.variants.some(variant => variant.maps_to === suggestion.to);
          const label = catalog.bricks[suggestion.to]?.capabilityPhrase || suggestion.to;
          return (
            <article className="dependency-suggestion" key={suggestion.to}>
              <div>
                <b>{label}</b>
                <p>{lang === 'fr' ? suggestion.why_fr : suggestion.why_en}</p>
                <small>{protocolLabel(suggestion.protocol_id)} · {LINK_KIND_LABELS[suggestion.kind][lang]}</small>
              </div>
              <div className="dependency-actions">
                {linked ? <span className="muted">{copy.done}{describeLink(linkOf(caller, target.id), lang) ? ` · ${describeLink(linkOf(caller, target.id), lang)}` : ''}</span>
                  : target ? <button type="button" className="btn sm primary" onClick={() => onLink(target.id, suggestion)}>{copy.link}</button>
                    : placeable ? <button type="button" className="btn sm primary" onClick={() => onAddAndLink(suggestion)}>{copy.add}</button>
                      : <button type="button" className="btn sm" disabled title={lang === 'fr' ? 'Aucune variante du catalogue ne peut encore placer cette brique.' : 'No catalog variant can place this brick yet.'}>{copy.manual}</button>}
                {!linked && <button type="button" className="btn sm ghost" onClick={() => setSkipped(values => [...values, suggestion.to])}>{copy.skip}</button>}
              </div>
            </article>
          );
        })}
        {!suggestions.length && <p className="muted">{lang === 'fr' ? 'Aucune autre suggestion.' : 'No more suggestions.'}</p>}
        <div className="modal-actions"><button type="button" className="btn ghost" onClick={onClose}>{copy.close}</button></div>
      </div>
    </div>
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

/* The zone rectangles, measured after layout and drawn behind everything else.
 *
 * A zone can span rows, and the sheet is HTML flow, so it cannot be a box in the
 * DOM — it would have to contain the rows. What it can be is a rectangle around
 * what it holds, computed once layout has happened. Outermost first: the tint
 * stacks in one direction only, and that is what makes nesting read.
 *
 * Kept in step with `zoneLayer` in viewer/engine.js and `PaperDiagram` in the
 * document renderer — three surfaces, one geometry, one table in lib/zones.ts. */
function zoneLayer(host: HTMLElement, box: DOMRect, doc: Architecture): string {
  const live = zonesInUse(doc.zones, doc.components);
  if (!live.length) return '';

  return live.map(zone => {
    const family = withDescendants(zone.id, doc.zones);
    const boxes: Box[] = [];
    family.forEach(id => {
      host.querySelectorAll<HTMLElement>(`.zrun[data-zone="${CSS.escape(id)}"]`).forEach(run => {
        const r = run.getBoundingClientRect();
        if (!r.width && !r.height) return;
        boxes.push({ x: r.left - box.left, y: r.top - box.top, w: r.width, h: r.height });
      });
    });
    const rect = inflatedUnion(boxes, zonePad(zone.id, doc.zones));
    if (!rect) return '';
    return zoneSvg(zone, rect, zoneDepth(zone.id, doc.zones), describeZone(zone, 'en'));
  }).join('');
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
    const conv = protocolConvention(doc.ui.architecture);
    let out = '';
    /* Labels are collected apart and appended, so every plate paints over
     * every line rather than only over the ones drawn before it. */
    let labels = '';
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
      const link = linkOf(c, dep);
      /* The transition takes the two channels colour never claimed: a departure
       * from the existing state is drawn heavier, and a removal is a ghost of an
       * ordinary edge. Selection still wins over both — the canvas is where you
       * work, and what you have clicked has to stay the loudest thing on it. */
      const opacity = active ? 1 : edgeOpacity(link?.state, .34);
      const width = active ? 2 : edgeStroke(link?.state, 1.2);
      out += edgeGlyph(x1, y1, k1, x2, y2, k2, colour, opacity, width, dashFor(link?.kind));
      /* Full strength even on an unselected edge: this is the surface where the
       * protocol and the mark are authored, so they have to be legible before
       * you have clicked the thing they belong to. */
      const label = edgePlateText(link, conv);
      if (label) labels += edgeLabelSvg(x1, y1, k1, x2, y2, k2, label);
    }));
    /* Zones are measured from the runs, not from the cards: a run is already a
     * tight box around a zone's members in one row, so the union is a handful of
     * rects instead of one per component. Emitted first, so every line and every
     * card paints over the region rather than under it. */
    setEdges(zoneLayer(host, box, doc) + out
      + (labels ? `<g class="edgelbl">${labels}</g>` : ''));
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
      {doc.layers.length === 0 && (
        <div className="warnbox" style={{ margin: 16 }}>
          <Icon name="alert" size={15} />
          No layers yet — add a layer in the palette, or place a brick (it creates the layer it needs).
        </div>
      )}
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

  const card = (c: Component) => (
    <ComponentCard key={c.id} comp={c} colour={groupColor(c.group).light}
      selected={selected === c.id} isLinkTarget={hoverTarget === c.id}
      onSelect={() => setSelected(c.id)} onStartLink={onStartLink} />
  );

  return (
    <div className={`layer${isOver ? ' over' : ''}`}>
      <div className="layer-head">
        <b>{displayLayerLabel(layer.name)}</b>
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
              if (items.length && doc.layers.length <= 1) {
                alert('Keep at least one layer while components still use it.');
                return;
              }
              if (items.length && !confirm(`Delete "${layer.name}"? Its ${items.length} component(s) move to "${doc.layers.find(l => l.id !== layer.id)!.name}".`)) return;
              if (!items.length && !confirm(`Delete empty layer "${layer.name}"?`)) return;
              patch(d => {
                if (items.length) {
                  const fallback = d.layers.find(l => l.id !== layer.id)!.id;
                  d.components.forEach(c => { if (c.layer === layer.id) c.layer = fallback; });
                }
                d.layers = d.layers.filter(l => l.id !== layer.id);
                return d;
              });
            }}><Icon name="trash" size={13} /></button>
        </span>
      </div>
      <div ref={setNodeRef} className={`layer-drop${items.length ? '' : ' empty-hint'}`}>
        {items.length === 0 && 'Drop a component here'}
        {/* One run per zone, so a zone's cards stay contiguous even when the row
            wraps — that contiguity is what keeps the measured rectangle from
            enclosing a card it does not hold.
            The wrapper appears only on a document that has zones. A row of cards
            and a row of one-run-of-cards lay out the same in theory; not adding
            the element at all is how that stops being a thing to verify. */}
        {doc.zones.length
          ? layerRuns(items, doc.zones).map(run => (
              <div className="zrun" key={run.zone || ''} data-zone={run.zone || undefined}>
                {run.items.map(card)}
              </div>
            ))
          : items.map(card)}
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
      className={`ccard${selected ? ' selected' : ''}${isDragging ? ' dragging' : ''}${isLinkTarget ? ' linktarget' : ''}${comp.state ? ` st-${comp.state}` : ''}`}
      style={{ ['--c' as string]: colour }}
      onClick={e => { e.stopPropagation(); onSelect(); }}
    >
      {/* The transition tick and the author's own badge share the top edge and
          would collide, so the tick takes the left corner. It goes first because
          it is the one the reader is scanning the sheet for. */}
      {comp.state && <span className="tick">{stateTick(comp.state)}</span>}
      {comp.badge && <span className="badge">{comp.badge}</span>}
      <div className="nh">
        <span className="ic"><Icon name={comp.icon || 'box'} size={13} /></span>
        <span className="nm">{comp.name}</span>
        {/* In the header row rather than below the technologies, so the marks
            survive compact mode: a dense sheet is exactly where "which of these
            is reachable without a login" stops being answerable any other way. */}
        {!!comp.marks?.length && (
          <span className="marks">
            {comp.marks.map(m => (
              <i key={m} title={`${MARK_LABELS[m].en} — ${MARK_BLURBS[m]}`}>
                <Icon name={MARK_ICON[m]} size={11} />
              </i>
            ))}
          </span>
        )}
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

function Palette({ doc, patch, catalog, onOpenPlacement }: {
  doc: Architecture; patch: (fn: (d: Architecture) => Architecture) => void;
  catalog: LegoCatalogSnapshot | null;
  onOpenPlacement: () => void;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: 'palette:new' });

  return (
    <aside className="palette">
      <div className="sect-label">Add</div>
      <div ref={setNodeRef} {...listeners} {...attributes} className="palette-item">
        <Icon name="plus" size={14} />Drag me into a layer
      </div>
      <button type="button" className="btn sm" style={{ width: '100%', justifyContent: 'center' }}
        onClick={onOpenPlacement}>
        Add brick
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
          {doc.groups.length > 1 || !doc.components.some(c => c.group === g.id) ? (
            <button className="iconbtn" style={{ width: 22, height: 22 }} title="Delete scope"
              onClick={() => {
                const used = doc.components.filter(c => c.group === g.id).length;
                if (used && doc.groups.length <= 1) {
                  alert('Keep at least one scope while components still use it.');
                  return;
                }
                if (used && !confirm(`${used} component(s) use this scope. They will move to "${doc.groups.find(x => x.id !== g.id)!.name}".`)) return;
                patch(d => {
                  if (used) {
                    const fallback = d.groups.find(x => x.id !== g.id)!.id;
                    d.components.forEach(c => { if (c.group === g.id) c.group = fallback; });
                  }
                  d.groups = d.groups.filter(x => x.id !== g.id);
                  return d;
                });
              }}><Icon name="trash" size={12} /></button>
          ) : null}
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

      <ZonesPanel doc={doc} patch={patch} />

      <EdgeLegend doc={doc} />
    </aside>
  );
}

/* Zones live in the rail with the layers and the scopes, because all three are
 * the diagram's structure rather than its content. Unlike those two they are not
 * derived from placement: an empty zone is a perimeter someone drew before
 * filling it, so nothing prunes it.
 *
 * `parent` is a select over the other zones. It cannot offer a descendant —
 * `normalizeZones` would cut the cycle back out on the next save, and an edit
 * that silently undoes itself is worse than an option that was never there. */
function ZonesPanel({ doc, patch }: {
  doc: Architecture; patch: (fn: (d: Architecture) => Architecture) => void;
}) {
  const counts = new Map(doc.zones.map(z => [
    z.id,
    doc.components.filter(c => c.zone && withDescendants(z.id, doc.zones).has(c.zone)).length
  ]));

  return (
    <>
      <div className="sect-label">
        Zones<span className="spacer" />
        <button className="iconbtn" style={{ width: 20, height: 20 }} title="Add zone"
          onClick={() => {
            const name = prompt('Zone name — OpenShift, API gateway, DMZ…');
            if (!name?.trim()) return;
            patch(d => {
              d.zones.push({ id: slugify(name, d.zones.map(z => z.id)), name: name.trim() });
              return d;
            });
          }}><Icon name="plus" size={13} /></button>
      </div>
      {!doc.zones.length && (
        <div className="hint" style={{ padding: '2px 6px' }}>
          A boundary that crosses the layers — a platform, a network zone, the
          perimeter of a migration.
        </div>
      )}
      {doc.zones.map(z => (
        <div className="zonerow" key={z.id}>
          <div className="grouprow">
            <input value={z.name}
              onChange={e => patch(d => {
                const x = d.zones.find(y => y.id === z.id);
                if (x) x.name = e.target.value;
                return d;
              })} />
            <span className="count">{counts.get(z.id) ?? 0}</span>
            <button className="iconbtn" style={{ width: 22, height: 22 }} title="Delete zone"
              onClick={() => {
                const held = counts.get(z.id) ?? 0;
                if (held && !confirm(`Delete "${z.name}"? Its ${held} component(s) become unzoned.`)) return;
                patch(d => {
                  d.zones = d.zones.filter(y => y.id !== z.id)
                    .map(y => (y.parent === z.id ? { ...y, parent: z.parent } : y));
                  d.components.forEach(c => { if (c.zone === z.id) c.zone = undefined; });
                  return d;
                });
              }}><Icon name="trash" size={13} /></button>
          </div>
          <div className="frow">
            <select className="select sm" value={z.kind || ''}
              onChange={e => patch(d => {
                const x = d.zones.find(y => y.id === z.id);
                if (x) x.kind = (e.target.value || undefined) as ZoneKind | undefined;
                return d;
              })}
              title={z.kind ? ZONE_KIND_BLURBS[z.kind] : 'Untyped zones are drawn dashed.'}>
              <option value="">kind…</option>
              {ZONE_KINDS.map(k => (
                <option key={k} value={k}>{ZONE_KIND_LABELS[k].en}</option>
              ))}
            </select>
            <select className="select sm" value={z.parent || ''}
              onChange={e => patch(d => {
                const x = d.zones.find(y => y.id === z.id);
                if (x) x.parent = e.target.value || undefined;
                return d;
              })}>
              <option value="">no parent</option>
              {doc.zones
                .filter(y => y.id !== z.id && !withDescendants(z.id, doc.zones).has(y.id))
                .map(y => <option key={y.id} value={y.id}>in {y.name}</option>)}
            </select>
          </div>
        </div>
      ))}
    </>
  );
}

/* Only drawn once the document actually annotates an edge. A legend explaining
 * three line styles on a diagram that uses one is furniture — and the same
 * goes for the protocol convention, which appears only once one is declared. */
function EdgeLegend({ doc }: { doc: Architecture }) {
  const kinds = kindsInUse(doc.components);
  const states = statesInUse(doc.components);
  const marks = marksInUse(doc.components);
  const note = protocolNote(protocolConvention(doc.ui.architecture), 'en');
  if (!kinds.length && !states.length && !marks.length && !note) return null;

  return (
    <>
      {!!marks.length && (
        <>
          <div className="sect-label">Security</div>
          <div className="markkey">
            {marks.map(m => (
              <span key={m} title={MARK_BLURBS[m]}>
                <i><Icon name={MARK_ICON[m]} size={11} /></i>{MARK_LABELS[m].en}
              </span>
            ))}
          </div>
        </>
      )}
      {!!states.length && (
        <>
          <div className="sect-label">Transition</div>
          <div className="statekey">
            {states.map(s => (
              <span key={s}>
                <i className={`tick st-${s}`}>{STATE_SIGN[s]}</i>{STATE_LABELS[s].en}
              </span>
            ))}
          </div>
        </>
      )}
      <div className="sect-label">Dependencies</div>
      {!!kinds.length && (
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
      )}
      {note && <div className="protonote">{note}</div>}
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
