'use client';

/* The history panel.
 *
 * The snapshots were always being written; what was missing is the only
 * question anyone actually asks of them — "what did I have then that I do not
 * have now". So the list is the index and the diff is the page: selecting a
 * version never shows the version, it shows what changed since it.
 *
 * The comparison is against the document held in the editor, not against what
 * is on disk. If there are unsaved edits in front of you, they are part of
 * "now", and pretending otherwise would make the panel lie for 700 ms.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from './Icon';
import { useAsk } from './Ask';
import { byArea, diffArchitecture, summarise, type ChangeKind } from '@/lib/diff';
import type { Architecture, RevisionRecord } from '@/lib/types';

/** SQLite stores `YYYY-MM-DD HH:MM:SS` in UTC, with no zone marker on it. */
const parseStamp = (s: string) => new Date(s.replace(' ', 'T') + 'Z');

function since(iso: string): string {
  const ms = Date.now() - parseStamp(iso).getTime();
  const min = Math.round(ms / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}

const stamp = (iso: string) =>
  parseStamp(iso).toLocaleString(undefined, {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  });

/* `+`, `−`, `~` rather than three coloured dots: circles are reserved for nodes
 * in a graph everywhere else in this app, and the glyph survives being read by
 * someone who cannot separate the two colours. */
const KIND_GLYPH: Record<ChangeKind, string> = { added: '+', removed: '−', changed: '~' };

export default function History({ projectId, doc, dirty, onClose, onRestore }: {
  projectId: string;
  doc: Architecture;
  dirty: boolean;
  onClose: () => void;
  onRestore: (data: Architecture) => void;
}) {
  const [list, setList] = useState<RevisionRecord[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [past, setPast] = useState<Architecture | null>(null);
  const [busy, setBusy] = useState(false);
  const ask = useAsk();
  const [error, setError] = useState('');

  const load = useCallback(async (select?: string) => {
    const rows: RevisionRecord[] = await fetch(`/api/projects/${projectId}/revisions`)
      .then(r => r.json());
    setList(rows);
    setPicked(p => select ?? (p && rows.some(r => r.id === p) ? p : rows[0]?.id ?? null));
  }, [projectId]);

  useEffect(() => { load().catch(() => setError('Could not read the history.')); }, [load]);

  /* The chosen snapshot's document, fetched on demand — the list deliberately
   * does not carry 30 full documents just to render 30 rows. */
  useEffect(() => {
    if (!picked) { setPast(null); return; }
    let alive = true;
    setPast(null);
    fetch(`/api/projects/${projectId}/revisions?revisionId=${encodeURIComponent(picked)}`)
      .then(r => r.json())
      .then(r => { if (alive) setPast(r.data ?? null); })
      .catch(() => { if (alive) setError('Could not read that version.'); });
    return () => { alive = false; };
  }, [projectId, picked]);

  const diff = useMemo(() => (past ? diffArchitecture(past, doc) : null), [past, doc]);
  const groups = useMemo(() => (diff ? byArea(diff) : []), [diff]);
  const current = list?.find(r => r.id === picked) ?? null;

  async function checkpoint() {
    const label = await ask.text({
      title: 'Save a checkpoint',
      body: 'A named version is never pruned — the thirty-snapshot cap only ever removes automatic ones.',
      label: 'Name', value: 'Sent to the client', confirmLabel: 'Save'
    });
    if (label === null) return;
    setBusy(true); setError('');
    try {
      const r: RevisionRecord = await fetch(`/api/projects/${projectId}/revisions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label })
      }).then(x => x.json());
      await load(r.id);
    } catch { setError('Could not save a checkpoint.'); }
    setBusy(false);
  }

  async function rename(rev: RevisionRecord) {
    const label = await ask.text({
      title: 'Name this version',
      body: 'A named version is kept for good. Clearing the name makes it an ordinary snapshot again, and it can then be pruned.',
      label: 'Name', value: rev.label ?? '', placeholder: 'Sent to the client',
      allowEmpty: true
    });
    if (label === null) return;
    setBusy(true);
    await fetch(`/api/projects/${projectId}/revisions`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ revisionId: rev.id, label })
    }).catch(() => setError('Could not rename it.'));
    await load(rev.id);
    setBusy(false);
  }

  async function remove(rev: RevisionRecord) {
    const ok = await ask.confirm({
      title: `Delete the version from ${stamp(rev.createdAt)}?`,
      body: 'The document itself is untouched — only this snapshot of it goes, and it cannot be brought back.',
      danger: true
    });
    if (!ok) return;
    setBusy(true);
    await fetch(`/api/projects/${projectId}/revisions?revisionId=${encodeURIComponent(rev.id)}`,
      { method: 'DELETE' }).catch(() => setError('Could not delete it.'));
    setPicked(null);
    await load();
    setBusy(false);
  }

  async function restore(rev: RevisionRecord) {
    const n = diff?.total ?? 0;
    const ok = await ask.confirm({
      title: `Restore the version from ${stamp(rev.createdAt)}?`,
      body: <>
        {n} change{n === 1 ? '' : 's'} made since then will be undone. The current version is kept
        in the history as <b>Before restore</b>, so this is reversible.
      </>,
      confirmLabel: 'Restore'
    });
    if (!ok) return;

    setBusy(true); setError('');
    try {
      const res = await fetch(`/api/projects/${projectId}/revisions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revisionId: rev.id })
      });
      if (!res.ok) throw new Error();
      const project = await res.json();
      onRestore(project.data);
      onClose();
    } catch { setError('Could not restore that version.'); setBusy(false); }
  }

  return (
    <>
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal wide" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>History</h2>
            <p className="lede">
              A snapshot is kept at most every five minutes while you edit. Pick one to see what
              changed since — the comparison is against what is in front of you right now.
            </p>
          </div>
          <button className="btn" onClick={checkpoint} disabled={busy}
            title="Snapshot the document as it stands, under a name of your choosing">
            <Icon name="flag" size={15} />Save a checkpoint
          </button>
        </div>

        {dirty && (
          <div className="warn">
            <Icon name="alert" size={15} />
            <span>You have edits that have not been saved yet. They count as “now” below, and
              restoring a version will discard them.</span>
          </div>
        )}
        {error && <div className="err">{error}</div>}

        {list === null ? (
          <div className="empty">Reading the history…</div>
        ) : list.length === 0 ? (
          <div className="empty">
            Nothing here yet. The first snapshot is written five minutes into your next edit —
            or right now, if you name a checkpoint.
          </div>
        ) : (
          <div className="hist">
            <div className="hist-list">
              {list.map(r => (
                <button key={r.id} className={`histrow${picked === r.id ? ' on' : ''}`}
                  onClick={() => setPicked(r.id)}>
                  <span className="when">{since(r.createdAt)}</span>
                  {r.label && <b>{r.label}</b>}
                  <span className="at">{stamp(r.createdAt)} · {r.componentCount} comp.</span>
                </button>
              ))}
            </div>

            <div className="hist-pane">
              {!current ? (
                <div className="empty">Pick a version on the left.</div>
              ) : !past ? (
                <div className="empty">Comparing…</div>
              ) : (
                <>
                  <div className="hist-paneh">
                    <div>
                      <b>Changed since {since(current.createdAt)}</b>
                      <span>{summarise(diff!) ?? 'Nothing — this version is identical to the current one.'}</span>
                    </div>
                    <div className="hist-acts">
                      <button className="iconbtn" title="Name this version" disabled={busy}
                        onClick={() => rename(current)}><Icon name="flag" size={15} /></button>
                      <button className="iconbtn danger" title="Delete this version" disabled={busy}
                        onClick={() => remove(current)}><Icon name="trash" size={15} /></button>
                      <button className="btn primary" disabled={busy || !diff?.total}
                        onClick={() => restore(current)}>
                        <Icon name="back" size={15} />Restore
                      </button>
                    </div>
                  </div>

                  <div className="hist-diff">
                    {groups.length === 0 ? (
                      <p className="muted">Nothing to show — the two documents match.</p>
                    ) : groups.map(g => (
                      <div className="diffgroup" key={g.area}>
                        <div className="sect-label">{g.label}<span className="spacer" />
                          <span className="count">{g.changes.length}</span>
                        </div>
                        {g.changes.map((c, i) => (
                          <div className="diffrow" key={i}>
                            <i className={`dkind ${c.kind}`}>{KIND_GLYPH[c.kind]}</i>
                            <span className="what">{c.label}</span>
                            {c.detail && <em>{c.detail}</em>}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
    {ask.dialog}
    </>
  );
}
