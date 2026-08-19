/* Where a dropped card lands.
 *
 * The sheet has four kinds of drop target and three of them are nested inside
 * one another — a card sits in a band, a band sits in a layer — so "what is
 * under the pointer" has more than one true answer and the drop has to pick the
 * most specific one. That is `DEPTH`, read by the collision detection in
 * Editor.tsx; without it dnd-kit's default ranks by intersected *area* and the
 * biggest box wins, which is always the wrong one.
 *
 * The rest is `resolveDrop`: given what is being dragged and what it was
 * released over, say which layer, which zone and which position. It is a pure
 * function of the document because that is the half worth testing — the DOM
 * half is dnd-kit's and it already works.
 *
 * Target ids carry two values (a layer and a zone), and component ids are not
 * guaranteed to be slugs — an imported document brings its own. So the payload
 * is JSON rather than a separator someone's id could contain. */

import type { Architecture } from './types';

/** The palette's draggable. Dropping it creates rather than moves. */
export const PALETTE_NEW = 'palette:new';

export type DropKind = 'component' | 'band' | 'layer' | 'railzone';

/** Most specific wins. A card beats the band holding it, a band beats the row. */
export const DEPTH: Record<DropKind, number> = {
  component: 3,
  railzone: 3,
  band: 2,
  layer: 1
};

export const layerDropId = (layer: string) => `layer:${JSON.stringify([layer])}`;
export const bandDropId = (layer: string, zone: string | undefined) =>
  `band:${JSON.stringify([layer, zone ?? null])}`;
export const railZoneDropId = (zone: string) => `railzone:${JSON.stringify([zone])}`;

export interface ParsedDrop { kind: Exclude<DropKind, 'component'>; layer?: string; zone?: string }

export function parseDropId(id: string): ParsedDrop | null {
  const at = id.indexOf(':');
  if (at < 0) return null;
  const kind = id.slice(0, at);
  if (kind !== 'layer' && kind !== 'band' && kind !== 'railzone') return null;
  let parts: unknown;
  try { parts = JSON.parse(id.slice(at + 1)); } catch { return null; }
  if (!Array.isArray(parts)) return null;
  if (kind === 'layer') return { kind, layer: String(parts[0]) };
  if (kind === 'railzone') return { kind, zone: String(parts[0]) };
  return { kind, layer: String(parts[0]), zone: parts[1] == null ? undefined : String(parts[1]) };
}

export interface DropResult {
  /** The component being placed, or null when the palette is creating one. */
  componentId: string | null;
  layer: string;
  /** undefined is unzoned, and is a real answer rather than "unchanged". */
  zone: string | undefined;
  /** Insert in front of this component; undefined appends to the run. */
  before: string | undefined;
}

/** What a release means, or null when it means nothing. */
export function resolveDrop(
  doc: Architecture, activeId: string, overId: string | null
): DropResult | null {
  if (!overId || overId === activeId) return null;

  const creating = activeId === PALETTE_NEW;
  const active = creating ? null : doc.components.find(c => c.id === activeId);
  if (!creating && !active) return null;
  const componentId = active?.id ?? null;

  const known = (layer: string) => doc.layers.some(l => l.id === layer);
  /* A zone that has been deleted since the drag started is unzoned, which is the
   * same reading normalisation gives a stale `zone` — the two cannot disagree. */
  const zoneOf = (zone: string | undefined) =>
    (zone && doc.zones.some(z => z.id === zone) ? zone : undefined);

  /* Onto another card: take its place, and with it its layer *and its zone*.
   * Landing beside a card without joining what holds it would put the drawing
   * and the data at odds — the card would sit inside a rectangle it does not
   * belong to. */
  const target = doc.components.find(c => c.id === overId);
  if (target) {
    return { componentId, layer: target.layer, zone: zoneOf(target.zone), before: target.id };
  }

  const parsed = parseDropId(overId);
  if (!parsed) return null;

  if (parsed.kind === 'band') {
    if (!parsed.layer || !known(parsed.layer)) return null;
    return { componentId, layer: parsed.layer, zone: zoneOf(parsed.zone), before: undefined };
  }

  if (parsed.kind === 'layer') {
    if (!parsed.layer || !known(parsed.layer)) return null;
    /* The bare row, which on a zoned sheet is only the gutters between bands.
     * Too ambiguous to reassign a zone from, so the card keeps the one it had;
     * a new component from the palette has none to keep. */
    return { componentId, layer: parsed.layer, zone: zoneOf(active?.zone), before: undefined };
  }

  /* A zone row in the rail. This is the way into a zone that holds nothing yet:
   * an empty zone reserves no band, so it has no target on the sheet at all. */
  if (!active) return null;
  return {
    componentId: active.id, layer: active.layer, zone: zoneOf(parsed.zone), before: undefined
  };
}

/** Whether a resolved drop would change anything, so a no-op release does not
 *  land on the undo stack as a step with nothing in it. */
export function dropChangesAnything(doc: Architecture, drop: DropResult): boolean {
  if (!drop.componentId) return true;                       // a creation always does
  const list = doc.components;
  const at = list.findIndex(c => c.id === drop.componentId);
  if (at < 0) return false;
  const c = list[at];
  if (c.layer !== drop.layer || (c.zone ?? undefined) !== drop.zone) return true;

  /* Same row, same zone: only a change of position counts. Appending is a change
   * unless the card is already the last of its run. */
  const run = list.filter(x => x.layer === drop.layer && (x.zone ?? undefined) === drop.zone);
  if (!drop.before) return run[run.length - 1]?.id !== drop.componentId;
  const from = run.findIndex(x => x.id === drop.componentId);
  const to = run.findIndex(x => x.id === drop.before);
  return to >= 0 && to !== from && to !== from + 1;
}
