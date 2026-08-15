import type { Architecture, Component, Link } from '@/lib/types';

/* Folding a proposal into a document that already exists.
 *
 * The rule the whole file follows: **what the author wrote wins.** A model that
 * has read one PDF knows less about this system than the person who has been
 * editing it, so nothing here overwrites a non-empty field, deletes anything,
 * or reorders anything. Enrichment can only add — new components, new
 * dependencies, and text in the gaps the author left empty.
 *
 * That makes the three options below safe to explain in a sentence each, which
 * matters more than granularity: a per-change checklist would be a better
 * feature and a worse thing to trust, because nobody audits forty checkboxes.
 * The whole apply is one `updateProject`, which snapshots first — so the real
 * undo is History, where the author can already see what changed and roll it
 * back. */

export interface MergeOptions {
  /** New components, and the scopes, layers, flows and technologies they need. */
  addComponents: boolean;
  /** Fill fields that are empty on components that already exist. Never overwrites. */
  fillGaps: boolean;
  /** Dependencies the proposal has and the document does not. */
  addDeps: boolean;
}

export const DEFAULT_MERGE: MergeOptions = { addComponents: true, fillGaps: true, addDeps: true };

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const filled = (s?: string): boolean => typeof s === 'string' && s.trim().length > 0;
const has = (a?: unknown[]): boolean => Array.isArray(a) && a.length > 0;

export function mergeProposal(
  current: Architecture,
  proposed: Partial<Architecture>,
  opts: MergeOptions
): Architecture {
  const out = clone(current);
  const proposedComponents = proposed.components ?? [];

  /* Scopes and layers come first: a new component needs somewhere to live.
   * Appended rather than inserted — a layer's position is its meaning (top is
   * what people touch, bottom is what everything rests on) and only the author
   * knows where a new tier belongs, so it lands at the bottom to be moved. */
  if (opts.addComponents) {
    for (const g of proposed.groups ?? []) {
      if (!out.groups.some(x => x.id === g.id)) out.groups.push(clone(g));
    }
    for (const l of proposed.layers ?? []) {
      if (!out.layers.some(x => x.id === l.id)) out.layers.push(clone(l));
    }
  }

  const existing = new Map(out.components.map(c => [c.id, c]));

  /* Which ids the finished document will hold — a dependency on a component
   * that is not being added is dropped here rather than silently downstream,
   * so the diff the reader approves is the change they actually get. */
  const willExist = new Set(out.components.map(c => c.id));
  if (opts.addComponents) for (const p of proposedComponents) willExist.add(p.id);

  for (const p of proposedComponents) {
    const target = existing.get(p.id);

    if (!target) {
      if (!opts.addComponents) continue;
      const deps = opts.addDeps ? (p.deps ?? []).filter(d => willExist.has(d) && d !== p.id) : [];
      out.components.push({
        ...clone(p),
        deps,
        links: opts.addDeps ? (p.links ?? []).filter(l => deps.includes(l.to)) : undefined
      });
      continue;
    }

    if (opts.fillGaps) fillComponent(target, p);
    if (opts.addDeps) addDependencies(target, p, willExist);
  }

  if (opts.addComponents) {
    for (const t of proposed.technologies ?? []) {
      if (!out.technologies.some(x => x.name.toLowerCase() === t.name.toLowerCase())) {
        out.technologies.push(clone(t));
      }
    }
    for (const f of proposed.flows ?? []) {
      if (out.flows.some(x => x.id === f.id)) continue;
      const steps = (f.steps ?? []).filter(s => willExist.has(s.component));
      if (steps.length) out.flows.push({ ...clone(f), steps });
    }
  }

  return out;
}

/** Only into the holes. A field the author has written in is never touched. */
function fillComponent(target: Component, p: Component): void {
  if (!filled(target.role) && filled(p.role)) target.role = p.role;
  if (!filled(target.url) && filled(p.url)) target.url = p.url;
  if (!filled(target.icon) && filled(p.icon)) target.icon = p.icon;
  if (!filled(target.badge) && filled(p.badge)) target.badge = p.badge;
  if (!has(target.tech) && has(p.tech)) target.tech = [...p.tech!];
  if (!has(target.features) && has(p.features)) target.features = [...p.features!];
  if (!has(target.notes) && has(p.notes)) target.notes = [...p.notes!];
}

function addDependencies(target: Component, p: Component, willExist: Set<string>): void {
  const deps = target.deps ?? (target.deps = []);
  const added: string[] = [];

  for (const d of p.deps ?? []) {
    if (d === target.id || !willExist.has(d) || deps.includes(d)) continue;
    deps.push(d);
    added.push(d);
  }

  /* An annotation only travels with an edge this merge just drew. Re-describing
   * an edge the author already has would be overwriting their words. */
  const newLinks = (p.links ?? []).filter(l => added.includes(l.to));
  if (!newLinks.length) return;
  const links: Link[] = target.links ?? (target.links = []);
  for (const l of newLinks) if (!links.some(x => x.to === l.to)) links.push({ ...l });
}
