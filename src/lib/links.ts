/* The grammar of an annotated dependency.
 *
 * The diagram already says *that* A calls B, and says it with two shapes: a
 * filled disc at the caller, an open circle at the callee. What it could not
 * say is whether the caller waits for the answer — which is the question every
 * resilience discussion actually turns on. That is carried by the stroke, not
 * by a colour: scope owns colour everywhere in this app, and a dashed line
 * survives a monochrome print and a reader who cannot separate two hues.
 *
 * Four surfaces draw or name an edge and all four read from here: the editor
 * canvas, the exported viewer (`viewer/engine.js`, which cannot import this
 * file and mirrors the table by hand), the printed document, and the inspector.
 */
import type { Component, Link, LinkKind } from './types';

export const LINK_KINDS: LinkKind[] = ['sync', 'async', 'batch'];

/** SVG `stroke-dasharray` per kind. Empty means a solid line.
 *
 * Unset reads as `sync`: an edge nobody has annotated is drawn exactly as it
 * was before this field existed, so adding the feature changed no diagram.
 *
 * MIRRORED in `viewer/engine.js` (LINK_DASH) and the print renderer. Change
 * all three together — the export has to look like the studio. */
export const LINK_DASH: Record<LinkKind, string> = {
  sync: '',
  async: '6 4',
  batch: '1.5 3.5'
};

export const LINK_KIND_LABELS: Record<LinkKind, { en: string; fr: string }> = {
  sync: { en: 'synchronous', fr: 'synchrone' },
  async: { en: 'asynchronous', fr: 'asynchrone' },
  batch: { en: 'batch', fr: 'batch' }
};

/** What each kind means, shown once in the editor rather than in a tooltip. */
export const LINK_KIND_BLURBS: Record<LinkKind, string> = {
  sync: 'The caller waits. If the callee is down, the caller is down.',
  async: 'Queued or evented. The callee being down delays work, it does not fail the caller.',
  batch: 'Scheduled or bulk. Failure is noticed on the next run, not by a user.'
};

export const dashFor = (kind?: LinkKind): string => (kind ? LINK_DASH[kind] : '');

/** The annotation on `component → to`, if there is one. */
export const linkOf = (component: Component, to: string): Link | undefined =>
  (component.links || []).find(l => l.to === to);

/** A link carrying nothing is noise — normalisation drops it. */
export const linkIsEmpty = (l: Link): boolean =>
  !l.kind && !l.protocol?.trim() && !l.note?.trim();

/** "REST/HTTPS · synchronous", or null when there is nothing to say. */
export function describeLink(link: Link | undefined, lang: 'en' | 'fr' = 'en'): string | null {
  if (!link) return null;
  const bits = [link.protocol?.trim(), link.kind ? LINK_KIND_LABELS[link.kind][lang] : null]
    .filter(Boolean);
  return bits.length ? bits.join(' · ') : null;
}

/** The compact form for a chip in the inspector — "SQL · async". */
export function shortLink(link: Link | undefined): string | null {
  if (!link) return null;
  const bits = [link.protocol?.trim(), link.kind].filter(Boolean);
  return bits.length ? bits.join(' · ') : null;
}

/** Which kinds this document actually uses — a legend nobody needs is clutter,
 *  so both renderers ask this before drawing one. */
export function kindsInUse(components: Component[]): LinkKind[] {
  const seen = new Set<LinkKind>();
  components.forEach(c => (c.links || []).forEach(l => { if (l.kind) seen.add(l.kind); }));
  return LINK_KINDS.filter(k => seen.has(k));
}
