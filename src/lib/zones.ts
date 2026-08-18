/* Zones — the boundaries that cut across the layers.
 *
 * Layers are rows and scopes are colours, and neither can say "these six things
 * run on OpenShift" when three of them are front ends and three are APIs. That
 * boundary is the one every landscape diagram draws and the one this format had
 * no way to express: a region, nestable, crossing the rows.
 *
 * ------------------------------------------------------------------ geometry
 *
 * A zone is measured, not laid out. The sheet is HTML flow — that is what makes
 * it reflow when you zoom out — so a region spanning two rows cannot be a box in
 * the DOM: it would have to contain the rows. So the boxes are computed after
 * layout from the rects of what they hold, in the same pass that computes the
 * edges, and drawn into the same SVG behind the cards.
 *
 * Measuring alone is not enough, and this is the part that took a second pass to
 * get right. A rectangle around a zone's members on two rows is tall enough to
 * hold both, and an unrelated card on the row between them falls inside it —
 * which reads as a claim the document never made. Ordering the cards, padding
 * the box or tightening the union all leave it accidentally right rather than
 * right.
 *
 * So the space is *reserved*. Each bucket — the unzoned cards, then each zone —
 * owns a band of columns that is identical on every layer, and a card is placed
 * in its own bucket's band and nowhere else. A zone's rectangle can then only
 * contain what was placed in its band. See `bandPlan` below: it is arithmetic
 * rather than measured, because a card has a fixed width and a band's width is
 * therefore a column count.
 *
 * A band is reserved on layers where its zone has nothing, so a zoned sheet is
 * wider than the same sheet unzoned. That is the visible, honest price of a
 * boundary that means what it draws.
 *
 * ------------------------------------------------------------------- drawing
 *
 * Two stroke treatments, no third, and no hue — colour is scope's (rule 1):
 *
 *   solid   a thing that exists and can be pointed at — a platform, a vendor's
 *           estate. You could walk up to the rack.
 *   dashed  a logical boundary — a network zone, a gateway, the perimeter of
 *           this programme. It exists in a document, not in a rack.
 *
 * Everything else about a zone is carried by its label, which is always drawn.
 * Five dash patterns would be five things to look up; two plus a name is one.
 */

import type { Component, Layer, Zone } from './types';

export type ZoneKind = 'platform' | 'network' | 'gateway' | 'perimeter' | 'vendor';

export const ZONE_KINDS: ZoneKind[] = ['platform', 'network', 'gateway', 'perimeter', 'vendor'];

/** Kinds drawn with a solid rule: a boundary you could point at in a room. */
const PHYSICAL: ZoneKind[] = ['platform', 'vendor'];

export const zoneIsPhysical = (kind?: ZoneKind): boolean =>
  !!kind && PHYSICAL.includes(kind);

export const ZONE_KIND_LABELS: Record<ZoneKind, { en: string; fr: string }> = {
  platform: { en: 'platform', fr: 'plateforme' },
  network: { en: 'network zone', fr: 'zone réseau' },
  gateway: { en: 'gateway', fr: 'passerelle' },
  perimeter: { en: 'perimeter', fr: 'périmètre' },
  vendor: { en: 'third party', fr: 'tiers' }
};

export const ZONE_KIND_BLURBS: Record<ZoneKind, string> = {
  platform: 'Where it runs — a cluster, a runtime, a managed estate. Drawn solid.',
  network: 'A reachability boundary. What crosses it is what a firewall rule has to allow.',
  gateway: 'What is exposed, and the contracts it exposes. Usually holds very few components.',
  perimeter: 'The scope of a programme or a migration. Drawn on top of the others.',
  vendor: 'Someone else runs it. Its availability is a contract, not a deployment.'
};

export const isZoneKind = (v: unknown): v is ZoneKind =>
  typeof v === 'string' && (ZONE_KINDS as string[]).includes(v);

/* --------------------------------------------------------------- the tree */

