import { ICON_KEYS, slugify } from '@/lib/defaults';
import { LINK_KINDS } from '@/lib/links';
import type { Architecture, Component, Flow, Group, Layer, Link, LinkKind, Technology } from '@/lib/types';
import type { WireDocument } from './schema';

/* From the model's answer to a document the studio can open.
 *
 * Three jobs, in order: give every entity a well-formed id and repoint what
 * referenced the old one, drop the empty strings that the schema requires the
 * model to send for "I don't know", and record what had to be repaired.
 *
 * That last one is the point. `normalizeArchitecture` in the store already
 * makes any document structurally safe — it drops dependencies that point
 * nowhere and rebases unknown scopes — but it does so silently, which is right
 * for an import the author typed and wrong for a document a model proposed.
 * Here the same corrections are made explicitly and handed to the review
 * screen, so "it invented a dependency on a component it never defined" is
 * something the reader is told rather than something they have to notice. */

export interface Repair {
  /** Machine-readable so the review screen can group them; see REPAIR_LABELS. */
  kind: 'dep' | 'scope' | 'layer' | 'flow-step' | 'flow-scope' | 'tech-scope' | 'icon';
  detail: string;
}

export const REPAIR_LABELS: Record<Repair['kind'], string> = {
  dep: 'Dependencies pointing at a component that was never defined',
  scope: 'Components filed under a scope that was never defined',
  layer: 'Components filed under a layer that was never defined',
  'flow-step': 'Flow steps pointing at a component that was never defined',
  'flow-scope': 'Flows filed under a scope that was never defined',
  'tech-scope': 'Technologies attributed to a scope that was never defined',
  icon: 'Icons outside the studio’s set'
};

export interface Converted {
  document: Partial<Architecture>;
  repairs: Repair[];
}

const clean = (s: unknown): string => (typeof s === 'string' ? s.trim() : '');
const list = (a: unknown): string[] =>
  Array.isArray(a) ? a.map(clean).filter(Boolean) : [];

/** Stable, unique, url-safe ids — the model's are neither, reliably. */
function idMap(entities: { id: string; name: string }[], prefix: string): Map<string, string> {
  const taken = new Set<string>();
  const map = new Map<string, string>();
  entities.forEach((e, i) => {
    const raw = clean(e.id) || clean(e.name) || `${prefix}-${i + 1}`;
    const id = slugify(raw, taken) || `${prefix}-${i + 1}`;
    taken.add(id);
    /* Keyed on the model's own id so references can be repointed. A model that
     * emits the same id twice loses the second one's references rather than
     * silently merging two components — the duplicate is visible in review. */
    if (!map.has(clean(e.id))) map.set(clean(e.id), id);
  });
  return map;
}

