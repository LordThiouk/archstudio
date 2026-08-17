/* Turning a reviewed pattern into a flow on the document.
 *
 * The one rule this module exists to enforce: **filter the bindings against the
 * live components before pushing anything**. `normalizeArchitecture` runs on
 * every save and silently drops a step whose component id does not resolve — so
 * a flow inserted with a stale binding would look complete in the editor and
 * come back from the next autosave with holes in it, with no error anywhere.
 * Filtering here is what makes "the inserted flow is valid immediately" true
 * rather than aspirational.
 *
 * Deliberately *not* idempotent, unlike `applyDesignDocumentPreset`. That
 * preset is a checklist of chapters, so applying it twice must be a no-op. A
 * flow pattern is a stencil: two checkout flows, one for web and one for
 * mobile, is an ordinary document. The second insert gets its own id and both
 * survive.
 */

import { fillFlowDefaults, flowCopy, slugify } from '../defaults';
import { ensureBuiltinTab } from '../tabs';
import type { Architecture, Flow, FlowStep } from '../types';
import type { FlowPattern } from './types';

export interface FlowInsertion {
  pattern: FlowPattern;
  /** One entry per pattern step, in order. A null or dead id drops the step. */
  bindings: (string | null)[];
  /** Overrides the pattern's name. */
  name?: string;
  group?: string;
}

export interface FlowInsertResult { id: string; steps: number; dropped: number }

/**
 * Append the flow. Returns null — leaving `doc` untouched — when fewer than two
 * steps survive: a one-step flow is not a journey, and the same threshold
 * already governs template instantiation.
 */
export function insertFlow(doc: Architecture, ins: FlowInsertion): FlowInsertResult | null {
  const live = new Set(doc.components.map(c => c.id));
  const steps: FlowStep[] = [];
  let dropped = 0;

  ins.pattern.steps.forEach((step, i) => {
    const component = ins.bindings[i];
    if (!component || !live.has(component)) { dropped++; return; }
    steps.push({
      component,
      title: step.title,
      description: step.description?.trim()
        ? step.description
        : flowCopy(doc.meta.lang).stepDescription
    });
  });

  if (steps.length < 2) return null;

  const name = (ins.name || ins.pattern.name).trim() || ins.pattern.name;
  const group = ins.group || doc.components.find(c => c.id === steps[0].component)?.group;

  const flow = fillFlowDefaults({
    id: slugify(name, doc.flows.map(f => f.id)),
    name,
    ...(group ? { group } : {}),
    ...(ins.pattern.sub ? { sub: ins.pattern.sub } : {}),
    ...(ins.pattern.note ? { note: ins.pattern.note } : {}),
    steps
  }, doc.meta.lang);

  doc.flows.push(flow);
  ensureBuiltinTab(doc, 'flows');
  return { id: flow.id, steps: steps.length, dropped };
}
