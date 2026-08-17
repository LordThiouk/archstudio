'use client';

/* Picking a flow pattern, then deciding which component takes each of its steps.
 *
 * Two phases in one dialog rather than two dialogs: the binding step only makes
 * sense as a continuation of the choice, and going back has to be cheap enough
 * that trying a pattern out costs nothing.
 *
 * This component never writes the document. It hands the reviewed bindings to
 * its caller, which owns the `patch` — one writer, so nothing here can race the
 * editor's autosave.
 *
 * Bindings handed to onInsert:
 * - component id → keep / use existing
 * - null → skip (omit from the flow; do not create)
 * - PLATE_CREATE → create a brick for a mappable step
 */

import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../Icon';
import { ScopePicker, Text } from './Fields';
import { api } from '@/lib/api';
import { matchSteps, type Binding } from '@/lib/flows/match';
import {
  PLATE_CREATE,
  countActionableBindings,
  isMappableStep
} from '@/lib/flows/plate';
import type { LegoCatalogSnapshot } from '@/lib/lego/types';
import type { FlowPattern, LibraryPattern } from '@/lib/flows/types';
import type { Architecture } from '@/lib/types';

interface Payload { catalog: FlowPattern[]; library: LibraryPattern[]; max: number }

function initialBinding(matched: string | null, patternId: string, stepKey: string, catalog: LegoCatalogSnapshot): string | null {
  if (matched) return matched;
  return isMappableStep(patternId, stepKey, catalog) ? PLATE_CREATE : null;
}

