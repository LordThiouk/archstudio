/* The printable design document — its outline, and nothing that renders.
 *
 * The viewer is tabbed and interactive; a design document is linear and
 * numbered. Same `Architecture`, second medium. This module decides what goes
 * where and under which number; `PaperDocument.tsx` draws it.
 *
 * Numbering is *derived*, never stored. A section carries a slot ("2.4") that
 * says where it belongs in the plan; the printed number comes from its position
 * once empty parts are dropped. Delete the tenancy chapter and the disaster
 * recovery one becomes 2.4 — no holes, no renumbering by hand.
 */

import type { Architecture, Flow, Section } from '../types';
import { t, type L10n, type Lang } from '../templates/types';

/* ------------------------------------------------------------------- model */

export type DocBody =
  /** meta.intro, the header facts, and the principle callout. */
  | { kind: 'intro' }
  | { kind: 'diagram' }
  /** Every component, by layer — the reference table for the diagram. */
  | { kind: 'inventory' }
  | { kind: 'section'; section: Section }
  | { kind: 'flow'; flow: Flow }
  | { kind: 'stack' };

export interface DocEntry {
  /** "2.3" — computed. */
  number: string;
  title: string;
  subtitle?: string;
  note?: string;
  body: DocBody;
}

export interface DocPart {
  /** "2" — computed. */
  number: string;
  title: string;
  /** Rendered under the part heading, before the first numbered entry. */
  lead: DocBody[];
  entries: DocEntry[];
}

export interface Outline {
  lang: Lang;
  title: string;
  parts: DocPart[];
}

/* The spine. Five parts mirroring the Architecture Design Document plan, plus
 * the appendices everything unslotted falls into. */
const PART_TITLES: Record<string, L10n> = {
  '1': { en: 'Introduction', fr: 'Introduction' },
  '2': { en: 'Application architecture', fr: 'Architecture applicative' },
  '3': { en: 'Organisation architecture', fr: "Architecture de l'organisation" },
  '4': { en: 'DevOps & delivery', fr: 'DevOps & livraison' },
  '5': { en: 'Cost estimation', fr: 'Estimation des coûts' },
  '6': { en: 'Appendices', fr: 'Annexes' }
};

const SPINE = ['1', '2', '3', '4', '5', '6'];
const APPENDIX = '6';

const GENERATED: Record<string, L10n> = {
  inventory: { en: 'Component inventory', fr: 'Inventaire des composants' },
  inventorySub: {
    en: 'Every component on the diagram above, with the scope that owns it and the technologies it runs on.',
    fr: 'Chaque composant du schéma ci-dessus, avec le périmètre qui le porte et les technologies employées.'
  },
  flow: { en: 'Flow — {name}', fr: 'Parcours — {name}' },
  stack: { en: 'Technology stack', fr: 'Pile technologique' },
  stackSub: {
    en: 'Every technology named in this document, and what uses it.',
    fr: 'Chaque technologie nommée dans ce document, et ce qui en dépend.'
  }
};

export const docLang = (doc: Architecture): Lang => (doc.meta?.lang === 'fr' ? 'fr' : 'en');

/* ------------------------------------------------------------------ slotting */

/** `"2.10"` → `[2, 10]`. A malformed slot sorts last rather than throwing. */
export function slotKey(chapter: string | undefined): number[] | null {
  if (!chapter) return null;
  const parts = String(chapter).trim().split('.').map(s => Number(s.trim()));
  if (!parts.length || parts.some(n => !Number.isFinite(n))) return null;
  return parts;
}

/** The part a section belongs to: its leading segment, or the appendices. */
export function partOf(section: Section): string {
  const key = slotKey(section.doc?.chapter);
  const head = key ? String(key[0]) : '';
  return SPINE.includes(head) && head !== APPENDIX ? head : APPENDIX;
}

function compareKeys(a: number[] | null, b: number[] | null, ia: number, ib: number): number {
  /* An unslotted section keeps its authoring order, behind every slotted one —
   * so adding a chapter to one section never reshuffles the others. */
  if (!a && !b) return ia - ib;
  if (!a) return 1;
  if (!b) return -1;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? -1) - (b[i] ?? -1);
    if (d) return d;
  }
  return ia - ib;
}

/* ------------------------------------------------------------------ outline */

export function buildOutline(doc: Architecture): Outline {
  const lang = docLang(doc);
  const s = (v: L10n) => t(v, lang);

  const buckets = new Map<string, { section: Section; key: number[] | null; index: number }[]>(
    SPINE.map(p => [p, []])
  );
  doc.sections.forEach((section, index) => {
    buckets.get(partOf(section))!.push({ section, key: slotKey(section.doc?.chapter), index });
  });
  buckets.forEach(list => list.sort((a, b) => compareKeys(a.key, b.key, a.index, b.index)));

  const sectionEntries = (part: string): DocEntry[] =>
    buckets.get(part)!.map(({ section }) => ({
      number: '',
      title: section.title || section.tab || section.id,
      subtitle: section.subtitle,
      note: section.note,
      body: { kind: 'section', section } as DocBody
    }));

  const hasIntro = !!(doc.meta.intro || doc.meta.principle || doc.meta.facts?.length);
  const parts: DocPart[] = SPINE.map(part => {
    const lead: DocBody[] = [];
    const entries: DocEntry[] = [];

    if (part === '1' && hasIntro) lead.push({ kind: 'intro' });
    if (part === '2' && doc.components.length) {
      lead.push({ kind: 'diagram' });
      entries.push({
        number: '', title: s(GENERATED.inventory), subtitle: s(GENERATED.inventorySub),
        body: { kind: 'inventory' }
      });
    }

    entries.push(...sectionEntries(part));

    if (part === APPENDIX) {
      doc.flows.forEach(flow => entries.push({
        number: '',
        title: s(GENERATED.flow).replace('{name}', flow.name),
        subtitle: flow.sub,
        note: flow.note,
        body: { kind: 'flow', flow }
      }));
      if (doc.technologies.length) entries.push({
        number: '', title: s(GENERATED.stack), subtitle: s(GENERATED.stackSub),
        body: { kind: 'stack' }
      });
    }

    return { number: '', title: s(PART_TITLES[part]), lead, entries };
  }).filter(p => p.lead.length || p.entries.length);

  parts.forEach((p, i) => {
    p.number = String(i + 1);
    p.entries.forEach((e, j) => { e.number = `${p.number}.${j + 1}`; });
  });

  return { lang, title: doc.meta.title || doc.meta.name || 'Architecture', parts };
}

/** Flat table of contents — heading level 1 for parts, 2 for their entries. */
export function toc(outline: Outline): { number: string; title: string; level: 1 | 2 }[] {
  return outline.parts.flatMap(p => [
    { number: p.number, title: p.title, level: 1 as const },
    ...p.entries.map(e => ({ number: e.number, title: e.title, level: 2 as const }))
  ]);
}

/** Anchor id for a numbered heading, stable enough for internal links. */
export const anchor = (number: string) => `ch-${number.replace(/\./g, '-')}`;

/** Mirrors the viewer: from four layers up, the bottom one carries no edges. */
export function supportLayerId(doc: Architecture): string | null {
  const s = doc.ui.supportLayer;
  if (s === false) return null;
  if (s) return s;
  return doc.layers.length >= 4 ? doc.layers[doc.layers.length - 1].id : null;
}
