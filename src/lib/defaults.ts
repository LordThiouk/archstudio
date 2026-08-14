import type { Architecture, Group } from './types';

/* Categorical palette validated for colour-vision deficiency on both surfaces:
 * OKLCH lightness band, chroma floor, adjacent-pair CVD ΔE ≥ 8, contrast ≥ 3:1. */
export const PALETTE = ['#28519F', '#D97706', '#0E9F6E', '#7C3AED', '#B03060', '#0E7490'];
export const PALETTE_DARK = ['#5B8DEF', '#C08018', '#17A272', '#9575E8', '#D2668F', '#3AA8C0'];

export const ICON_KEYS = [
  'cube', 'mobile', 'web', 'globe', 'scan', 'server', 'hub', 'plug', 'users', 'folder',
  'chat', 'db', 'bolt', 'box', 'chart', 'card', 'sms', 'mail', 'bell', 'map', 'bug',
  'docker', 'shield', 'cloud', 'cloudup', 'git', 'eye', 'save', 'lock', 'route',
  'cog', 'clock', 'flag', 'alert', 'key', 'layers', 'terminal', 'ai'
] as const;

export const FOLDER_COLORS = ['#28519F', '#D97706', '#0E9F6E', '#7C3AED', '#B03060', '#0E7490', '#64748B'];

export function paintGroups(groups: Group[]): Group[] {
  return groups.map((g, i) => ({
    ...g,
    color: g.color || PALETTE[i % PALETTE.length],
    colorDark: g.colorDark || PALETTE_DARK[i % PALETTE_DARK.length]
  }));
}

/** A new project starts with a usable skeleton, not an empty canvas. */
export function blankArchitecture(name = 'New architecture'): Architecture {
  return {
    meta: {
      lang: 'en',
      name,
      tagline: 'Architecture Explorer',
      title: name,
      intro: '',
      facts: []
    },
    theme: { brand: '#28519F', brandDark: '#5B8DEF', logo: 'cube' },
    ui: {
      defaultTheme: 'light',
      views: { overview: true, architecture: true, flows: true, stack: true }
    },
    groups: paintGroups([
      { id: 'core', name: 'Core', short: 'Core' },
      { id: 'vendor', name: 'Third parties', short: 'Vendors' }
    ]),
    layers: [
      { id: 'clients', name: 'Client channels', desc: 'Web · Mobile' },
      { id: 'services', name: 'Services & APIs', desc: 'Business logic' },
      { id: 'data', name: 'Data & storage', desc: 'OLTP · Cache · Objects' },
      { id: 'infra', name: 'Infrastructure', desc: 'Supports everything above' }
    ],
    components: [],
    technologies: [],
    flows: [],
    sections: []
  };
}

/** Fill in anything an imported or older document is missing. */
export function normalizeArchitecture(input: Partial<Architecture>): Architecture {
  const base = blankArchitecture(input.meta?.name || 'Imported architecture');
  const doc: Architecture = {
    ...base,
    ...input,
    meta: { ...base.meta, ...(input.meta || {}) },
    theme: { ...base.theme, ...(input.theme || {}) },
    ui: { ...base.ui, ...(input.ui || {}) },
    groups: paintGroups(input.groups?.length ? input.groups : base.groups),
    layers: input.layers?.length ? input.layers : base.layers,
    components: input.components || [],
    technologies: input.technologies || [],
    flows: input.flows || [],
    sections: input.sections || []
  };

  const groupIds = new Set(doc.groups.map(g => g.id));
  const layerIds = new Set(doc.layers.map(l => l.id));
  const compIds = new Set(doc.components.map(c => c.id));

  doc.components = doc.components.map(c => ({
    ...c,
    group: groupIds.has(c.group) ? c.group : doc.groups[0].id,
    layer: layerIds.has(c.layer) ? c.layer : doc.layers[0].id,
    tech: c.tech || [],
    features: c.features || [],
    notes: c.notes || [],
    deps: (c.deps || []).filter(d => compIds.has(d) && d !== c.id)
  }));

  doc.flows = doc.flows
    .map(f => ({ ...f, steps: (f.steps || []).filter(s => compIds.has(s.component)) }))
    .filter(f => f.steps.length);

  return doc;
}

/** Turn a display name into a stable, URL-safe id, unique within `taken`. */
export function slugify(name: string, taken: Iterable<string> = []): string {
  const used = new Set(taken);
  const base = (name || 'item')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    .slice(0, 40) || 'item';
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
