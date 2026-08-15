'use client';

import { useEffect, useMemo, useState } from 'react';
import { Icon } from './Icon';
import { api } from '@/lib/api';
import { byRepairKind, type Repair } from '@/lib/ai/convert';
import { DEFAULT_MERGE, mergeProposal, type MergeOptions } from '@/lib/ai/merge';
import { byArea, diffArchitecture, summarise } from '@/lib/diff';
import type { Architecture } from '@/lib/types';

/* Reading a written document into a diagram.
 *
 * Both entry points — a new project from a document, and enriching one that
 * exists — are the same three beats: choose a file, see what it will cost,
 * read what came back before any of it is written down. The third beat is the
 * one that matters. A model's answer here is a claim about someone's system,
 * and the whole design of this dialog is that a person reads the claim, with
 * its assumptions and its unanswered questions beside it, while the database
 * is still untouched. */

interface AiStatus {
  enabled: boolean; provider: string; providerLabel: string; model: string;
  supportsPdf: boolean; accept: string; maxBytes: number; priced: boolean;
}
interface Source { kind: 'pdf' | 'text'; filename: string; data: string }
interface Estimate { tokens: number; exact: boolean; lowCost: number | null; highCost: number | null }

interface Proposal {
  document: Partial<Architecture>;
  repairs: Repair[];
  assumptions: string[];
  questions: string[];
  /** The provider refused the full schema; flows and technologies were skipped. */
  reduced?: boolean;
  /** `cost` is null unless the settings carry a price for this model. */
  usage: { inputTokens: number; outputTokens: number; cost: number | null };
}

/* Saving the settings has to move the buttons that the settings govern, in
 * both places that show them, without either of them knowing the dialog
 * exists. A module-level notification is the smallest thing that does it —
 * a context provider for one boolean would be more machinery than fact. */
const watchers = new Set<() => void>();
export const aiStatusChanged = (): void => { watchers.forEach(w => w()); };

/** Whether this install can analyse documents. Null while we are still asking. */
export function useAiStatus(): AiStatus | null {
  const [status, setStatus] = useState<AiStatus | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => api.json<AiStatus>('/api/ai')
      .then(s => { if (alive) setStatus(s); })
      /* Fail closed: if the status cannot be read, the feature is treated as
       * unavailable rather than offered and then failing on use. */
      .catch(() => {
        if (alive) setStatus({
          enabled: false, provider: '', providerLabel: '', model: '',
          supportsPdf: false, accept: '', maxBytes: 0, priced: false
        });
      });

    load();
    watchers.add(load);
    return () => { alive = false; watchers.delete(load); };
  }, []);

  return status;
}

/* A PDF travels as base64 and everything else as its own text. Chunked because
 * `String.fromCharCode(...bytes)` on a 10 MB file blows the argument limit. */
async function readSource(file: File): Promise<Source> {
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return { kind: 'pdf', filename: file.name, data: btoa(binary) };
  }
  return { kind: 'text', filename: file.name, data: await file.text() };
}

const money = (n: number) => `$${n.toFixed(2)}`;
const thousands = (n: number) => n.toLocaleString('en-US');
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/* ------------------------------------------------------------------ pieces */

function FilePicker({ status, source, onPick, disabled }: {
  status: AiStatus; source: Source | null; onPick: (f: File) => void; disabled: boolean;
}) {
  return (
    <label className="field"><span>Document</span>
      <input className="input" type="file" accept={status.accept} disabled={disabled}
        onChange={e => { const f = e.target.files?.[0]; if (f) onPick(f); }} />
      <div className="hint">
        {status.supportsPdf ? 'PDF, Markdown' : 'Markdown'} or plain text,
        up to {Math.round(status.maxBytes / 1024 / 1024)} MB.
        {source ? ` Reading ${source.filename}.` : ' A design document, an RFC, an onboarding guide — whatever states what the system is made of.'}
      </div>
    </label>
  );
}

