'use client';

/* Order and visibility of the navigation. Built-in views are switched through
 * `ui.views`; a custom section is hidden by dropping it from `ui.tabs`. Both
 * are written by `writeTabs`, so the panel only deals in rows. */

import { Icon } from '../Icon';
import { Panel } from './Fields';
import { tabRows, writeTabs, type TabRow } from '@/lib/tabs';
import type { Architecture } from '@/lib/types';

type Patch = (fn: (d: Architecture) => Architecture) => void;

export default function TabsEditor({ doc, patch }: { doc: Architecture; patch: Patch }) {
  const rows = tabRows(doc);

  const apply = (next: TabRow[]) => patch(d => { writeTabs(d, next); return d; });

  const move = (i: number, to: number) => {
    if (to < 0 || to >= rows.length) return;
    const next = [...rows];
    [next[i], next[to]] = [next[to], next[i]];
    apply(next);
  };

  const toggle = (i: number) =>
    apply(rows.map((r, j) => (j === i ? { ...r, visible: !r.visible } : r)));

  return (
    <Panel title="Tabs"
      subtitle="What the navigation shows, and in which order. Hidden tabs keep their content."
      actions={doc.ui.tabs?.length
        ? <button className="btn sm" onClick={() => patch(d => { d.ui.tabs = undefined; return d; })}>
            Reset to natural order
          </button>
        : undefined}>

      <div className="tablist">
        {rows.map((r, i) => (
          <div className={`tabrow${r.visible ? '' : ' off'}`} key={r.id}>
            <button className={`eye${r.visible ? ' on' : ''}`} onClick={() => toggle(i)}
              title={r.visible ? 'Hide this tab' : 'Show this tab'} aria-pressed={r.visible}>
              <Icon name="eye" size={14} />
            </button>
            <b>{r.label}</b>
            <span className="mono id">{r.id}</span>
            <span className={`kind${r.kind === 'section' ? ' section' : ''}`}>
              {r.kind === 'section' ? 'section' : 'built-in'}
            </span>
            <button className="iconbtn" title="Move up" disabled={i === 0} onClick={() => move(i, i - 1)}>
              <Icon name="chevron" size={13} style={{ transform: 'rotate(-90deg)' }} />
            </button>
            <button className="iconbtn" title="Move down" disabled={i === rows.length - 1}
              onClick={() => move(i, i + 1)}>
              <Icon name="chevron" size={13} style={{ transform: 'rotate(90deg)' }} />
            </button>
          </div>
        ))}
      </div>

      <div className="hint" style={{ marginTop: 12 }}>
        A tab only appears once it has content: <b>Architecture</b> needs a component,
        <b> Flows</b> a flow, <b> Tech stack</b> a technology. Rename a section&apos;s tab from
        the Sections panel.
      </div>
    </Panel>
  );
}
