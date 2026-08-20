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
import { STATE_LABELS, stateSign } from './lifecycle';
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

/** A link carrying nothing is noise — normalisation drops it. A transition mark
 *  counts as something to say, so an edge annotated with nothing but "removed"
 *  survives. */
export const linkIsEmpty = (l: Link): boolean =>
  !l.kind && !l.protocol?.trim() && !l.note?.trim() && !l.state;

/** "REST/HTTPS · synchronous · removed", or null when there is nothing to say.
 *
 *  The transition mark comes last: it is the newest of the three readings and
 *  the one a reader quoting the document in a meeting reaches for after the
 *  other two. */
export function describeLink(link: Link | undefined, lang: 'en' | 'fr' = 'en'): string | null {
  if (!link) return null;
  const bits = [
    link.protocol?.trim(),
    link.kind ? LINK_KIND_LABELS[link.kind][lang] : null,
    link.state ? STATE_LABELS[link.state][lang] : null
  ].filter(Boolean);
  return bits.length ? bits.join(' · ') : null;
}

/** The compact form for a chip in the inspector — "SQL · async · new". */
export function shortLink(link: Link | undefined): string | null {
  if (!link) return null;
  const bits = [link.protocol?.trim(), link.kind, link.state].filter(Boolean);
  return bits.length ? bits.join(' · ') : null;
}

/** Which kinds this document actually uses — a legend nobody needs is clutter,
 *  so both renderers ask this before drawing one. */
export function kindsInUse(components: Component[]): LinkKind[] {
  const seen = new Set<LinkKind>();
  components.forEach(c => (c.links || []).forEach(l => { if (l.kind) seen.add(l.kind); }));
  return LINK_KINDS.filter(k => seen.has(k));
}

/* ============================================================== protocols ==
 *
 * The protocol was already in the document and only ever visible in the
 * detail sheet, which is the wrong place: "which of these calls is not REST"
 * is a question you ask of the whole drawing at once, not one card at a time.
 *
 * So it goes on the line. What keeps that from turning into forty labels is
 * the convention every landscape diagram uses instead: name the protocol the
 * architecture speaks by default, and label only what departs from it. That is
 * `defaultProtocol`, and it is also what the note under the diagram says in
 * words — "all calls are REST unless the line says otherwise".
 *
 * Unset draws nothing, so a document written before this existed renders
 * exactly as it did. */

/** Which edges get their protocol drawn on the line.
 *
 *  `exceptions` is the landscape convention: only what differs from
 *  `defaultProtocol`. `all` labels every annotated edge — for a document with
 *  no dominant protocol to declare. `off` is today's behaviour. */
export type ProtocolLabels = 'off' | 'exceptions' | 'all';

export const PROTOCOL_LABEL_MODES: ProtocolLabels[] = ['off', 'exceptions', 'all'];

export interface ProtocolConvention {
  mode: ProtocolLabels;
  /** Trimmed, or undefined — never the empty string. */
  fallback?: string;
}

/** Resolve the pair of fields into the one thing the renderers need.
 *
 *  Naming a default protocol *is* the request to mark the exceptions, so it
 *  turns labels on by itself — an author who names one and then has to find a
 *  second switch has been asked the same question twice. `protocolLabels`
 *  overrides, which is how you keep the note and drop the labels. */
export function protocolConvention(
  arch?: { protocolLabels?: ProtocolLabels; defaultProtocol?: string }
): ProtocolConvention {
  const fallback = arch?.defaultProtocol?.trim() || undefined;
  return { mode: arch?.protocolLabels || (fallback ? 'exceptions' : 'off'), fallback };
}

/** The text to draw on `component → to`, or null when the line stays silent. */
export function edgeLabel(link: Link | undefined, conv: ProtocolConvention): string | null {
  if (conv.mode === 'off') return null;
  const protocol = link?.protocol?.trim();
  if (!protocol) return null;
  if (conv.mode === 'exceptions' && conv.fallback
      && protocol.toLowerCase() === conv.fallback.toLowerCase()) return null;
  return protocol;
}

/** What goes in the plate on the line: the transition sign, the protocol, or
 *  both — "+ JDBC", "- ODBC", "JDBC", "+".
 *
 *  The sign does not wait for a protocol convention to be declared: a document
 *  can describe a transition without ever naming a protocol, and then the plate
 *  exists only to carry the sign. Null when the line has nothing to say, which
 *  is the ordinary case and draws no plate at all. */
export function edgePlateText(link: Link | undefined, conv: ProtocolConvention): string | null {
  const bits = [stateSign(link?.state), edgeLabel(link, conv)].filter(Boolean);
  return bits.length ? bits.join(' ') : null;
}

export const PROTOCOL_NOTE = {
  en: (p: string) => `All calls are ${p} unless the line says otherwise.`,
  fr: (p: string) => `Tous les appels sont en ${p}, sauf mention contraire sur la ligne.`
};

/** The sentence under the diagram, or null when no default was declared. */
export function protocolNote(conv: ProtocolConvention, lang: 'en' | 'fr' = 'en'): string | null {
  return conv.fallback ? PROTOCOL_NOTE[lang](conv.fallback) : null;
}

/* ------------------------------------------------------------- the glyph */

/** Plate width for `text` at the label's 9 px monospace, without measuring.
 *
 *  Space Mono advances 0.6 em, so 5.4 px a character; 10 px of padding either
 *  side of that. Overshooting by a hair is harmless — the plate is opaque and
 *  a slightly wide one still reads as a tag on the line. */
export const labelPlateWidth = (text: string): number => text.length * 5.4 + 11;

/** The midpoint of the cubic `drawEdges` draws, at t = .5.
 *
 *  For `M(x1,y1) C(x1,y1+k1) (x2,y2+k2) (x2,y2)` the x term collapses to the
 *  plain average and the y term to `(y1+y2)/2 + 3(k1+k2)/8` — so a
 *  cross-layer edge (where k2 = -k1) labels on the straight-line midpoint, and
 *  a within-layer edge labels on the belly of its arc rather than inside the
 *  row it passes under. */
export function edgeMidpoint(
  x1: number, y1: number, k1: number, x2: number, y2: number, k2: number
): { x: number; y: number } {
  return { x: (x1 + x2) / 2, y: (4 * y1 + 4 * y2 + 3 * k1 + 3 * k2) / 8 };
}

/** The label as SVG, centred on the curve's midpoint.
 *
 *  An opaque plate rather than a halo: the line runs underneath and a stroked
 *  outline on 9 px type turns to mud at the print scale. Monospace because
 *  rule 3 — a protocol is something the machine knows.
 *
 *  MIRRORED in `viewer/engine.js` (edgeLabelSvg), which cannot import this. */
export function edgeLabelSvg(
  x1: number, y1: number, k1: number, x2: number, y2: number, k2: number, text: string
): string {
  const { x, y } = edgeMidpoint(x1, y1, k1, x2, y2, k2);
  const w = labelPlateWidth(text);
  const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<rect x="${(x - w / 2).toFixed(1)}" y="${(y - 6.5).toFixed(1)}" `
    + `width="${w.toFixed(1)}" height="13"/>`
    + `<text x="${x.toFixed(1)}" y="${(y + 3.2).toFixed(1)}">${esc}</text>`;
}
