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
 * boundary that means what it draws — and a zone that only ever draws on one
 * layer pays it on all of them, which is what `stack` is for: it puts a zone on
 * a *shelf* below its neighbour, sharing that neighbour's columns, so the sheet
 * gets one band narrower and one shelf taller. The reservation still holds; it
 * is now a range of columns on a shelf rather than a range of columns.
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
  platform: 'Where it runs — a cluster, a runtime, a managed estate. Drawn solid. '
    + 'For hosting you only need to record and filter on, a component\'s "Deployed on" '
    + 'costs the sheet no width.',
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

/** Gap between two shelves of one column group, in sheet pixels — `row-gap` on a
 *  banded grid in all three stylesheets.
 *
 *  What `BAND_GUTTER` is horizontally, and sized by the same rule: the vertical
 *  inset ladder is 14, 23, 32, and the whole of it has to fit here or a shelved
 *  zone's rule reaches the card on the shelf above. Wider than the gutter because
 *  the ladder is — a zone's top inset also has to clear the label sitting on its
 *  own top edge, which has no horizontal equivalent. */
export const SHELF_GAP = 32;

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

/** Columns the whole sheet may reserve, across every band.
 *
 *  `BAND_MAX` caps one band; nothing capped their sum, so each zone added a
 *  column-load of width and a sheet with four of them ran off the right of the
 *  frame — where the editor has no zoom to pull it back, only a scrollbar to
 *  discover it with. Twelve columns is about 2 900 px, which fits a laptop at
 *  the viewer's Fit and stays scrollable everywhere else.
 *
 *  This is a ceiling, not a promise: a document with more buckets than columns
 *  gets one column each and is wider than this. One card per band is the floor,
 *  and below it there is nothing left to take. */
export const BAND_BUDGET = 12;

/** Shelves one column group may hold.
 *
 *  Height is the currency a shelf spends, and unlike width it is scrollable — so
 *  the ceiling is about reading, not fitting. Two boundaries stacked read as two
 *  boundaries; a column of six reads as a list, and a list of zones is the thing
 *  the bands were drawn to avoid being. Three is where it still reads as stacked.
 *
 *  It binds the automatic search and the explicit flag alike: a document that
 *  asked for a fourth shelf would draw one the editor could not have offered. */
export const SHELF_MAX = 3;

export interface Band {
  zone?: string;
  /** 1-based, for `grid-column`. */
  start: number;
  span: number;
  /** Which shelf of its column group holds this band, 0-based. Zero on a sheet
   *  that stacks nothing, which is every sheet drawn before `stack` existed.
   *
   *  Not a `grid-row` on its own: a shelf that is empty on a given layer must
   *  not leave a gap there, so the row line comes from `layerSlots`, which ranks
   *  the shelves that layer actually draws. */
  row: number;
}

