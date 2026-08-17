import { fillFlowDefaults, slugify } from '../defaults';
import { linkOf } from '../links';
import type { Component, Flow, Link } from '../types';

export interface ReflectedLink {
  from: string;
  to: string;
  link: Link;
}

export function flowLinkReflections(components: readonly Component[], flow: Flow): {
  consecutive: (ReflectedLink & { afterStep: number })[];
  nonAdjacent: ReflectedLink[];
} {
  const positions = new Map<string, number[]>();
  flow.steps.forEach((step, index) => {
    positions.set(step.component, [...(positions.get(step.component) || []), index]);
  });
  const consecutive: (ReflectedLink & { afterStep: number })[] = [];
  const nonAdjacent: ReflectedLink[] = [];

  for (const caller of components) {
    for (const to of caller.deps || []) {
      /* A diagram dependency is enough to reflect — annotation may be missing
       * on older docs or edges drawn before protocol prefill existed. */
      const link = linkOf(caller, to) ?? { to };
      const fromPositions = positions.get(caller.id);
      const toPositions = positions.get(to);
      if (!fromPositions?.length || !toPositions?.length) continue;
      const afterStep = fromPositions.find(index => toPositions.includes(index + 1));
      if (afterStep !== undefined) consecutive.push({ afterStep, from: caller.id, to, link });
      else nonAdjacent.push({ from: caller.id, to, link });
    }
  }

  return { consecutive, nonAdjacent };
}

/** Diagram edges whose endpoints are not both present in any document flow. */
export function orphanDiagramLinks(components: readonly Component[], flows: readonly Flow[]): ReflectedLink[] {
  const covered = new Set<string>();
  for (const flow of flows) {
    const ids = new Set(flow.steps.map(step => step.component));
    for (const caller of components) {
      for (const to of caller.deps || []) {
        if (ids.has(caller.id) && ids.has(to)) covered.add(`${caller.id}:${to}`);
      }
    }
  }
  const orphans: ReflectedLink[] = [];
  for (const caller of components) {
    for (const to of caller.deps || []) {
      const key = `${caller.id}:${to}`;
      if (covered.has(key)) continue;
      orphans.push({ from: caller.id, to, link: linkOf(caller, to) ?? { to } });
    }
  }
  return orphans;
}

export function shortJourneyFlow(
  components: readonly Component[],
  edge: ReflectedLink,
  existingFlowIds: readonly string[],
  lang?: string
): Flow {
  const from = components.find(component => component.id === edge.from);
  const to = components.find(component => component.id === edge.to);
  const fromName = from?.name || edge.from;
  const toName = to?.name || edge.to;
  return fillFlowDefaults({
    id: slugify(`${edge.from}-${edge.to}`, existingFlowIds),
    name: `${fromName} → ${toName}`,
    group: from?.group || to?.group,
    steps: [
      { component: edge.from, title: fromName },
      { component: edge.to, title: toName }
    ]
  }, lang);
}