export const zoneIndex = (zones: Zone[]): Map<string, Zone> =>
  new Map(zones.map(z => [z.id, z]));

/** Root-first, self last: `['internal', 'openshift']`. Empty when unzoned. */
export function ancestry(zoneId: string | undefined, by: Map<string, Zone>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  let at = zoneId;
  while (at && by.has(at) && !seen.has(at)) {
    seen.add(at);
    out.unshift(at);
    at = by.get(at)!.parent;
  }
  return out;
}

/** How many zones this one sits inside. A root zone is 0.
 *
 *  Drives the fill tint: the ground darkens by a hair per level, which is the
 *  only thing telling a reader that one neutral rectangle is inside another. */
export const zoneDepth = (zoneId: string, zones: Zone[]): number =>
  Math.max(0, ancestry(zoneId, zoneIndex(zones)).length - 1);

/** This zone and everything under it. */
export function withDescendants(zoneId: string, zones: Zone[]): Set<string> {
  const by = zoneIndex(zones);
  const out = new Set<string>([zoneId]);
  /* Walking up from every zone rather than down from this one: `ancestry`
   * already stops on a cycle, so this cannot loop even on data that survived
   * normalisation from somewhere else. */
  zones.forEach(z => { if (ancestry(z.id, by).includes(zoneId)) out.add(z.id); });
  return out;
}

/** How many levels of zone sit below this one. A leaf is 0. */
export function subtreeHeight(zoneId: string, zones: Zone[]): number {
  const by = zoneIndex(zones);
  let deepest = 0;
  zones.forEach(z => {
    const path = ancestry(z.id, by);
    const at = path.indexOf(zoneId);
    if (at >= 0) deepest = Math.max(deepest, path.length - 1 - at);
  });
  return deepest;
}

/** Gutter between two bands, in sheet pixels — `column-gap` on a banded grid in
 *  all three stylesheets. Every horizontal inset below has to fit inside it, or
 *  a zone's rule grazes the card in the neighbouring band. */
export const BAND_GUTTER = 24;

/** The inset between a zone's rule and what it holds, in sheet pixels.
 *
 *  Asymmetric, and for two different reasons. An outer zone is padded further
 *  out than its children on both axes, because two rules sitting on top of each
 *  other is the one thing that makes nesting unreadable once both boxes are the
 *  same neutral ink. But horizontally the whole ladder also has to fit inside
 *  `BAND_GUTTER`, since anything wider reaches into the next band; vertically
 *  there is no such ceiling, and the top inset additionally has to clear the
 *  label sitting on the box's own top edge.
 *
 *  Three levels is what the horizontal ladder holds: 7, 13, 19, all inside 24. */
export const zonePad = (zoneId: string, zones: Zone[]): { x: number; y: number } => {
  const height = subtreeHeight(zoneId, zones);
  return { x: 7 + 6 * height, y: 14 + 9 * height };
};

/* ------------------------------------------------------------- ordering */

/** The sort key that keeps a zone's members adjacent — and its nested zones
 *  adjacent to their parent's other members, which is what lets one measured
 *  rectangle hold a whole subtree.
 *
 *  Unzoned components key to the empty string and sort first: they are the
 *  common case and putting them at the front keeps a diagram that uses one zone
 *  from having its unzoned majority pushed around. */
export function zoneSortKey(component: Component, zones: Zone[]): string {
  const by = zoneIndex(zones);
  const path = ancestry(component.zone, by);
  const order = new Map(zones.map((z, i) => [z.id, i]));
  return path.map(id => String(order.get(id) ?? 999).padStart(3, '0')).join('.');
}

/** One run per zone within a layer, unzoned first, then zones in declaration
 *  order. Contiguity is the whole point: a run is a real element in the flow, so
 *  a wrapped row cannot interleave two zones' cards. */
export interface ZoneRun { zone?: string; items: Component[] }

