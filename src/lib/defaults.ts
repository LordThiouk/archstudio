import type { Architecture, Group, Section, SectionType } from './types';

/* The Atelier scope palette: five hues on one circle, `oklch(0.62 0.11 h)` for
 * h = 40, 110, 175, 250, 320, lifted to L .72 / C .12 on an ink ground. Equal
 * lightness and equal chroma are the point — no scope dominates the diagram,
 * and every chip clears 3:1 against paper, so the printed page survives with
 * background graphics on.
 *
 * Five, not six. A sixth group wraps to the first hue and the two become
 * indistinguishable, which is the honest ceiling for a categorical palette
 * built by hue rotation alone.
 *
 * Known trade-off, measured rather than assumed: holding lightness constant is
 * what costs this palette its colour-vision-deficiency separation. Adjacent
 * pairs are a comfortable ΔE 11.7 (OKLab×100) for normal vision, but fall to
 * 2.6 under deuteranopia (40°/110°) and 1.4 under tritanopia (175°/250°).
 * Restoring ΔE ≥ 7 needs a lightness spread of about 0.12 across the five,
 * which is a different palette, not a tweak. Scope is never carried by colour
 * alone in either medium — the diagram labels every card, and the legend and
 * the inventory table both name the scope in text — so this degrades rather
 * than fails. Vary the L values below if you need the separation more than the
 * flatness. */
export const PALETTE = ['#BE6E52', '#8A8C34', '#1F9B82', '#4F8AC6', '#A36FAF'];
export const PALETTE_DARK = ['#E4896A', '#A9AB4A', '#39BDA0', '#67AAED', '#C68BD3'];

export const ICON_KEYS = [
  'cube', 'mobile', 'web', 'globe', 'scan', 'server', 'hub', 'plug', 'users', 'folder',
  'chat', 'db', 'bolt', 'box', 'chart', 'card', 'sms', 'mail', 'bell', 'map', 'bug',
  'docker', 'shield', 'cloud', 'cloudup', 'git', 'eye', 'save', 'lock', 'route',
  'cog', 'clock', 'flag', 'alert', 'key', 'layers', 'terminal', 'ai'
] as const;

/* Folders are workspace furniture, not scopes, so the set ends on a neutral
 * rather than reaching for a sixth hue the scope palette does not have. */
export const FOLDER_COLORS = [...PALETTE, '#7A7263'];

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
    theme: { brand: '#B26A18', brandDark: '#E0A040', logo: 'cube' },
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

  /* A step pointing at a deleted component would crash the viewer, so those go.
   * A flow with no steps left is kept: it is almost always one being authored,
   * and dropping it here would delete the user's work on the next autosave. */
  doc.flows = doc.flows.map(f => ({ ...f, steps: (f.steps || []).filter(s => compIds.has(s.component)) }));

  return doc;
}

/* ---------------------------------------------------------------- sections */

export const SECTION_TYPES: { type: SectionType; label: string; blurb: string }[] = [
  { type: 'cards',    label: 'Cards',     blurb: 'A grid of titled cards with bullet points — the workhorse.' },
  { type: 'timeline', label: 'Timeline',  blurb: 'Dated phases down a line, with optional cards alongside.' },
  { type: 'table',    label: 'Table',     blurb: 'Free-form rows and columns, e.g. risks and their mitigations.' },
  { type: 'compare',  label: 'Compare',   blurb: 'Two or more poles side by side, plus a comparison table.' },
  { type: 'text',     label: 'Text',      blurb: 'Prose blocks — the least structured of the five.' }
];

/** A new section of `type`, with an id unique within `taken`. */
export function blankSection(type: SectionType, taken: Iterable<string>): Section {
  const label = SECTION_TYPES.find(s => s.type === type)?.label ?? 'Section';
  const base = { id: slugify(label, taken), tab: label, type, title: label, subtitle: '' };
  switch (type) {
    case 'cards':    return { ...base, items: [] };
    case 'timeline': return { ...base, lineTitle: '', items: [], aside: [] };
    case 'table':    return { ...base, columns: [{ label: 'Column' }, { label: 'Column' }], rows: [] };
    case 'compare':  return { ...base, columns: [] };
    case 'text':     return { ...base, blocks: [] };
  }
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