export interface BandPlan {
  bands: Band[];
  /** Total columns the sheet reserves — `grid-template-columns` repeats this. */
  total: number;
  /** Shelves in the deepest column group. One when nothing is stacked. */
  rows: number;
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

/* --------------------------------------------------------------- shelving
 *
 * A column group is a range of columns holding one or more shelves; a shelf is
 * one row of buckets laid side by side. Without stacking there is one group per
 * bucket subtree and one shelf in each, which is the sheet exactly as it was.
 *
 * What makes a shelf safe is the same argument the bands rest on, turned on its
 * side. A zone's rectangle is the union of its family's runs *across every
 * layer*, so a zone drawing on layers 1 and 3 owns a rectangle that covers all
 * of layer 2 in its columns — and anything shelved under it there would fall
 * inside a boundary that never claimed it. So a group only gets a second shelf
 * when every bucket in it draws on a single layer. Then each rectangle is one
 * shelf on one layer: two on the same layer are different shelves, two on
 * different layers are different layers, and neither can hold the other.
 *
 * That is the case worth having anyway — a zone confined to one layer is
 * precisely the one paying for a band it barely uses.
 */

interface Shelf { buckets: (string | undefined)[] }
interface Group { root: string | undefined; shelves: Shelf[] }

/** Why a zone cannot take a shelf, phrased for a tooltip, or null if it can. */
export type Blocker = string | null;

/** Group the ordered buckets into column groups and shelves.
 *
 *  `reject` is how the editor gets its tooltip: the walk is where eligibility is
 *  actually decided, so asking it is the only way to be sure the reason given
 *  matches the drawing produced. */
function groupBuckets(
  ordered: (string | undefined)[],
  zones: Zone[],
  stacked: Set<string>,
  oneLayer: (bucket: string) => boolean,
  reject?: (bucket: string, why: string) => void
): Group[] {
  const by = zoneIndex(zones);
  const name = (id: string | undefined) => (id && by.get(id)?.name) || id || 'the unzoned cards';
  const groups: Group[] = [];

  ordered.forEach(bucket => {
    const group = groups[groups.length - 1] as Group | undefined;
    const shelf = group?.shelves[group.shelves.length - 1];

    /* A descendant stays on its ancestor's shelf. A subtree is contiguous in
     * tree order, and keeping it on one shelf is what keeps a parent's rectangle
     * a single range of columns on a single row rather than an L. */
    const inside = shelf?.buckets.find(b => b && bucket && ancestry(bucket, by).includes(b));
    if (bucket && inside) {
      if (stacked.has(bucket)) reject?.(bucket, `it sits inside "${name(inside)}"`);
      shelf!.buckets.push(bucket);
      return;
    }

    if (bucket && stacked.has(bucket)) {
      const why = shelfBlocker(bucket, group, by, oneLayer, name);
      if (!why) { group!.shelves.push({ buckets: [bucket] }); return; }
      reject?.(bucket, why);
    }

    groups.push({ root: bucket, shelves: [{ buckets: [bucket] }] });
  });

  return groups;
}

/** The three rules, in the order that gives the most useful message first. */
function shelfBlocker(
  bucket: string,
  group: Group | undefined,
  by: Map<string, Zone>,
  oneLayer: (bucket: string) => boolean,
  name: (id: string | undefined) => string
): Blocker {
  if (!group) return 'nothing is drawn before it';

  /* Onto a sibling, and never onto the unzoned cards. A zone slides within its
   * own level, the same restraint `moveZone` keeps: the drawing has no way to
   * show a zone that shelved itself out of its parent. */
  const root = group.root ? by.get(group.root) : undefined;
  if (!root) return 'the band before it holds the unzoned cards';
  if (root.parent !== by.get(bucket)?.parent) {
    return `"${name(group.root)}" before it is not at the same level`;
  }

  if (!oneLayer(bucket)) return 'it draws on more than one layer';
  const spread = group.shelves.flatMap(s => s.buckets).find(b => b && !oneLayer(b));
  if (spread) return `"${name(spread)}" draws on more than one layer`;

  if (group.shelves.length >= SHELF_MAX) return `${SHELF_MAX} zones are already stacked there`;

  return null;
}

/** Turn the groups into bands: columns accumulate per group, so two shelves of
 *  the same group start at the same column and the sheet only pays for the
 *  widest of them. */
function assignBands(groups: Group[], span: (bucket: string | undefined) => number): {
  bands: Band[]; total: number; rows: number;
} {
  const bands: Band[] = [];
  let at = 1;
  let rows = 1;

  groups.forEach(group => {
    const width = (shelf: Shelf) => shelf.buckets.reduce((w, b) => w + span(b), 0);
    group.shelves.forEach((shelf, row) => {
      let x = at;
      shelf.buckets.forEach(b => { bands.push({ zone: b, start: x, span: span(b), row }); x += span(b); });
    });
    rows = Math.max(rows, group.shelves.length);
    at += Math.max(...group.shelves.map(width));
  });

  return { bands, total: at - 1, rows };
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
  const ordered = bucketOrder(components, zones);

  /* Widest run wins: a band has to hold the layer where the bucket is busiest,
   * or that layer wraps inside a band sized for a quieter one. */
  const widest = new Map<string | undefined, number>();
  (layers.length ? layers : [{ id: '', name: '' }]).forEach(layer => {
    const here = layers.length ? components.filter(c => c.layer === layer.id) : components;
    ordered.forEach(b => {
      const n = here.filter(c => bucketOf(c) === b).length;
      widest.set(b, Math.max(widest.get(b) ?? 0, n));
    });
  });

  const oneLayer = layerConfined(components, zones);
  const spans = new Map(ordered.map(zone =>
    [zone, Math.min(BAND_MAX, Math.max(1, widest.get(zone) ?? 0))] as const));
  const width = (bucket: string | undefined) => spans.get(bucket) ?? 1;

  const stacked = new Set(zones.filter(z => z.stack && ordered.includes(z.id)).map(z => z.id));
  const replan = () => assignBands(groupBuckets(ordered, zones, stacked, oneLayer), width);
  let out = replan();

  /* Over budget, shelving is tried before narrowing: a shelf gives back a whole
   * band and costs one row of height, while narrowing gives back one column and
   * wraps the cards anyway. The zone that buys the most width goes first, and
   * ties go to the earliest so the result does not depend on file order.
   *
   * This is a layout decision and it stays one — nothing is written back to the
   * document, so widening the frame or deleting a component puts the sheet back
   * the way it was. */
  while (out.total > BAND_BUDGET) {
    let best: { bucket: string; total: number } | null = null;
    for (const bucket of ordered) {
      if (!bucket || stacked.has(bucket)) continue;
      stacked.add(bucket);
      const trial = replan();
      stacked.delete(bucket);
      if (trial.total < out.total && (!best || trial.total < best.total)) {
        best = { bucket, total: trial.total };
      }
    }
    if (!best) break;
    stacked.add(best.bucket);
    out = replan();
  }

  /* What is left is narrowed: the widest band gives up a column at a time, so
   * the pressure lands on whatever is making the drawing wide rather than being
   * spread evenly over buckets that were already narrow. A band that loses a
   * column does not lose a card — it wraps inside itself and the layer grows
   * taller, which is the trade a reader can actually scroll. */
  const groups = groupBuckets(ordered, zones, stacked, oneLayer);
  while (out.total > BAND_BUDGET) {
    let pick: string | undefined;
    let picked = 1;
    let found = false;
    for (const bucket of ordered) {
      if (width(bucket) > picked) { pick = bucket; picked = width(bucket); found = true; }
    }
    if (!found) break;   // every band is down to one column
    spans.set(pick, picked - 1);
    out = assignBands(groups, width);
  }

  const index = new Map(out.bands.map(b => [b.zone, b]));
  return { ...out, band: zone => index.get(zone) };
}

/** The buckets that get a band, in the order they are laid out: the unzoned
 *  cards first, then the zones holding a card directly, in tree order. */
function bucketOrder(components: Component[], zones: Zone[]): (string | undefined)[] {
  const by = zoneIndex(zones);
  const buckets = new Set<string | undefined>();
  components.forEach(c => buckets.add(c.zone && by.has(c.zone) ? c.zone : undefined));
  return [
    ...(buckets.has(undefined) ? [undefined] : []),
    ...zonesInTreeOrder(zones).map(z => z.id).filter(id => buckets.has(id))
  ];
}

/** Does this bucket's whole family draw on a single layer? Memoised: the
 *  shelving search asks it once per bucket per trial plan. */
function layerConfined(components: Component[], zones: Zone[]): (bucket: string) => boolean {
  const cache = new Map<string, boolean>();
  return bucket => {
    const hit = cache.get(bucket);
    if (hit !== undefined) return hit;
    const family = withDescendants(bucket, zones);
    const seen = new Set<string>();
    components.forEach(c => { if (c.zone && family.has(c.zone)) seen.add(c.layer); });
    const ok = seen.size <= 1;
    cache.set(bucket, ok);
    return ok;
  };
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

/** Move a zone one place earlier or later *among its own siblings*.
 *
 *  Not a plain array swap. Band order comes from `zonesInTreeOrder`, where the
 *  array index only ever breaks ties between zones sharing a parent — so
 *  swapping with whatever happens to sit next in the array usually moves
 *  nothing at all, and a button that sometimes does nothing is worse than no
 *  button. This swaps with the nearest zone at the same level, which is exactly
 *  the movement the drawing shows: the band slides one place left or right, and
 *  its children follow it because their keys are built from its index.
 *
 *  Returns the list unchanged when there is no sibling that way, so the caller
 *  can compare identity to decide whether the button is live. */
export function moveZone(zones: Zone[], id: string, delta: -1 | 1): Zone[] {
  const at = zones.findIndex(z => z.id === id);
  if (at < 0) return zones;
  const parent = zones[at].parent;

  const siblings = zones
    .map((z, i) => ({ z, i }))
    .filter(({ z }) => z.parent === parent);
  const seat = siblings.findIndex(({ z }) => z.id === id);
  const target = siblings[seat + delta];
  if (!target) return zones;

  const out = [...zones];
  [out[at], out[target.i]] = [out[target.i], out[at]];
  return out;
}

/** Has this zone a sibling in that direction? Drives the buttons' disabled state. */
export const canMoveZone = (zones: Zone[], id: string, delta: -1 | 1): boolean =>
  moveZone(zones, id, delta) !== zones;

/** Ask for a shelf, or give one up. Returns the list unchanged when the flag is
 *  already what was asked for, so the caller can compare identity. */
export function stackZone(zones: Zone[], id: string, on: boolean): Zone[] {
  const at = zones.findIndex(z => z.id === id);
  if (at < 0 || (zones[at].stack === true) === on) return zones;
  const out = [...zones];
  const next = { ...out[at] };
  if (on) next.stack = true; else delete next.stack;
  out[at] = next;
  return out;
}

/** Why shelving this zone would change nothing, phrased for a tooltip — or null
 *  when it would work.
 *
 *  Asks the same walk that lays the sheet out rather than re-deriving the rules,
 *  because a button explaining one thing while the drawing does another is worse
 *  than a button with no explanation at all. */
export function stackBlocker(components: Component[], zones: Zone[], id: string): Blocker {
  const ordered = bucketOrder(components, zones);
  if (!ordered.includes(id)) return 'it holds no component of its own yet';

  const asked = new Set(zones.filter(z => z.stack).map(z => z.id));
  asked.add(id);

  let why: Blocker = null;
  groupBuckets(ordered, zones, asked, layerConfined(components, zones),
    (bucket, reason) => { if (bucket === id) why = reason; });
  return why;
}

/** Can this zone take a shelf? Drives the toggle's disabled state. */
export const canStackZone = (components: Component[], zones: Zone[], id: string): boolean =>
  stackBlocker(components, zones, id) === null;

/** Which shelves a single layer actually draws, and the `grid-row` line each
 *  band takes there.
 *
 *  Ranked rather than absolute: a group whose first shelf is empty on this layer
 *  would otherwise leave a row of dead space at the top of it. Shared by all four
 *  renderers so the measured sheets and the arithmetic one agree without a second
 *  layout — the same reason the band plan itself is arithmetic. */
export interface LayerSlots {
  /** 1-based, for `grid-row`. */
  row: (zone?: string) => number;
  /** Shelves drawn on this layer, at least one. */
  rows: number;
}

export function layerSlots(runs: ZoneRun[], plan: BandPlan): LayerSlots {
  const used = new Set<number>();
  runs.forEach(run => { const band = plan.band(run.zone); if (band) used.add(band.row); });
  const rank = new Map([...used].sort((a, b) => a - b).map((row, i) => [row, i] as const));
  return {
    row: zone => {
      const band = plan.band(zone);
      return (band ? rank.get(band.row) ?? 0 : 0) + 1;
    },
    rows: rank.size || 1
  };
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