function Estimated({ estimate, status }: { estimate: Estimate | null; status: AiStatus }) {
  if (!estimate) return null;
  /* A price only when the settings carry one for this model. Providers do not
   * publish rates through their APIs, and a number invented here would be
   * worse than no number at all. */
  const cost = estimate.lowCost !== null && estimate.highCost !== null
    ? ` · about ${money(estimate.lowCost)}–${money(estimate.highCost)} on your ${status.providerLabel} account, once`
    : '';
  return (
    <div className="hint" style={{ marginTop: 2 }}>
      {estimate.exact ? '' : 'about '}{thousands(estimate.tokens)} tokens to read{cost}, with {status.model}.
      {estimate.exact ? '' : ' Token count estimated — this provider does not measure one up front.'}
    </div>
  );
}

/** The counts, then everything the model wants the reader to know it did. */
function Findings({ proposal }: { proposal: Proposal }) {
  const doc = proposal.document;
  const components = doc.components?.length ?? 0;
  const deps = doc.components?.reduce((n, c) => n + (c.deps?.length ?? 0), 0) ?? 0;
  const repairs = byRepairKind(proposal.repairs);

  return (
    <>
      <div className="sect-label" style={{ marginTop: 14 }}>What it read
        <span className="spacer" />
        {proposal.usage.cost !== null && <span className="count">{money(proposal.usage.cost)}</span>}
      </div>
      <p className="ai-counts">
        {plural(components, 'component')} · {plural(deps, 'dependency', 'dependencies')}
        {doc.groups?.length ? ` · ${plural(doc.groups.length, 'scope')}` : ''}
        {doc.layers?.length ? ` · ${plural(doc.layers.length, 'layer')}` : ''}
        {doc.flows?.length ? ` · ${plural(doc.flows.length, 'flow')}` : ''}
      </p>

      {proposal.assumptions.length > 0 && (
        <>
          <div className="sect-label" style={{ marginTop: 14 }}>What it had to assume
            <span className="spacer" /><span className="count">{proposal.assumptions.length}</span>
          </div>
          <ul className="ai-list">{proposal.assumptions.map((a, i) => <li key={i}>{a}</li>)}</ul>
        </>
      )}

      {proposal.questions.length > 0 && (
        <>
          <div className="sect-label" style={{ marginTop: 14 }}>What it could not answer
            <span className="spacer" /><span className="count">{proposal.questions.length}</span>
          </div>
          <ul className="ai-list">{proposal.questions.map((q, i) => <li key={i}>{q}</li>)}</ul>
        </>
      )}

      {repairs.length > 0 && (
        <>
          <div className="sect-label" style={{ marginTop: 14 }}>Repaired before import</div>
          {repairs.map(g => (
            <div className="diffgroup" key={g.kind}>
              <div className="sect-label">{g.label}<span className="spacer" />
                <span className="count">{g.items.length}</span>
              </div>
              {g.items.slice(0, 6).map((d, i) => (
                <div className="diffrow" key={i}>
                  <i className="dkind removed">−</i><span className="what">{d}</span>
                </div>
              ))}
              {g.items.length > 6 && <div className="ai-more">and {g.items.length - 6} more</div>}
            </div>
          ))}
        </>
      )}

      {proposal.reduced && (
        <div className="warn" style={{ marginTop: 14 }}>
          <Icon name="layers" size={15} />
          <span>
            This provider could not compile the full schema, so a reduced one was used:
            <b> business flows and the technology table were not extracted</b>. Everything else
            was. You can add them by hand, or try a different model.
          </span>
        </div>
      )}

      <div className="warn" style={{ marginTop: 16 }}>
        <Icon name="alert" size={15} />
        <span>
          A model read a document and wrote this down. It is a <b>draft to check</b>, not a
          description of your system — the dependencies especially. Nothing here has been
          verified against anything.
        </span>
      </div>
    </>
  );
}

function Running({ filename }: { filename: string }) {
  return (
    <div className="ai-running">
      <b>Reading {filename}…</b>
      <span>
        One to three minutes. The whole document is read before anything comes back,
        so there is nothing to show until it does.
      </span>
    </div>
  );
}

/* ----------------------------------------------------- new from a document */

