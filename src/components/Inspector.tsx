'use client';

import { useState } from 'react';
import { Icon, ICONS } from './Icon';
import { ICON_KEYS, deleteComponent, slugify } from '@/lib/defaults';
import { displayLayerLabel } from '@/lib/layers';
import { LINK_KINDS, LINK_KIND_BLURBS, LINK_KIND_LABELS, linkOf, shortLink } from '@/lib/links';
import type { Architecture, Component, Link, LinkKind } from '@/lib/types';

type Patch = (fn: (d: Architecture) => Architecture) => void;

export default function Inspector({ doc, patch, component, onClose, onSelect }: {
  doc: Architecture; patch: Patch; component: Component | null;
  onClose: () => void; onSelect: (id: string) => void;
}) {
  return (
    <aside className="inspector">
      {component
        ? <ComponentForm doc={doc} patch={patch} comp={component} onClose={onClose} onSelect={onSelect} />
        : <DocumentForm doc={doc} patch={patch} />}
    </aside>
  );
}

/* ------------------------------------------------------------------ component */

function ComponentForm({ doc, patch, comp, onClose, onSelect }: {
  doc: Architecture; patch: Patch; comp: Component; onClose: () => void; onSelect: (id: string) => void;
}) {
  const [techDraft, setTechDraft] = useState('');
  const [showIcons, setShowIcons] = useState(false);

  const set = (fn: (c: Component) => void) => patch(d => {
    const c = d.components.find(x => x.id === comp.id);
    if (c) fn(c);
    return d;
  });

  const inbound = doc.components.filter(c => (c.deps || []).includes(comp.id));
  const outbound = (comp.deps || []).map(id => doc.components.find(c => c.id === id)).filter(Boolean) as Component[];
  const colourOf = (gid: string) => doc.groups.find(g => g.id === gid)?.color || '#28519F';

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <h3>Component</h3>
          <div className="sub mono">{comp.id}</div>
        </div>
        <button className="iconbtn" onClick={onClose} title="Deselect"><Icon name="chevron" size={15} /></button>
      </div>

      <label className="field"><span>Name</span>
        <input className="input" value={comp.name} onChange={e => set(c => { c.name = e.target.value; })} />
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <label className="field"><span>Scope</span>
          <select className="select" value={comp.group} onChange={e => set(c => { c.group = e.target.value; })}>
            {doc.groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </label>
        <label className="field"><span>Layer</span>
          <select className="select" value={comp.layer} onChange={e => set(c => { c.layer = e.target.value; })}>
            {doc.layers.map(l => <option key={l.id} value={l.id}>{displayLayerLabel(l.name === l.id ? l.id : l.name)}</option>)}
          </select>
        </label>
      </div>

      <div className="field">
        <span>Icon</span>
        <button className="btn sm" onClick={() => setShowIcons(s => !s)} style={{ width: '100%', justifyContent: 'flex-start' }}>
          <Icon name={comp.icon || 'box'} size={14} />{comp.icon || 'box'}
        </button>
        {showIcons && (
          <div className="iconpick" style={{ marginTop: 6 }}>
            {ICON_KEYS.map(k => (
              <button key={k} title={k} aria-pressed={comp.icon === k}
                onClick={() => { set(c => { c.icon = k; }); setShowIcons(false); }}>
                <span dangerouslySetInnerHTML={{ __html: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICONS[k]}</svg>` }} />
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <label className="field"><span>Badge</span>
          <input className="input" value={comp.badge || ''} placeholder="B2B"
            onChange={e => set(c => { c.badge = e.target.value || undefined; })} />
        </label>
        <label className="field"><span>URL / domain</span>
          <input className="input" value={comp.url || ''} placeholder="api.example.com"
            onChange={e => set(c => { c.url = e.target.value || undefined; })} />
        </label>
      </div>

      <div className="field">
        <span>Technologies</span>
        <div className="chiprow" style={{ marginBottom: 6 }}>
          {(comp.tech || []).map(t => (
            <span className="tagchip" key={t}>{t}
              <button onClick={() => set(c => { c.tech = (c.tech || []).filter(x => x !== t); })}>×</button>
            </span>
          ))}
        </div>
        <input className="input" value={techDraft} placeholder="Type and press Enter"
          onChange={e => setTechDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key !== 'Enter' || !techDraft.trim()) return;
            e.preventDefault();
            const v = techDraft.trim();
            set(c => { c.tech = [...(c.tech || []).filter(x => x !== v), v]; });
            setTechDraft('');
          }} />
      </div>

      <label className="field"><span>Role</span>
        <textarea className="textarea" value={comp.role || ''}
          placeholder="What this component is for — not what technology it uses."
          onChange={e => set(c => { c.role = e.target.value || undefined; })} />
      </label>

      <ListEditor label="Responsibilities" items={comp.features || []}
        onChange={v => set(c => { c.features = v; })} placeholder="One responsibility per line" />

      <ListEditor label="Notes / known gaps" items={comp.notes || []}
        onChange={v => set(c => { c.notes = v; })} placeholder="Planned work, caveats" />

      <div className="insp-sep" />

      <div className="field">
        <span>Depends on ({outbound.length})</span>
        {outbound.length === 0 && <div className="hint">Drag the dot under a card onto another card to create a dependency.</div>}
        <div className="cardlist">
          {outbound.map(t => (
            <LinkRow key={t.id} comp={comp} target={t} colour={colourOf(t.group)}
              set={set} onSelect={onSelect} />
          ))}
        </div>
        <select className="select" style={{ marginTop: 6 }} value=""
          onChange={e => { if (e.target.value) set(c => { c.deps = [...(c.deps || []), e.target.value]; }); }}>
          <option value="">Add a dependency…</option>
          {doc.components
            .filter(c => c.id !== comp.id && !(comp.deps || []).includes(c.id))
            .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {inbound.length > 0 && (
        <div className="field">
          <span>Used by ({inbound.length})</span>
          <div className="chiprow">
            {inbound.map(t => {
              /* The annotation lives on the caller, so an incoming edge reads
               * its description from the other end rather than from here. */
              const how = shortLink(linkOf(t, comp.id));
              return (
                <span className="tagchip" key={t.id}>
                  <i style={{ width: 7, height: 7, borderRadius: 4, background: colourOf(t.group), display: 'inline-block' }} />
                  <button style={{ color: 'var(--ink)', padding: 0 }} onClick={() => onSelect(t.id)}>{t.name}</button>
                  {how && <em className="mono" style={{ fontStyle: 'normal', color: 'var(--ink-3)', fontSize: 10 }}>{how}</em>}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="insp-sep" />
      <button className="btn danger" style={{ width: '100%', justifyContent: 'center' }}
        onClick={() => {
          if (!confirm(`Delete "${comp.name}"? Dependencies pointing at it are removed too.`)) return;
          patch(d => {
            deleteComponent(d, comp.id);
            return d;
          });
          onClose();
        }}>
        <Icon name="trash" size={15} />Delete component
      </button>
    </>
  );
}

/* One outgoing dependency, collapsed to its summary until you open it.
 *
 * The row has to stay readable at 246 px, so the three fields hide behind the
 * twist and the head carries what they add up to — "SQL · async". A dependency
 * nobody has annotated shows nothing extra, which is also what it draws on the
 * canvas: a plain solid edge. */
function LinkRow({ comp, target, colour, set, onSelect }: {
  comp: Component; target: Component; colour: string;
  set: (fn: (c: Component) => void) => void; onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const link = linkOf(comp, target.id);
  const summary = shortLink(link);

  /* Links are keyed by target, so an edit is an upsert and clearing every
   * field removes the row — normalisation would drop an empty one anyway, and
   * leaving it would make the next diff report a change nobody made. */
  const edit = (patch: Partial<Link>) => set(c => {
    const links = [...(c.links || [])];
    const i = links.findIndex(l => l.to === target.id);
    const next: Link = { ...(i >= 0 ? links[i] : { to: target.id }), ...patch };
    if (!next.kind && !next.protocol?.trim() && !next.note?.trim()) {
      c.links = links.filter(l => l.to !== target.id);
    } else if (i >= 0) { links[i] = next; c.links = links; }
    else c.links = [...links, next];
  });

  return (
    <div className={`elist${open ? ' open' : ''}`}>
      <div className="elist-head">
        <button className="iconbtn twist" onClick={() => setOpen(o => !o)}
          aria-expanded={open} aria-label={open ? 'Collapse' : 'Describe this dependency'}>
          <Icon name="chevron" size={13} />
        </button>
        <span className="elist-name">
          <i style={{ width: 8, height: 8, background: colour, display: 'inline-block', marginRight: 7 }} />
          <button style={{ border: 0, background: 'transparent', font: 'inherit', color: 'var(--ink)', padding: 0, cursor: 'pointer' }}
            onClick={() => onSelect(target.id)} title="Select this component">{target.name}</button>
          {summary && <em className="mono"> {summary}</em>}
        </span>
        <button className="iconbtn" title="Remove this dependency"
          onClick={() => set(c => {
            c.deps = (c.deps || []).filter(x => x !== target.id);
            c.links = (c.links || []).filter(l => l.to !== target.id);
          })}><Icon name="trash" size={13} /></button>
      </div>

      {open && (
        <div className="elist-body">
          <div className="field">
            <span>How it travels</span>
            <div className="radio-row">
              {LINK_KINDS.map(k => (
                <button key={k} className={`radio${link?.kind === k ? ' on' : ''}`}
                  title={LINK_KIND_BLURBS[k]}
                  onClick={() => edit({ kind: link?.kind === k ? undefined : k })}>
                  <i /> {LINK_KIND_LABELS[k].en}
                </button>
              ))}
            </div>
            <div className="hint">
              {link?.kind ? LINK_KIND_BLURBS[link.kind as LinkKind]
                : 'Unset draws a solid edge and reads as synchronous.'}
            </div>
          </div>

          <label className="field"><span>Protocol</span>
            <input className="input" value={link?.protocol || ''} placeholder="REST/HTTPS, gRPC, SQL, Kafka…"
              onChange={e => edit({ protocol: e.target.value })} />
          </label>

          <label className="field" style={{ marginBottom: 0 }}><span>Note</span>
            <input className="input" value={link?.note || ''} placeholder="Read replica, at-least-once, nightly 02:00…"
              onChange={e => edit({ note: e.target.value })} />
          </label>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ document */

function DocumentForm({ doc, patch }: { doc: Architecture; patch: Patch }) {
  const meta = (fn: (m: Architecture['meta']) => void) => patch(d => { fn(d.meta); return d; });

  return (
    <>
      <h3>Document</h3>
      <div className="sub">Select a component to edit it. These fields drive the overview page.</div>

      <label className="field"><span>Display name</span>
        <input className="input" value={doc.meta.name || ''} onChange={e => meta(m => { m.name = e.target.value; })} />
      </label>

      <label className="field"><span>Headline</span>
        <input className="input" value={doc.meta.title || ''} placeholder="One sentence that frames the system"
          onChange={e => meta(m => { m.title = e.target.value; })} />
      </label>

      <label className="field"><span>Kicker</span>
        <input className="input" value={doc.meta.kicker || ''} placeholder="Technical dossier · 2026"
          onChange={e => meta(m => { m.kicker = e.target.value; })} />
      </label>

      <label className="field"><span>Introduction</span>
        <textarea className="textarea" value={doc.meta.intro || ''}
          onChange={e => meta(m => { m.intro = e.target.value; })} />
      </label>

      <label className="field"><span>Guiding principle (callout)</span>
        <textarea className="textarea" value={doc.meta.principle || ''}
          placeholder="<b>Principle.</b> The two platforms share no database."
          onChange={e => meta(m => { m.principle = e.target.value; })} />
        <div className="hint">Inline <code>&lt;b&gt;</code>, <code>&lt;i&gt;</code>, <code>&lt;code&gt;</code> are allowed here.</div>
      </label>

      <div className="insp-sep" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <label className="field"><span>Language</span>
          <select className="select" value={doc.meta.lang || 'en'}
            onChange={e => meta(m => { m.lang = e.target.value as 'en' | 'fr'; })}>
            <option value="en">English</option>
            <option value="fr">Français</option>
          </select>
        </label>
        <label className="field"><span>Default theme</span>
          <select className="select" value={doc.ui.defaultTheme || 'light'}
            onChange={e => patch(d => { d.ui.defaultTheme = e.target.value as 'light' | 'dark'; return d; })}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <label className="field"><span>Accent (light)</span>
          <input className="input" type="color" value={doc.theme.brand || '#28519F'}
            onChange={e => patch(d => { d.theme.brand = e.target.value; return d; })} />
        </label>
        <label className="field"><span>Accent (dark)</span>
          <input className="input" type="color" value={doc.theme.brandDark || '#5B8DEF'}
            onChange={e => patch(d => { d.theme.brandDark = e.target.value; return d; })} />
        </label>
      </div>

      <div className="insp-sep" />

      <FactsEditor doc={doc} patch={patch} />

      <div className="insp-sep" />
      <div className="hint">
        Key figures, flows, the tech-stack table and the editorial sections are edited in the
        <b> Content</b> tab, at the top of the window.
      </div>
    </>
  );
}

function FactsEditor({ doc, patch }: { doc: Architecture; patch: Patch }) {
  const facts = doc.meta.facts || [];
  return (
    <div className="field">
      <span>Header facts</span>
      <div className="listedit">
        {facts.map((f, i) => (
          <div className="row" key={i}>
            <input className="input" style={{ flex: '0 0 40%' }} value={f.label} placeholder="Author"
              onChange={e => patch(d => { d.meta.facts![i].label = e.target.value; return d; })} />
            <input className="input" value={f.value} placeholder="Jane Doe — CTO"
              onChange={e => patch(d => { d.meta.facts![i].value = e.target.value; return d; })} />
            <button className="iconbtn" title="Remove"
              onClick={() => patch(d => { d.meta.facts = (d.meta.facts || []).filter((_, j) => j !== i); return d; })}>
              <Icon name="trash" size={14} />
            </button>
          </div>
        ))}
      </div>
      <button className="btn sm" style={{ marginTop: 6 }}
        onClick={() => patch(d => { d.meta.facts = [...(d.meta.facts || []), { label: '', value: '' }]; return d; })}>
        <Icon name="plus" size={13} />Add fact
      </button>
    </div>
  );
}

function ListEditor({ label, items, onChange, placeholder }: {
  label: string; items: string[]; onChange: (v: string[]) => void; placeholder?: string;
}) {
  return (
    <div className="field">
      <span>{label}</span>
      <div className="listedit">
        {items.map((it, i) => (
          <div className="row" key={i}>
            <textarea className="textarea" style={{ minHeight: 34 }} value={it}
              onChange={e => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} />
            <button className="iconbtn" title="Remove" onClick={() => onChange(items.filter((_, j) => j !== i))}>
              <Icon name="trash" size={14} />
            </button>
          </div>
        ))}
      </div>
      <button className="btn sm" style={{ marginTop: 6 }} onClick={() => onChange([...items, ''])}>
        <Icon name="plus" size={13} />Add
      </button>
      {items.length === 0 && placeholder && <div className="hint">{placeholder}</div>}
    </div>
  );
}