export function layerRuns(components: Component[], zones: Zone[]): ZoneRun[] {
  const by = zoneIndex(zones);
  const order = new Map(zones.map((z, i) => [z.id, i]));
  const runs = new Map<string, Component[]>();

  components.forEach(c => {
    /* A component pointing at a zone that is not in the list is unzoned — the
     * same reading normalisation gives it, so the two cannot disagree. */
    const key = c.zone && by.has(c.zone) ? c.zone : '';
    const bucket = runs.get(key);
    if (bucket) bucket.push(c); else runs.set(key, [c]);
  });

  const keys = [...runs.keys()].sort((a, b) => {
    if (a === b) return 0;
    if (!a) return -1;
    if (!b) return 1;
    return (order.get(a) ?? 999) - (order.get(b) ?? 999);
  });
  return keys.map(k => ({ zone: k || undefined, items: runs.get(k)! }));
}

/* ------------------------------------------------------------- the bands
 *
 * A measured rectangle around a zone's members is not enough. A zone spanning
 * two rows gets a box tall enough to hold both, and an unrelated card on an
 * intermediate row falls inside it — which reads as a claim the document never
 * made. Padding, ordering and a tighter union do not fix that: the box is
 * accidentally right or accidentally wrong depending on where the cards land.
 *
 * What fixes it is reserving the space. Each bucket — the unzoned cards, then
 * each zone — gets a *band* of columns that is the same on every layer, so a
 * zone's rectangle can only ever contain the cards placed in its band. Nothing
 * foreign can be inside it, by construction rather than by luck.
 *
 * The plan is arithmetic, not measured: a card has a fixed width, so a band's
 * width is a column count, and a column count is something you can count. That
 * is what keeps this out of the measure pass and lets the print renderer agree
 * with the screen without a second layout.
 *
 * The cost is honest and visible: a band is reserved on layers where the zone
 * has nothing, so a zoned sheet is wider than the same sheet unzoned. That is
 * the price of a boundary that means what it draws.
 */

/** Six, the same number the density threshold uses: about what a 1440 px sheet
 *  holds on one row. A bucket needing more wraps inside its band rather than
 *  pushing every other band off the page. */
export const BAND_MAX = 6;

export interface Band {
  zone?: string;
  /** 1-based, for `grid-column`. */
  start: number;
  span: number;
}

export interface BandPlan {
  bands: Band[];
  /** Total columns the sheet reserves — `grid-template-columns` repeats this. */
  total: number;
  band: (zone?: string) => Band | undefined;
}

/** Zones in tree order, so a subtree's bands are contiguous and a parent's
 *  rectangle is one range of columns rather than two with a hole. */
export function zonesInTreeOrder(zones: Zone[]): Zone[] {
  const by = zoneIndex(zones);
  const order = new Map(zones.map((z, i) => [z.id, i]));
  const key = (z: Zone) => ancestry(z.id, by)
    .map(id => String(order.get(id) ?? 999).padStart(3, '0')).join('.');
  return [...zones].sort((a, b) => key(a).localeCompare(key(b)));
}

/** The column plan for a document: one band per bucket that holds a card
 *  somewhere, unzoned first, then the zones in tree order.
 *
 *  A zone with no *direct* members gets no band — its rectangle is the union of
 *  its descendants', which the measure pass already computes. Giving it one
 *  would reserve a column nothing can ever be placed in. */