export function AnalyseNewDialog({ folderId, onClose, onCreated }: {
  folderId: string | null; onClose: () => void; onCreated: (id: string) => void;
}) {
  const status = useAiStatus();
  const [source, setSource] = useState<Source | null>(null);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState<'' | 'estimating' | 'analysing' | 'creating'>('');
  const [error, setError] = useState('');

  async function pick(file: File) {
    setError(''); setProposal(null); setEstimate(null);
    try {
      const s = await readSource(file);
      setSource(s);
      setBusy('estimating');
      setEstimate(await api.json<Estimate>('/api/ai/analyse', {
        method: 'POST', body: JSON.stringify({ ...s, estimate: true })
      }));
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(''); }
  }

  async function run() {
    if (!source) return;
    setBusy('analysing'); setError('');
    try {
      const p = await api.json<Proposal>('/api/ai/analyse', { method: 'POST', body: JSON.stringify(source) });
      setProposal(p);
      setName(p.document.meta?.name || source.filename.replace(/\.[^.]+$/, ''));
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(''); }
  }

  async function create() {
    if (!proposal) return;
    if (!name.trim()) { setError('Give it a name first.'); return; }
    setBusy('creating'); setError('');
    try {
      const p = await api.json<{ id: string }>('/api/projects', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), folderId, data: proposal.document })
      });
      onCreated(p.id);
    } catch (e) { setError((e as Error).message); setBusy(''); }
  }

  if (!status?.enabled) return null;

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxHeight: '86vh', overflowY: 'auto' }}>
        <h2>Read a document</h2>
        <p className="lede">
          A design document in, a first draft of the diagram out. Everything it produces is
          yours to correct afterwards — nothing here is locked.
        </p>

        <FilePicker status={status} source={source} onPick={pick} disabled={busy !== ''} />
        {!proposal && <Estimated estimate={estimate} status={status} />}

        {busy === 'analysing' ? <Running filename={source?.filename ?? 'the document'} /> : proposal && (
          <>
            <Findings proposal={proposal} />
            <label className="field" style={{ marginTop: 14 }}><span>Project name</span>
              <input className="input" value={name} onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && create()} />
            </label>
          </>
        )}

        {error && <div className="err">{error}</div>}
        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          {proposal ? (
            <button className="btn primary" onClick={create} disabled={busy !== ''}>
              {busy === 'creating' ? 'Creating…' : 'Create project'}
            </button>
          ) : (
            <button className="btn primary" onClick={run} disabled={!source || busy !== ''}>
              {busy === 'estimating' ? 'Measuring…' : busy === 'analysing' ? 'Reading…' : 'Analyse'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------- enrich an existing one */

const MERGE_LABELS: { key: keyof MergeOptions; label: string; hint: string }[] = [
  { key: 'addComponents', label: 'Add what is missing',
    hint: 'Components the document describes and this project does not have — with the scopes, layers, flows and technologies they need.' },
  { key: 'fillGaps', label: 'Fill the blanks',
    hint: 'Role, technologies and responsibilities on components that already exist — only where you have left the field empty. Nothing you have written is touched.' },
  { key: 'addDeps', label: 'Add missing dependencies',
    hint: 'Calls the document describes between components that exist. Existing dependencies are never removed.' }
];

export function EnrichDialog({ projectId, doc, onClose, onApply }: {
  projectId: string; doc: Architecture; onClose: () => void; onApply: (merged: Architecture) => void;
}) {
  const status = useAiStatus();
  const [source, setSource] = useState<Source | null>(null);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [opts, setOpts] = useState<MergeOptions>(DEFAULT_MERGE);
  const [busy, setBusy] = useState<'' | 'estimating' | 'analysing' | 'applying'>('');
  const [error, setError] = useState('');

  /* Re-merged on every toggle, so the diff below is always the change that the
   * button would actually apply — not a summary of the proposal in general. */
  const merged = useMemo(
    () => (proposal ? mergeProposal(doc, proposal.document, opts) : null),
    [proposal, doc, opts]
  );
  const diff = useMemo(() => (merged ? diffArchitecture(doc, merged) : null), [doc, merged]);
  const groups = useMemo(() => (diff ? byArea(diff) : []), [diff]);

  async function pick(file: File) {
    setError(''); setProposal(null); setEstimate(null);
    try {
      const s = await readSource(file);
      setSource(s);
      setBusy('estimating');
      setEstimate(await api.json<Estimate>('/api/ai/analyse', {
        method: 'POST', body: JSON.stringify({ ...s, projectId, estimate: true })
      }));
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(''); }
  }

  async function run() {
    if (!source) return;
    setBusy('analysing'); setError('');
    try {
      setProposal(await api.json<Proposal>('/api/ai/analyse', {
        method: 'POST', body: JSON.stringify({ ...source, projectId })
      }));
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(''); }
  }

  async function apply() {
    if (!merged) return;
    setBusy('applying'); setError('');
    try {
      /* A named checkpoint of the document as it stands, before the merge. The
       * automatic snapshot only fires five minutes after the last one, so
       * without this an enrichment applied straight after an edit would have
       * nothing in History to go back to — and "you can undo this" has to be
       * true at the moment it is offered, not on average. */
      await api.json(`/api/projects/${projectId}/revisions`, {
        method: 'POST', body: JSON.stringify({ label: 'Before enrichment' })
      });
      /* The editor owns the write: handing it the merged document lets its own
       * autosave persist it, rather than racing a second writer against it. */
      onApply(merged);
    } catch (e) { setError((e as Error).message); setBusy(''); }
  }

  if (!status?.enabled) return null;

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal wide" onClick={e => e.stopPropagation()} style={{ maxHeight: '86vh', overflowY: 'auto' }}>
        <h2>Enrich from a document</h2>
        <p className="lede">
          Reads a document against this project. It can only add — what you have already
          written is never overwritten, and applying leaves a version in History.
        </p>

        <FilePicker status={status} source={source} onPick={pick} disabled={busy !== ''} />
        {!proposal && <Estimated estimate={estimate} status={status} />}

        {busy === 'analysing' ? <Running filename={source?.filename ?? 'the document'} /> : proposal && (
          <>
            <Findings proposal={proposal} />

            <div className="sect-label" style={{ marginTop: 16 }}>What to apply</div>
            <div className="radio-row" style={{ flexWrap: 'wrap' }}>
              {MERGE_LABELS.map(o => (
                <button key={o.key} className={`radio${opts[o.key] ? ' on' : ''}`}
                  aria-pressed={opts[o.key]} title={o.hint}
                  onClick={() => setOpts(v => ({ ...v, [o.key]: !v[o.key] }))}>
                  <i /> {o.label}
                </button>
              ))}
            </div>
            <div className="hint">{MERGE_LABELS.find(o => opts[o.key])?.hint ?? 'Nothing selected — there is nothing to apply.'}</div>

            <div className="sect-label" style={{ marginTop: 16 }}>This will change
              <span className="spacer" />
              <span className="count">{diff && summarise(diff) ? summarise(diff) : 'nothing'}</span>
            </div>
            <div className="hist-diff" style={{ maxHeight: 260, overflowY: 'auto' }}>
              {groups.length === 0 ? (
                <p className="muted">Nothing — the document adds nothing this project does not already have.</p>
              ) : groups.map(g => (
                <div className="diffgroup" key={g.area}>
                  <div className="sect-label">{g.label}<span className="spacer" />
                    <span className="count">{g.changes.length}</span>
                  </div>
                  {g.changes.map((c, i) => (
                    <div className="diffrow" key={i}>
                      <i className={`dkind ${c.kind}`}>{c.kind === 'added' ? '+' : c.kind === 'removed' ? '−' : '~'}</i>
                      <span className="what">{c.label}</span>
                      {c.detail && <em>{c.detail}</em>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}

        {error && <div className="err">{error}</div>}
        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          {proposal ? (
            <button className="btn primary" onClick={apply} disabled={busy !== '' || !diff?.total}>
              {busy === 'applying' ? 'Applying…' : 'Apply to this project'}
            </button>
          ) : (
            <button className="btn primary" onClick={run} disabled={!source || busy !== ''}>
              {busy === 'estimating' ? 'Measuring…' : 'Analyse'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
