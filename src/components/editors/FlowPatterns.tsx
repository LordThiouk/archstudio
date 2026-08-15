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
 */

import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../Icon';
import { ScopePicker, Text } from './Fields';
import { api } from '@/lib/api';
import { matchSteps, type Binding } from '@/lib/flows/match';
import type { FlowPattern, LibraryPattern } from '@/lib/flows/types';
import type { Architecture } from '@/lib/types';

interface Payload { catalog: FlowPattern[]; library: LibraryPattern[]; max: number }

export default function FlowPatterns({ doc, onInsert, onClose }: {
  doc: Architecture;
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
    setBind(matched.map(b => b.component));
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

  const kept = useMemo(() => bind.filter(Boolean).length, [bind]);

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
                  + 'Correct anything that looks wrong — a step left on “skip” is simply left out.'
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
              {chosen.steps.map((s, i) => (
                <div className={`flowmap-row${bind[i] ? '' : ' off'}`} key={s.key}>
                  <i className="n">{i + 1}</i>
                  <div className="what">
                    <b>{s.title}</b>
                    {s.description && <em>{s.description}</em>}
                  </div>
                  <select className="select" value={bind[i] ?? ''}
                    onChange={e => setBind(b => b.map((v, j) => (j === i ? (e.target.value || null) : v)))}>
                    <option value="">— skip this step —</option>
                    {doc.components.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {!bind[i]
                    ? <span className="count">skipped</span>
                    : bind[i] === auto[i]?.component && !auto[i].confident
                      ? <span className="count" title="Matched on a weak signal — worth a look">guess</span>
                      : <span className="count" style={{ visibility: 'hidden' }}>ok</span>}
                </div>
              ))}
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
            <button className="btn primary" disabled={kept < 2}
              onClick={() => { onInsert(chosen, bind, name, group); onClose(); }}>
              {kept < 2 ? 'Bind at least two steps' : `Add flow (${kept} steps)`}
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