export default function FlowPatterns({ doc, catalog, onInsert, onClose }: {
  doc: Architecture;
  catalog: LegoCatalogSnapshot;
  onInsert: (pattern: FlowPattern, bindings: (string | null)[], name: string, group?: string) => void;
  onClose: () => void;
}) {
  const [data, setData] = useState<Payload | null>(null);
  const [chosen, setChosen] = useState<FlowPattern | null>(null);
  const [auto, setAuto] = useState<Binding[]>([]);
  const [bind, setBind] = useState<(string | null)[]>([]);
  const [name, setName] = useState('');
  const [group, setGroup] = useState<string | undefined>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const lang = doc.meta.lang === 'fr' ? 'fr' : 'en';

  useEffect(() => {
    let live = true;
    api.json<Payload>(`/api/flow-templates?lang=${lang}`)
      .then(d => { if (live) setData(d); })
      .catch(e => { if (live) setError((e as Error).message); });
    return () => { live = false; };
  }, [lang]);

  const choose = (p: FlowPattern) => {
    const matched = matchSteps(p.steps, doc.components);
    setChosen(p);
    setAuto(matched);
    setBind(matched.map((b, i) => initialBinding(b.component, p.id, p.steps[i].key, catalog)));
    setName(p.name);
    setGroup(undefined);
  };

  const remove = async (p: LibraryPattern) => {
    if (!confirm(`Delete the pattern "${p.name}"? It is removed from every project.`)) return;
    setBusy(true);
    try {
      const { library } = await api.json<{ library: LibraryPattern[] }>(
        `/api/flow-templates/library/${encodeURIComponent(p.id)}`, { method: 'DELETE' }
      );
      setData(d => (d ? { ...d, library } : d));
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  const actionable = useMemo(
    () => (chosen ? countActionableBindings(chosen, bind, catalog) : 0),
    [chosen, bind, catalog]
  );
  const kept = useMemo(
    () => bind.filter(v => typeof v === 'string' && v !== PLATE_CREATE && v.length > 0).length,
    [bind]
  );
  const creating = useMemo(
    () => bind.filter(v => v === PLATE_CREATE).length,
    [bind]
  );

  const ctaLabel = (() => {
    if (actionable < 2) return 'Bind or create at least two steps';
    if (creating > 0 && kept > 0) return `Add flow (${kept} bound · ${creating} to create)`;
    if (creating > 0) return `Add flow · create ${creating} missing brick${creating === 1 ? '' : 's'}`;
    return `Add flow (${kept} steps)`;
  })();

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal wide" onClick={e => e.stopPropagation()}
        style={{ maxHeight: '86vh', overflowY: 'auto' }}>

        <div className="modal-head">
          <div>
            <h2>{chosen ? chosen.name : 'Start from a pattern'}</h2>
            <p className="lede">
              {chosen
                ? 'Each step was matched against your components by name, stack and layer. '
                  + 'Correct anything that looks wrong — skip omits the step; create missing drops a brick when the canvas has none.'
                : 'The steps come written. You only decide which component takes each one.'}
            </p>
          </div>
          {chosen && (
            <button className="btn ghost sm" onClick={() => setChosen(null)}>
              <Icon name="back" size={13} />Patterns
            </button>
          )}
        </div>

        {!chosen ? (
          <Picker data={data} busy={busy} onChoose={choose} onDelete={remove} />
        ) : (
          <>
            <div className="flowmap">
              {chosen.steps.map((s, i) => {
                const mappable = isMappableStep(chosen.id, s.key, catalog);
                const value = bind[i] ?? '';
                return (
                  <div className={`flowmap-row${bind[i] ? '' : ' off'}`} key={s.key}>
                    <i className="n">{i + 1}</i>
                    <div className="what">
                      <b>{s.title}</b>
                      {s.description && <em>{s.description}</em>}
                    </div>
                    <select className="select" value={value}
                      onChange={e => {
                        const raw = e.target.value;
                        const next =
                          raw === '' ? null :
                          raw === PLATE_CREATE ? PLATE_CREATE :
                          raw;
                        setBind(b => b.map((v, j) => (j === i ? next : v)));
                      }}>
                      <option value="">— skip this step —</option>
                      {mappable && (
                        <option value={PLATE_CREATE}>— create missing brick —</option>
                      )}
                      {doc.components.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    {!bind[i]
                      ? <span className="count">skipped</span>
                      : bind[i] === PLATE_CREATE
                        ? <span className="count">create</span>
                        : bind[i] === auto[i]?.component && !auto[i].confident
                          ? <span className="count" title="Matched on a weak signal — worth a look">guess</span>
                          : <span className="count" style={{ visibility: 'hidden' }}>ok</span>}
                  </div>
                );
              })}
            </div>

            <div className="frow" style={{ marginTop: 14 }}>
              <Text label="Flow name" value={name} onChange={setName} />
              <ScopePicker doc={doc} value={group} onChange={setGroup} />
            </div>
          </>
        )}

        {error && <div className="err">{error}</div>}
        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          {chosen && (
            <button className="btn primary" disabled={actionable < 2}
              onClick={() => { onInsert(chosen, bind, name, group); onClose(); }}>
              {ctaLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ picker */

function Picker({ data, busy, onChoose, onDelete }: {
  data: Payload | null;
  busy: boolean;
  onChoose: (p: FlowPattern) => void;
  onDelete: (p: LibraryPattern) => void;
}) {
  if (!data) return <p className="muted">Loading patterns…</p>;

  return (
    <>
      <div className="sect-label">Catalogue</div>
      <div className="tpl-grid">
        {data.catalog.map(p => <Card key={p.id} p={p} onChoose={onChoose} />)}
      </div>

      <div className="sect-label" style={{ marginTop: 18 }}>
        Your patterns <span className="count">{data.library.length}/{data.max}</span>
      </div>
      {data.library.length === 0 ? (
        <div className="cardlist-empty">
          Nothing saved yet. Any flow of yours can be saved as a pattern from its own card,
          and comes back in every project.
        </div>
      ) : (
        <div className="tpl-grid">
          {data.library.map(p => (
            <Card key={p.id} p={p} onChoose={onChoose}
              onDelete={busy ? undefined : () => onDelete(p)} />
          ))}
        </div>
      )}
    </>
  );
}

function Card({ p, onChoose, onDelete }: {
  p: FlowPattern; onChoose: (p: FlowPattern) => void; onDelete?: () => void;
}) {
  const from = p.source === 'library' ? (p as LibraryPattern).from : undefined;
  return (
    <button className="tpl-card" onClick={() => onChoose(p)}>
      <i className="dot"><Icon name={p.icon} size={14} /></i>
      <b>{p.name}</b>
      <em>{p.tagline}</em>
      <span className="n">{p.steps.length} steps{from ? ` · ${from}` : ''}</span>
      {onDelete && (
        /* Not a <button>: this card is already one, and nesting them is invalid
         * markup that browsers resolve by dropping the inner element. */
        <span className="iconbtn danger kill" role="button" tabIndex={0} title="Delete this pattern"
          onClick={e => { e.stopPropagation(); onDelete(); }}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); onDelete(); } }}>
          <Icon name="trash" size={13} />
        </span>
      )}
    </button>
  );
}
