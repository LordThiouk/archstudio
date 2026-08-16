import { LINK_KINDS, linkIsEmpty } from './links';
import { displayLayerLabel } from './layers';
import type { Architecture, Group, Link, Section, SectionType } from './types';

/* The Atelier scope palette: five cool hues, `oklch(0.62 0.11 h)` for
 * h = 200, 250, 290, 340, 150, lifted to L .72 / C .12 on a marine ground.
 * Equal lightness and equal chroma are the point — no scope dominates the
 * diagram, and every chip clears 3:1 against white (3.45–3.84), so the printed
 * page survives with background graphics on.
 *
 * Five, not six. A sixth group wraps to the first hue and the two become
 * indistinguishable, which is the honest ceiling for a categorical palette
 * built by hue rotation alone.
 *
 * Known trade-off, measured rather than assumed. Two things work against
 * separation here: lightness is held constant, and the five hues sit on a cool
 * arc rather than the full circle, which puts 250° and 290° only 40° apart.
 * Adjacent pairs measure ΔE 7.4 (OKLab×100) for normal vision, falling to 1.4
 * under deuteranopia and 1.9 under protanopia — both at 250°/290° — and 2.4
 * under tritanopia at 200°/250°. Widening the arc or spreading lightness is a
 * different palette, not a tweak. Scope is never carried by colour alone in
 * either medium — the diagram labels every card, and the legend and the
 * inventory table both name the scope in text — so this degrades rather than
 * fails. Change the hues or the L values below if you need the separation more
 * than the cool cast. */
export const PALETTE = ['#0099A0', '#4F8AC6', '#857AC4', '#B26B9B', '#519962'];
export const PALETTE_DARK = ['#14BBC2', '#67AAED', '#A497EA', '#D686BC', '#69BA7C'];

export const ICON_KEYS = [
  'cube', 'mobile', 'web', 'globe', 'scan', 'server', 'hub', 'plug', 'users', 'folder',
  'chat', 'db', 'bolt', 'box', 'chart', 'card', 'sms', 'mail', 'bell', 'map', 'bug',
  'docker', 'shield', 'cloud', 'cloudup', 'git', 'eye', 'save', 'lock', 'route',
  'cog', 'clock', 'flag', 'alert', 'key', 'layers', 'terminal', 'ai'
] as const;

/* Folders are workspace furniture, not scopes, so the set ends on a neutral
 * rather than reaching for a sixth hue the scope palette does not have. */
export const FOLDER_COLORS = [...PALETTE, '#6B8296'];

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
    theme: { brand: '#0E7C8A', brandDark: '#00E5FF', logo: 'cube' },
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
    layers: (input.layers?.length ? input.layers : base.layers).map(layer => {
      const lang = input.meta?.lang === 'fr' ? 'fr' : 'en';
      const slugName = !layer.name || layer.name === layer.id || /^[a-z0-9_-]+$/.test(layer.name);
      return {
        ...layer,
        name: slugName ? displayLayerLabel(layer.id, lang) : displayLayerLabel(layer.name, lang)
      };
    }),
    components: input.components || [],
    technologies: input.technologies || [],
    flows: input.flows || [],
    sections: input.sections || []
  };

  const groupIds = new Set(doc.groups.map(g => g.id));
  const layerIds = new Set(doc.layers.map(l => l.id));
  const compIds = new Set(doc.components.map(c => c.id));

  doc.components = doc.components.map(c => {
    const deps = (c.deps || []).filter(d => compIds.has(d) && d !== c.id);
    return {
      ...c,
      group: groupIds.has(c.group) ? c.group : doc.groups[0].id,
      layer: layerIds.has(c.layer) ? c.layer : doc.layers[0].id,
      tech: c.tech || [],
      features: c.features || [],
      notes: c.notes || [],
      deps,
      links: normalizeLinks(c.links, deps)
    };
  });

  /* A step pointing at a deleted component would crash the viewer, so those go.
   * A flow with no steps left is kept: it is almost always one being authored,
   * and dropping it here would delete the user's work on the next autosave. */
  doc.flows = doc.flows.map(f => ({ ...f, steps: (f.steps || []).filter(s => compIds.has(s.component)) }));

  return doc;
}

/** Keep only the annotations that describe a dependency this component still
 *  has: one per target, none empty, no invented kinds.
 *
 *  `deps` decides which edges exist and `links` only describes them, so the
 *  two can never disagree — deleting a dependency takes its annotation with
 *  it, and an import carrying a link to nowhere loses it here rather than
 *  surfacing as a phantom row in the inspector. Returns `undefined` when
 *  nothing survives, so a document that uses none of this exports exactly as
 *  it did before the field existed. */
function normalizeLinks(links: Link[] | undefined, deps: string[]): Link[] | undefined {
  if (!links?.length) return undefined;
  const allowed = new Set(deps);
  const seen = new Set<string>();
  const out: Link[] = [];

  for (const l of links) {
    if (!l || typeof l.to !== 'string' || !allowed.has(l.to) || seen.has(l.to)) continue;
    const clean: Link = { to: l.to };
    if (l.kind && LINK_KINDS.includes(l.kind)) clean.kind = l.kind;
    if (l.protocol?.trim()) clean.protocol = l.protocol.trim();
    if (l.note?.trim()) clean.note = l.note.trim();
    if (linkIsEmpty(clean)) continue;
    seen.add(l.to);
    out.push(clean);
  }

  return out.length ? out : undefined;
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
