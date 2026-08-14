'use client';

/* The tech-stack table. `category` drives the filter chips in the viewer and
 * `groups` the "used by" markers, so both are offered as picks over what the
 * document already contains rather than as free text alone. */

import { Area, CardList, Group, Panel, RICH_HINT, Text } from './Fields';
import type { Architecture, Technology } from '@/lib/types';

type Patch = (fn: (d: Architecture) => Architecture) => void;

export default function StackEditor({ doc, patch }: { doc: Architecture; patch: Patch }) {
  const categories = [...new Set(doc.technologies.map(t => t.category).filter(Boolean))] as string[];

  return (
    <Panel title="Tech stack"
      subtitle="Everything running in production, filterable by category and scope.">

      <Group title="View heading">
        <Text label="Title override" value={doc.ui.stack?.title || ''} placeholder="Tech stack"
          onChange={v => patch(d => { d.ui.stack = { ...d.ui.stack, title: v || undefined }; return d; })} />
        <Area label="Subtitle" value={doc.ui.stack?.subtitle || ''} hint={RICH_HINT}
          onChange={v => patch(d => { d.ui.stack = { ...d.ui.stack, subtitle: v || undefined }; return d; })} />
      </Group>

      <Group title={`Technologies (${doc.technologies.length})`}>
        <CardList<Technology>
          items={doc.technologies}
          onChange={next => patch(d => { d.technologies = next; return d; })}
          addLabel="Add a technology"
          empty="No technology yet. The Tech stack tab stays hidden until there is one."
          blank={() => ({ name: 'New technology', category: categories[0], groups: [] })}
          summary={t => t.name}
          badge={t => (t.category ? <span className="count">{t.category}</span> : null)}
          render={(tech, set) => (
            <>
              <div className="frow">
                <Text label="Name" value={tech.name} placeholder="PostgreSQL"
                  onChange={v => set(t => { t.name = v; })} />
                <label className="field"><span>Category</span>
                  <input className="input" list="stack-categories" value={tech.category || ''}
                    placeholder="Data" onChange={e => set(t => { t.category = e.target.value || undefined; })} />
                  <div className="hint">Categories become the filter chips above the table.</div>
                </label>
              </div>

              <Area label="Description" value={tech.description || ''} hint={RICH_HINT}
                placeholder="What it is used for here — not what it is in general."
                onChange={v => set(t => { t.description = v || undefined; })} />

              <div className="field">
                <span>Used by</span>
                <div className="chiprow">
                  {doc.groups.map(g => {
                    const on = (tech.groups || []).includes(g.id);
                    return (
                      <button key={g.id} className={`pickchip${on ? ' on' : ''}`} aria-pressed={on}
                        style={{ ['--c' as string]: g.color || 'var(--brand)' }}
                        onClick={() => set(t => {
                          const cur = t.groups || [];
                          t.groups = on ? cur.filter(x => x !== g.id) : [...cur, g.id];
                        })}>
                        <i />{g.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )} />

        <datalist id="stack-categories">
          {categories.map(c => <option key={c} value={c} />)}
        </datalist>
      </Group>
    </Panel>
  );
}
