'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable, type DragEndEvent, type DragStartEvent
} from '@dnd-kit/core';
import { Icon } from './Icon';
import Inspector from './Inspector';
import PlacementWizard from './editors/PlacementWizard';
import { PALETTE, PALETTE_DARK, slugify } from '@/lib/defaults';
import { displayLayerLabel } from '@/lib/layers';
import { ensurePlacementScaffold, componentBrick } from '@/lib/lego/place';
import { syncTechnologies } from '@/lib/lego/stack';
import { loadLegoCatalog } from '@/lib/lego/client';
import { addSuggestedDependency, matchesSuggestionTarget, matchingDependencyTarget, visibleDependencies } from '@/lib/lego/dependencies';
import type { LegoCatalogSnapshot, LegoDependencySuggestion } from '@/lib/lego/types';
import { dashFor, describeLink, kindsInUse, LINK_DASH, LINK_KIND_LABELS, linkOf } from '@/lib/links';
import { protocolLabel, suggestedLinkForBrick } from '@/lib/lego/protocols';
import { syncGatedPresetSections } from '@/lib/document/preset';
import type { Architecture, Component } from '@/lib/types';

type Patch = (fn: (d: Architecture) => Architecture) => void;

/**
 * Shared edit-mode architecture canvas: palette | graph | inspector.
 * Used by the project Editor and admin template Diagram tabs — one implementation.
 */
