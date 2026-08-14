/* Tab bookkeeping, mirroring `buildTabs()` in viewer/engine.js.
 *
 * Two different switches decide whether a tab shows up, and the editor has to
 * respect both: built-in views are toggled through `ui.views`, while a custom
 * section is hidden by dropping its id from `ui.tabs`. `ui.tabs` also carries
 * the order — and, crucially, an id missing from a non-empty `ui.tabs` is
 * filtered out by the viewer. Adding a section without touching `ui.tabs`
 * would therefore author a tab nobody can reach. */

import type { Architecture, Section } from './types';

export type TabKind = 'builtin' | 'section';
export interface TabRow { id: string; label: string; kind: TabKind; visible: boolean }

const BUILTIN_LABELS: Record<string, string> = {
  overview: 'Overview', architecture: 'Architecture', flows: 'Flows', stack: 'Tech stack'
};

const sectionLabel = (s: Section) => s.tab || s.title || s.id;

/** Every tab the document could show, in the viewer's natural order. */
export function naturalTabs(doc: Architecture): { id: string; label: string; kind: TabKind }[] {
  const out: { id: string; label: string; kind: TabKind }[] = [
    { id: 'overview', label: BUILTIN_LABELS.overview, kind: 'builtin' }
  ];
  if (doc.components.length) out.push({ id: 'architecture', label: BUILTIN_LABELS.architecture, kind: 'builtin' });
  doc.sections.forEach(s => out.push({ id: s.id, label: sectionLabel(s), kind: 'section' }));
  if (doc.flows.length) out.push({ id: 'flows', label: BUILTIN_LABELS.flows, kind: 'builtin' });
  if (doc.technologies.length) out.push({ id: 'stack', label: BUILTIN_LABELS.stack, kind: 'builtin' });
  return out;
}

/** The tabs as the editor lists them: `ui.tabs` order first, hidden ones last. */
export function tabRows(doc: Architecture): TabRow[] {
  const natural = naturalTabs(doc);
  const byId = new Map(natural.map(t => [t.id, t]));
  const listed = (doc.ui.tabs || []).filter(id => byId.has(id));
  const ordered = [...listed.map(id => byId.get(id)!), ...natural.filter(t => !listed.includes(t.id))];

  return ordered.map(t => ({
    ...t,
    visible: t.kind === 'builtin'
      ? doc.ui.views?.[t.id as keyof NonNullable<Architecture['ui']['views']>] !== false
      : !listed.length || listed.includes(t.id)
  }));
}

/** Write an explicit order back. Hidden sections are the ones left out. */
export function writeTabs(doc: Architecture, rows: TabRow[]): void {
  doc.ui.tabs = rows.filter(r => r.kind === 'builtin' || r.visible).map(r => r.id);
  doc.ui.views = { ...doc.ui.views };
  rows.filter(r => r.kind === 'builtin').forEach(r => {
    (doc.ui.views as Record<string, boolean>)[r.id] = r.visible;
  });
}

/** Slot a freshly created section into `ui.tabs`, next to the existing ones. */
export function registerSectionTab(doc: Architecture, id: string): void {
  const tabs = doc.ui.tabs;
  if (!tabs?.length || tabs.includes(id)) return;
  const others = new Set(doc.sections.map(s => s.id).filter(s => s !== id));
  let at = -1;
  tabs.forEach((t, i) => { if (others.has(t)) at = i; });
  if (at < 0) tabs.push(id); else tabs.splice(at + 1, 0, id);
}

export function unregisterTab(doc: Architecture, id: string): void {
  if (doc.ui.tabs) doc.ui.tabs = doc.ui.tabs.filter(t => t !== id);
}

/** Reordering the sections list should move their tabs too, in place. */
export function resyncSectionOrder(doc: Architecture): void {
  const tabs = doc.ui.tabs;
  if (!tabs?.length) return;
  const ordered = doc.sections.map(s => s.id).filter(id => tabs.includes(id));
  const slots = new Set(ordered);
  let k = 0;
  doc.ui.tabs = tabs.map(id => (slots.has(id) ? ordered[k++] : id));
}
