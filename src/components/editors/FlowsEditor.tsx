'use client';

/* Flows are step-by-step journeys across the diagram. Each step points at a
 * component by id, which is why the step editor is a picker and not a text
 * field: a dangling reference is dropped on save and the step disappears. */

import { useState } from 'react';
import { Icon } from '../Icon';
import FlowPatterns from './FlowPatterns';
import { Area, CardList, Group, Panel, RICH_HINT, ScopePicker, Text } from './Fields';
import { slugify } from '@/lib/defaults';
import { api } from '@/lib/api';
import { insertFlow } from '@/lib/flows/apply';
import { toFlowPattern } from '@/lib/flows/derive';
import type { Architecture, Flow, FlowStep } from '@/lib/types';

type Patch = (fn: (d: Architecture) => Architecture) => void;

export default function FlowsEditor({ doc, patch }: { doc: Architecture; patch: Patch }) {
  const setFlows = (next: Flow[]) => patch(d => { d.flows = next; return d; });
  const compName = (id: string) => doc.components.find(c => c.id === id)?.name || id;
  const noComponents = doc.components.length === 0;

  const [picking, setPicking] = useState(false);
  /* The id of the flow currently being saved, so only its own button says so. */
  const [saving, setSaving] = useState<string | null>(null);

  /* Reads the document from React state rather than the database, so a pattern
   * saved before the 700 ms autosave has run still captures what is on screen —
   * which is what a button sitting next to the flow it copies has to do. */
  const saveAsPattern = async (flow: Flow) => {
    setSaving(flow.id);
    try {
      await api.json('/api/flow-templates/library', {
        method: 'POST',
        body: JSON.stringify(toFlowPattern(doc, flow, { from: doc.meta.name }))
      });
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(null);
    }
  };

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

        <div className="preset-row">
          <div>
            <b>Start from a pattern</b>
            <div className="hint">
              Authentication, checkout, inbound webhook, RAG query, CI/CD, asynchronous processing —
              plus anything you saved yourself. The steps come written; you bind each one to a component.
            </div>
          </div>
          <button className="btn sm" disabled={noComponents} onClick={() => setPicking(true)}>
            <Icon name="route" size={13} />Browse patterns
          </button>
        </div>

        <CardList<Flow>
          items={doc.flows}
          onChange={setFlows}
          addLabel="Add a flow"
          empty="No flow yet. The Flows tab stays hidden until there is one."
          duplicate={f => ({
            ...structuredClone(f),
            id: slugify(`${f.name} copy`, doc.flows.map(x => x.id)),
            name: `${f.name} (copy)`
          })}
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
                duplicate={s => structuredClone(s)}
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

              <div className="preset-row" style={{ marginTop: 16, marginBottom: 0 }}>
                <div>
                  <b>Save as a pattern</b>
                  <div className="hint">
                    Kept in your library and offered in every project. The steps are stored by role,
                    not by component — ids mean nothing outside this document, so which component
                    takes each step is decided again on insert.
                  </div>
                </div>
                <button className="btn sm" disabled={flow.steps.length < 2 || saving === flow.id}
                  onClick={() => saveAsPattern(flow)}>
                  <Icon name="save" size={13} />{saving === flow.id ? 'Saving…' : 'Save'}
                </button>
              </div>
            </>
          )} />
      </Group>

      {picking && (
        <FlowPatterns doc={doc} onClose={() => setPicking(false)}
          onInsert={(pattern, bindings, name, group) =>
            patch(d => { insertFlow(d, { pattern, bindings, name, group }); return d; })} />
      )}
    </Panel>
  );
}