export default function ArchitectureDiagramSurface({
  doc,
  patch,
  readOnly = false,
  initialSelected = null,
}: {
  doc: Architecture;
  patch: Patch;
  readOnly?: boolean;
  /** Pre-select a component (e.g. project opened with ?new=1). */
  initialSelected?: string | null;
}) {
  const [selected, setSelected] = useState<string | null>(initialSelected);
  const [dragId, setDragId] = useState<string | null>(null);
  const [link, setLink] = useState<{ from: string; x: number; y: number } | null>(null);
  const [hoverTarget, setHoverTarget] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<LegoCatalogSnapshot | null>(null);
  const [placementRequest, setPlacementRequest] = useState<{ callerId?: string; suggestion?: LegoDependencySuggestion } | null>(null);
  const [suggestionCallerId, setSuggestionCallerId] = useState<string | null>(null);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    loadLegoCatalog(doc.meta.lang === 'fr' ? 'fr' : 'en').then(setCatalog).catch(() => setCatalog(null));
  }, [doc.meta.lang]);

  useEffect(() => {
    if (!doc.components.some(c => c.id === selected)) setSelected(null);
  }, [doc.components, selected]);

  const addComponent = useCallback((layerId: string, index?: number) => {
    if (readOnly) return null;
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
  }, [doc.components, doc.groups, patch, readOnly]);

  const placeBrick = useCallback((component: Component) => {
    if (readOnly || !catalog) return;
    patch(d => {
      ensurePlacementScaffold(component, d, catalog);
      d.components.push(component);
      syncTechnologies(d, catalog);
      syncGatedPresetSections(d);
      return d;
    });
    setSelected(component.id);
  }, [catalog, patch, readOnly]);

  const acceptSuggestedLink = useCallback((callerId: string, calleeId: string, suggestion: LegoDependencySuggestion) => {
    if (readOnly) return;
    patch(d => {
      const caller = d.components.find(component => component.id === callerId);
      if (caller) addSuggestedDependency(caller, calleeId, suggestion);
      return d;
    });
  }, [patch, readOnly]);

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
    if (readOnly) return;
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
  }, [patch, readOnly]);

  const addDep = useCallback((from: string, to: string) => {
    if (readOnly || from === to) return;
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
  }, [patch, readOnly]);

  useEffect(() => {
    if (!link || readOnly) return;
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
  }, [link, addDep, readOnly]);

  function onDragEnd(e: DragEndEvent) {
    setDragId(null);
    if (readOnly) return;
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

  const effectivePatch: Patch = readOnly ? () => {} : patch;

  return (
    <DndContext id="archstudio-diagram-surface" sensors={sensors}
      onDragStart={(e: DragStartEvent) => { if (!readOnly) setDragId(String(e.active.id)); }}
      onDragEnd={onDragEnd} onDragCancel={() => setDragId(null)}>
      <div className="editor-body" style={{ flex: 1, minHeight: 0 }}>
        <Palette
          doc={doc}
          patch={effectivePatch}
          readOnly={readOnly}
          onOpenPlacement={() => { if (!readOnly) setPlacementRequest({}); }}
        />

        <div className="canvas-wrap">
          <Canvas
            doc={doc} selected={selected} setSelected={setSelected}
            hoverTarget={hoverTarget} linking={!!link}
            readOnly={readOnly}
            onStartLink={(id, x, y) => { if (!readOnly) setLink({ from: id, x, y }); }}
            groupColor={groupColor} patch={effectivePatch}
          />
        </div>

        <Inspector
          doc={doc} patch={effectivePatch} component={selectedComp}
          onClose={() => setSelected(null)} onSelect={setSelected}
        />
      </div>

      {!readOnly && (
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
      )}

      {link && !readOnly && <LinkLine link={link} />}

      {!readOnly && placementRequest && (
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

      {!readOnly && suggestionCallerId && catalog && (() => {
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
    </DndContext>
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
    <svg className="linkline">
      <path d={`M${x1},${y1} C${x1},${y1 + 40} ${link.x},${link.y - 40} ${link.x},${link.y}`}
        fill="none" stroke="var(--brand)" strokeWidth="2" strokeDasharray="4 4" strokeLinecap="round" />
      <circle cx={x1} cy={y1} r="4" fill="var(--brand)" />
      <circle cx={link.x} cy={link.y} r="3.5" style={{ fill: 'var(--panel)' }}
        stroke="var(--brand)" strokeWidth="2" />
    </svg>
  );
}

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

function Canvas({ doc, selected, setSelected, hoverTarget, linking, onStartLink, groupColor, patch, readOnly }: {
  doc: Architecture; selected: string | null; setSelected: (id: string | null) => void;
  hoverTarget: string | null; linking: boolean; readOnly: boolean;
  onStartLink: (id: string, x: number, y: number) => void;
  groupColor: (id: string) => { light: string; dark: string };
  patch: Patch;
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
      {doc.layers.length === 0 && (
        <div className="warnbox" style={{ margin: 16 }}>
          <Icon name="alert" size={15} />
          No layers yet — add a layer in the palette, or place a brick (it creates the layer it needs).
        </div>
      )}
      {doc.layers.map(layer => (
        <LayerRow key={layer.id} layer={layer} doc={doc} patch={patch} readOnly={readOnly}
          selected={selected} setSelected={setSelected} hoverTarget={hoverTarget}
          onStartLink={onStartLink} groupColor={groupColor} />
      ))}
    </div>
  );
}

function LayerRow({ layer, doc, patch, selected, setSelected, hoverTarget, onStartLink, groupColor, readOnly }: {
  layer: { id: string; name: string; desc?: string };
  doc: Architecture; patch: Patch; readOnly: boolean;
  selected: string | null; setSelected: (id: string | null) => void; hoverTarget: string | null;
  onStartLink: (id: string, x: number, y: number) => void;
  groupColor: (id: string) => { light: string; dark: string };
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `layer:${layer.id}`, disabled: readOnly });
  const items = doc.components.filter(c => c.layer === layer.id);

  return (
    <div className={`layer${isOver ? ' over' : ''}`}>
      <div className="layer-head">
        <b>{displayLayerLabel(layer.name)}</b>
        {layer.desc && <em>{layer.desc}</em>}
        {!readOnly && (
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
        )}
      </div>
      <div ref={setNodeRef} className={`layer-drop${items.length ? '' : ' empty-hint'}`}>
        {items.length === 0 && (readOnly ? 'Empty layer' : 'Drop a component here')}
        {items.map(c => (
          <ComponentCard key={c.id} comp={c} colour={groupColor(c.group).light}
            selected={selected === c.id} isLinkTarget={hoverTarget === c.id}
            readOnly={readOnly}
            onSelect={() => setSelected(c.id)} onStartLink={onStartLink} />
        ))}
      </div>
    </div>
  );
}

function ComponentCard({ comp, colour, selected, isLinkTarget, onSelect, onStartLink, readOnly }: {
  comp: Component; colour: string; selected: boolean; isLinkTarget: boolean; readOnly: boolean;
  onSelect: () => void; onStartLink: (id: string, x: number, y: number) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: comp.id, disabled: readOnly });
  const { setNodeRef: dropRef } = useDroppable({ id: comp.id, disabled: readOnly });

  return (
    <div
      ref={node => { setNodeRef(node); dropRef(node); }}
      {...(readOnly ? {} : { ...listeners, ...attributes })}
      data-comp={comp.id}
      className={`ccard${selected ? ' selected' : ''}${isDragging ? ' dragging' : ''}${isLinkTarget ? ' linktarget' : ''}`}
      style={{ ['--c' as string]: colour, ...(readOnly ? { cursor: 'pointer' } : {}) }}
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
      {!readOnly && (
        <span
          className="linkdot" title="Drag onto another component to create a dependency"
          onPointerDown={e => {
            e.stopPropagation(); e.preventDefault();
            onStartLink(comp.id, e.clientX, e.clientY);
          }}
        />
      )}
    </div>
  );
}

function Palette({ doc, patch, onOpenPlacement, readOnly }: {
  doc: Architecture; patch: Patch;
  onOpenPlacement: () => void;
  readOnly: boolean;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: 'palette:new', disabled: readOnly });

  return (
    <aside className="palette">
      {!readOnly && (
        <>
          <div className="sect-label">Add</div>
          <div ref={setNodeRef} {...listeners} {...attributes} className="palette-item">
            <Icon name="plus" size={14} />Drag me into a layer
          </div>
          <button type="button" className="btn sm" style={{ width: '100%', justifyContent: 'center' }}
            onClick={onOpenPlacement}>
            Add brick
          </button>
        </>
      )}

      <div className="sect-label">
        Scopes<span className="spacer" />
        {!readOnly && (
          <button className="iconbtn" style={{ width: 20, height: 20 }} title="Add scope"
            onClick={() => {
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
        )}
      </div>
      {doc.groups.map((g, i) => (
        <div className="grouprow" key={g.id}>
          <input type="color" className="swatch" value={g.color || PALETTE[i % PALETTE.length]}
            title="Scope colour" disabled={readOnly}
            onChange={e => patch(d => { const x = d.groups.find(y => y.id === g.id); if (x) x.color = e.target.value; return d; })} />
          <input value={g.name} disabled={readOnly}
            onChange={e => patch(d => { const x = d.groups.find(y => y.id === g.id); if (x) { x.name = e.target.value; x.short = e.target.value; } return d; })} />
          {!readOnly && (doc.groups.length > 1 || !doc.components.some(c => c.group === g.id)) ? (
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
        {!readOnly && (
          <button className="iconbtn" style={{ width: 20, height: 20 }} title="Add layer"
            onClick={() => {
              const name = prompt('Layer name');
              if (!name?.trim()) return;
              patch(d => {
                d.layers.push({ id: slugify(name, d.layers.map(l => l.id)), name: name.trim() });
                return d;
              });
            }}><Icon name="plus" size={13} /></button>
        )}
      </div>
      {doc.layers.map((l, i) => (
        <div className="grouprow" key={l.id}>
          <input value={l.name} disabled={readOnly}
            onChange={e => patch(d => { const x = d.layers.find(y => y.id === l.id); if (x) x.name = e.target.value; return d; })} />
          {!readOnly && (
            <>
              <button className="iconbtn" style={{ width: 22, height: 22 }} disabled={i === 0} title="Move up"
                onClick={() => patch(d => {
                  const arr = d.layers; [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; return d;
                })}><Icon name="chevron" size={12} style={{ transform: 'rotate(-90deg)' }} /></button>
              <button className="iconbtn" style={{ width: 22, height: 22 }} disabled={i === doc.layers.length - 1} title="Move down"
                onClick={() => patch(d => {
                  const arr = d.layers; [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; return d;
                })}><Icon name="chevron" size={12} style={{ transform: 'rotate(90deg)' }} /></button>
            </>
          )}
        </div>
      ))}

      <EdgeLegend doc={doc} />
    </aside>
  );
}

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
