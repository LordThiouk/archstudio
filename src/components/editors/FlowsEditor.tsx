'use client';

/* Flows are step-by-step journeys across the diagram. Each step points at a
 * component by id, which is why the step editor is a picker and not a text
 * field: a dangling reference is dropped on save and the step disappears. */

import { Icon } from '../Icon';
import { Area, CardList, Group, Panel, RICH_HINT, ScopePicker, Text } from './Fields';
import { slugify } from '@/lib/defaults';
import type { Architecture, Flow, FlowStep } from '@/lib/types';

type Patch = (fn: (d: Architecture) => Architecture) => void;

export default function FlowsEditor({ doc, patch }: { doc: Architecture; patch: Patch }) {
  const setFlows = (next: Flow[]) => patch(d => { d.flows = next; return d; });
  const compName = (id: string) => doc.components.find(c => c.id === id)?.name || id;
  const noComponents = doc.components.length === 0;

  return (
    <Panel title="Flows"
      subtitle="End-to-end journeys — which component takes over at each step.">

      <Group title="View heading">
        <div className="frow">
          <Text label="Title override" value={doc.ui.flows?.title || ''} placeholder="Flows"
            onChange={v => patch(d => { d.ui.flows = { ...d.ui.flows, title: v || undefined }; return d; })} />
          <Text label="Playback speed (ms per step)" value={String(doc.ui.flowSpeedMs ?? '')}
            placeholder="1500"
            onChange={v => patch(d => {
              const n = Number(v);
              d.ui.flowSpeedMs = v.trim() && Number.isFinite(n) ? n : undefined;
              return d;
            })} />
        </div>
        <Area label="Subtitle" value={doc.ui.flows?.subtitle || ''} hint={RICH_HINT}
          onChange={v => patch(d => { d.ui.flows = { ...d.ui.flows, subtitle: v || undefined }; return d; })} />
      </Group>

      <Group title={`Flows (${doc.flows.length})`}>
        {noComponents && (
          <div className="warnbox">
            <Icon name="alert" size={15} />
            A flow is a path through the diagram. Add components first — steps have nothing to point at.
          </div>
        )}

        <CardList<Flow>
          items={doc.flows}
          onChange={setFlows}
          addLabel="Add a flow"
          empty="No flow yet. The Flows tab stays hidden until there is one."
          blank={() => {
            const first = doc.components[0];
            return {
              id: slugify('flow', doc.flows.map(f => f.id)),
              name: 'New flow',
              group: first?.group,
              steps: first ? [{ component: first.id, title: 'First step' }] : []
            };
          }}
          summary={f => f.name}
          badge={f => <span className="count">{f.steps.length} steps</span>}
          render={(flow, set) => (
            <>
              <div className="frow">
                <Text label="Name" value={flow.name} onChange={v => set(f => { f.name = v; })} />
                <Text label="Subtitle" value={flow.sub || ''} placeholder="Consumer · under an hour"
                  onChange={v => set(f => { f.sub = v || undefined; })} />
              </div>
              <ScopePicker doc={doc} value={flow.group} onChange={v => set(f => { f.group = v; })} />
              <Area label="Side note" value={flow.note || ''} hint={RICH_HINT}
                placeholder="What breaks if a step fails, who owns the recovery."
                onChange={v => set(f => { f.note = v || undefined; })} />

              <div className="sect-label" style={{ marginTop: 14 }}>Steps</div>
              <CardList<FlowStep>
                items={flow.steps}
                onChange={next => set(f => { f.steps = next; })}
                addLabel="Add a step"
                empty="A flow with no step renders an empty card."
                blank={() => ({ component: doc.components[0]?.id ?? '', title: 'New step' })}
                summary={(s, i) => `${i + 1}. ${s.title || compName(s.component)}`}
                badge={s => <span className="count">{compName(s.component)}</span>}
                render={(step, setStep) => (
                  <>
                    <div className="frow">
                      <Text label="Title" value={step.title}
                        onChange={v => setStep(s => { s.title = v; })} />
                      <label className="field"><span>Component</span>
                        <select className="select" value={step.component}
                          onChange={e => setStep(s => { s.component = e.target.value; })}>
                          {!doc.components.some(c => c.id === step.component) && (
                            <option value={step.component}>{step.component} — missing</option>
                          )}
                          {doc.components.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </label>
                    </div>
                    <Area label="Description" value={step.description || ''} hint={RICH_HINT}
                      onChange={v => setStep(s => { s.description = v || undefined; })} />
                  </>
                )} />
            </>
          )} />
      </Group>
    </Panel>
  );
}