export function bandPlan(components: Component[], zones: Zone[], layers: Layer[]): BandPlan {
  const by = zoneIndex(zones);
  const bucketOf = (c: Component) => (c.zone && by.has(c.zone) ? c.zone : undefined);

  /* Widest run wins: a band has to hold the layer where the bucket is busiest,
   * or that layer wraps inside a band sized for a quieter one. */
  const widest = new Map<string | undefined, number>();
  const buckets = new Set<string | undefined>();
  components.forEach(c => buckets.add(bucketOf(c)));
  (layers.length ? layers : [{ id: '', name: '' }]).forEach(layer => {
    const here = layers.length ? components.filter(c => c.layer === layer.id) : components;
    buckets.forEach(b => {
      const n = here.filter(c => bucketOf(c) === b).length;
      widest.set(b, Math.max(widest.get(b) ?? 0, n));
    });
  });

  const ordered: (string | undefined)[] = [
    ...(buckets.has(undefined) ? [undefined] : []),
    ...zonesInTreeOrder(zones).map(z => z.id).filter(id => buckets.has(id))
  ];

  const bands: Band[] = [];
  let at = 1;
  ordered.forEach(zone => {
    const span = Math.min(BAND_MAX, Math.max(1, widest.get(zone) ?? 0));
    bands.push({ zone, start: at, span });
    at += span;
  });

  const index = new Map(bands.map(b => [b.zone, b]));
  return { bands, total: at - 1, band: zone => index.get(zone) };
}

/* --------------------------------------------------------------- in use */

/** Zones holding at least one component, directly or through a descendant.
 *
 *  Drawn outermost first, so a nested box paints over its parent's fill rather
 *  than under it — the tint is what makes depth read, and it only stacks in one
 *  direction. */
export function zonesInUse(zones: Zone[], components: Component[]): Zone[] {
  const by = zoneIndex(zones);
  const held = new Set<string>();
  components.forEach(c => ancestry(c.zone, by).forEach(id => held.add(id)));
  return zones
    .filter(z => held.has(z.id))
    .sort((a, b) => ancestry(a.id, by).length - ancestry(b.id, by).length);
}

export const zoneOf = (zones: Zone[], id: string | undefined): Zone | undefined =>
  id ? zones.find(z => z.id === id) : undefined;

/** "OpenShift — platform", for a legend or a detail sheet. */
export function describeZone(zone: Zone, lang: 'en' | 'fr' = 'en'): string {
  return zone.kind ? `${zone.name} — ${ZONE_KIND_LABELS[zone.kind][lang]}` : zone.name;
}

/* --------------------------------------------------------------- geometry */

export interface Box { x: number; y: number; w: number; h: number }

/** The union of `boxes`, inflated by `pad`, or null when there is nothing.
 *
 *  Shared by all three renderers so the rectangle is the same shape on screen,
 *  in the export and on paper. Each surface measures its own runs — through
 *  `getBoundingClientRect` on the canvas, through `offsetLeft/offsetTop` on the
 *  scaled print stage — and hands the results here. */
export function inflatedUnion(boxes: Box[], pad: { x: number; y: number }): Box | null {
  if (!boxes.length) return null;
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const b of boxes) {
    x1 = Math.min(x1, b.x); y1 = Math.min(y1, b.y);
    x2 = Math.max(x2, b.x + b.w); y2 = Math.max(y2, b.y + b.h);
  }
  return {
    x: x1 - pad.x, y: y1 - pad.y,
    w: (x2 - x1) + pad.x * 2, h: (y2 - y1) + pad.y * 2
  };
}

/** A zone's rectangle as SVG. Geometry only — fill, stroke and dash live in the
 *  three stylesheets, keyed on the classes below, so a change to how a zone
 *  looks is a change to CSS and not to three renderers.
 *
 *  MIRRORED in `viewer/engine.js` (zoneSvg), which cannot import this. */
export function zoneSvg(zone: Zone, box: Box, depth: number, label: string): string {
  const cls = `zone zone-${zoneIsPhysical(zone.kind as ZoneKind) ? 'solid' : 'dashed'}`;
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<g class="${cls}" data-zone="${esc(zone.id)}" data-depth="${depth}">`
    + `<rect x="${box.x.toFixed(1)}" y="${box.y.toFixed(1)}" `
    + `width="${box.w.toFixed(1)}" height="${box.h.toFixed(1)}"/>`
    + `<text x="${(box.x + 9).toFixed(1)}" y="${(box.y + 11).toFixed(1)}">${esc(label)}</text>`
    + `</g>`;
}
