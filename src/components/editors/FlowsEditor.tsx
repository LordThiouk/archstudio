'use client';

/* Flows are step-by-step journeys across the diagram. Each step points at a
 * component by id, which is why the step editor is a picker and not a text
 * field: a dangling reference is dropped on save and the step disappears. */

import { useState } from 'react';
import { Icon } from '../Icon';
import FlowPatterns from './FlowPatterns';
import { Area, CardList, Group, Panel, RICH_HINT, ScopePicker, Text } from './Fields';
import { blankManualFlow, flowCopy, slugify } from '@/lib/defaults';
import { api } from '@/lib/api';
import { insertPlate } from '@/lib/flows/plate';
import { toFlowPattern } from '@/lib/flows/derive';
import { flowLinkReflections, orphanDiagramLinks, shortJourneyFlow } from '@/lib/flows/reflection';
import { ensureBuiltinTab } from '@/lib/tabs';
import type { LegoCatalogSnapshot } from '@/lib/lego/types';
import { describeLink } from '@/lib/links';
import type { Architecture, Flow, FlowStep } from '@/lib/types';

type Patch = (fn: (d: Architecture) => Architecture) => void;

function linkChipLabel(link: Parameters<typeof describeLink>[0], lang: 'en' | 'fr'): string {
  return describeLink(link, lang) || (lang === 'fr' ? 'relié' : 'linked');
}

export default function FlowsEditor({ doc, patch, catalog }: { doc: Architecture; patch: Patch; catalog: LegoCatalogSnapshot | null }) {
  const setFlows = (next: Flow[]) => patch(d => { d.flows = next; return d; });
  const compName = (id: string) => doc.components.find(c => c.id === id)?.name || id;
  const noComponents = doc.components.length === 0;
  const lang = doc.meta.lang === 'fr' ? 'fr' : 'en';
  const orphans = orphanDiagramLinks(doc.components, doc.flows);

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
            No bricks yet — a pattern can create the missing ones, or add components first for a manual flow.
          </div>
        )}

        <div className="preset-row">
          <div>
            <b>Start from a pattern</b>
            <div className="hint">
              Authentication, checkout, inbound webhook, RAG query, CI/CD, asynchronous processing —
              plus anything you saved yourself. Bind steps to existing bricks, create missing ones, or skip.
            </div>
          </div>
          <button className="btn sm" disabled={!catalog} onClick={() => setPicking(true)}>
            <Icon name="route" size={13} />Browse patterns
          </button>
        </div>

        {orphans.length > 0 && (
          <div className="flow-orphan-list">
            <div className="sect-label">{lang === 'fr' ? 'Liaisons hors parcours' : 'Links without a journey'}</div>
            {orphans.map(edge => (
              <div className="preset-row flow-orphan-row" key={`${edge.from}:${edge.to}`}>
                <div>
                  <b>{compName(edge.from)} → {compName(edge.to)}</b>
                  <div className="hint">
                    {linkChipLabel(edge.link, lang)}
                    {' · '}
                    {lang === 'fr'
                      ? 'Relié sur le diagramme, pas encore dans un flow.'
                      : 'Connected on the diagram, not yet in a flow.'}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => patch(d => {
                    const journey = shortJourneyFlow(d.components, edge, d.flows.map(f => f.id), d.meta.lang);
                    d.flows.push(journey);
                    ensureBuiltinTab(d, 'flows');
                    return d;
                  })}
                >
                  <Icon name="route" size={13} />
                  {lang === 'fr' ? 'Ajouter un parcours court' : 'Add short journey'}
                </button>
              </div>
            ))}
          </div>
        )}

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
          blank={() => blankManualFlow(doc)}
          summary={f => f.name}
          badge={f => <span className="count">{f.steps.length} steps</span>}
          render={(flow, set) => {
            const reflection = flowLinkReflections(doc.components, flow);
            return (
              <>
              <div className="frow">
                <Text label="Name" value={flow.name} onChange={v => set(f => { f.name = v; })} />
                <Text label="Subtitle" value={flow.sub || ''} placeholder={flowCopy(lang).sub}
                  onChange={v => set(f => { f.sub = v || undefined; })} />
              </div>
              <ScopePicker doc={doc} value={flow.group} onChange={v => set(f => { f.group = v; })} />
              <Area label="Side note" value={flow.note || ''} hint={RICH_HINT}
                placeholder={flowCopy(lang).note}
                onChange={v => set(f => { f.note = v || undefined; })} />

              <div className="sect-label" style={{ marginTop: 14 }}>Steps</div>
              <CardList<FlowStep>
                items={flow.steps}
                onChange={next => set(f => { f.steps = next; })}
                addLabel="Add a step"
                empty="A flow with no step renders an empty card."
                duplicate={s => structuredClone(s)}
                blank={() => ({
                  component: doc.components[0]?.id ?? '',
                  title: flowCopy(lang).newStep,
                  description: flowCopy(lang).stepDescription
                })}
                summary={(s, i) => `${i + 1}. ${s.title || compName(s.component)}`}
                badge={(s, i) => {
                  const connection = reflection.consecutive.find(item => item.afterStep === i - 1);
                  return (
                    <>
                      {connection && <span className="flow-link-chip">{linkChipLabel(connection.link, lang)}</span>}
                      <span className="count">{compName(s.component)}</span>
                    </>
                  );
                }}
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

              {reflection.nonAdjacent.map(connection => (
                <div className="flow-link-hint" key={`${connection.from}:${connection.to}`}>
                  <Icon name="route" size={13} />
                  {lang === 'fr' ? 'Ces étapes sont reliées sur le diagramme' : 'These steps are connected on the diagram'}
                  {' · '}{compName(connection.from)} → {compName(connection.to)}
                  {` · ${linkChipLabel(connection.link, lang)}`}
                </div>
              ))}

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
            );
          }} />
      </Group>

      {picking && catalog && (
        <FlowPatterns doc={doc} catalog={catalog} onClose={() => setPicking(false)}
          onInsert={(pattern, bindings, name, group) =>
            catalog && patch(d => { insertPlate(d, { pattern, bindings, name, group }, catalog); return d; })} />
      )}
    </Panel>
  );
}