export function toArchitecture(wire: WireDocument): Converted {
  const repairs: Repair[] = [];
  const note = (kind: Repair['kind'], detail: string) => repairs.push({ kind, detail });

  const groupIds = idMap(wire.groups || [], 'scope');
  const layerIds = idMap(wire.layers || [], 'layer');
  const compIds = idMap(wire.components || [], 'component');

  const groups: Group[] = (wire.groups || []).map(g => ({
    id: groupIds.get(clean(g.id))!,
    name: clean(g.name) || clean(g.id) || 'Scope',
    ...(clean(g.short) ? { short: clean(g.short) } : {}),
    ...(clean(g.description) ? { description: clean(g.description) } : {})
  }));

  const layers: Layer[] = (wire.layers || []).map(l => ({
    id: layerIds.get(clean(l.id))!,
    name: clean(l.name) || clean(l.id) || 'Layer',
    ...(clean(l.desc) ? { desc: clean(l.desc) } : {})
  }));

  const fallbackGroup = groups[0]?.id;
  const fallbackLayer = layers[0]?.id;

  const components: Component[] = (wire.components || []).map(c => {
    const id = compIds.get(clean(c.id))!;
    const name = clean(c.name) || id;

    let group = groupIds.get(clean(c.group));
    if (!group) {
      if (clean(c.group)) note('scope', `${name} → “${clean(c.group)}”`);
      group = fallbackGroup!;
    }
    let layer = layerIds.get(clean(c.layer));
    if (!layer) {
      if (clean(c.layer)) note('layer', `${name} → “${clean(c.layer)}”`);
      layer = fallbackLayer!;
    }

    const deps: string[] = [];
    for (const raw of list(c.deps)) {
      const target = compIds.get(raw);
      if (!target) { note('dep', `${name} → “${raw}”`); continue; }
      if (target === id) continue;                       /* self-dependency */
      if (!deps.includes(target)) deps.push(target);
    }

    const links: Link[] = [];
    for (const l of wire.links || []) {
      /* The annotations arrive in one flat list; each belongs to the component
       * it is `from`. One per target, and only where the edge exists. */
      if (compIds.get(clean(l?.from)) !== id) continue;
      const to = compIds.get(clean(l.to));
      if (!to || !deps.includes(to) || links.some(x => x.to === to)) continue;
      const kind = clean(l.kind);
      const link: Link = { to };
      if (LINK_KINDS.includes(kind as LinkKind)) link.kind = kind as LinkKind;
      if (clean(l.protocol)) link.protocol = clean(l.protocol);
      if (clean(l.note)) link.note = clean(l.note);
      if (link.kind || link.protocol || link.note) links.push(link);
    }

    let icon = clean(c.icon);
    if (icon && !(ICON_KEYS as readonly string[]).includes(icon)) {
      note('icon', `${name} → “${icon}”`);
      icon = '';
    }

    return {
      id, name, group, layer,
      ...(icon ? { icon } : {}),
      ...(clean(c.badge) ? { badge: clean(c.badge) } : {}),
      ...(clean(c.url) ? { url: clean(c.url) } : {}),
      ...(clean(c.role) ? { role: clean(c.role) } : {}),
      tech: list(c.tech),
      features: list(c.features),
      notes: list(c.notes),
      deps,
      ...(links.length ? { links } : {})
    };
  });

  const technologies: Technology[] = (wire.technologies || [])
    .filter(t => clean(t.name))
    .map(t => {
      const scopes: string[] = [];
      for (const raw of list(t.groups)) {
        const g = groupIds.get(raw);
        if (!g) { note('tech-scope', `${clean(t.name)} → “${raw}”`); continue; }
        if (!scopes.includes(g)) scopes.push(g);
      }
      return {
        name: clean(t.name),
        ...(clean(t.category) ? { category: clean(t.category) } : {}),
        ...(clean(t.description) ? { description: clean(t.description) } : {}),
        ...(scopes.length ? { groups: scopes } : {})
      };
    });

  const flowIds = idMap(wire.flows || [], 'flow');
  const flows: Flow[] = (wire.flows || []).map(f => {
    const name = clean(f.name) || 'Flow';
    /* The steps arrive in one flat list; the ones belonging to this flow, in
     * the order they were written. */
    const steps = (wire.flowSteps || [])
      .filter(s => clean(s?.flow) === clean(f.id))
      .map(s => {
        const component = compIds.get(clean(s.component));
        if (!component) {
          if (clean(s.component)) note('flow-step', `${name} → “${clean(s.component)}”`);
          return null;
        }
        return {
          component,
          title: clean(s.title) || name,
          ...(clean(s.description) ? { description: clean(s.description) } : {})
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);

    let group = groupIds.get(clean(f.group));
    if (!group) {
      if (clean(f.group)) note('flow-scope', `${name} → “${clean(f.group)}”`);
      /* A flow's scope colours its card; borrowing the first step's is a
       * better guess than the first scope in the document. */
      group = steps.length
        ? components.find(c => c.id === steps[0].component)?.group ?? fallbackGroup!
        : fallbackGroup!;
    }

    return {
      id: flowIds.get(clean(f.id))!,
      name,
      ...(clean(f.sub) ? { sub: clean(f.sub) } : {}),
      group,
      ...(clean(f.note) ? { note: clean(f.note) } : {}),
      steps
    };
  }).filter(f => f.steps.length > 0);

  const meta = wire.meta || ({} as WireDocument['meta']);
  const document: Partial<Architecture> = {
    meta: {
      lang: meta.lang === 'fr' ? 'fr' : 'en',
      name: clean(meta.name) || 'Analysed architecture',
      ...(clean(meta.tagline) ? { tagline: clean(meta.tagline) } : {}),
      ...(clean(meta.kicker) ? { kicker: clean(meta.kicker) } : {}),
      ...(clean(meta.intro) ? { intro: clean(meta.intro) } : {}),
      ...(clean(meta.principle) ? { principle: clean(meta.principle) } : {})
    },
    ...(groups.length ? { groups } : {}),
    ...(layers.length ? { layers } : {}),
    components,
    technologies,
    flows
  };

  return { document, repairs };
}

/** The repairs grouped for display, in the order REPAIR_LABELS declares them. */
export function byRepairKind(repairs: Repair[]): { kind: Repair['kind']; label: string; items: string[] }[] {
  return (Object.keys(REPAIR_LABELS) as Repair['kind'][])
    .map(kind => ({
      kind,
      label: REPAIR_LABELS[kind],
      items: repairs.filter(r => r.kind === kind).map(r => r.detail)
    }))
    .filter(g => g.items.length > 0);
}
