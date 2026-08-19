/* The sheet, laid out without a DOM.
 *
 * The three renderers that already exist all *measure*: the editor and the
 * viewer read `getBoundingClientRect`, the printed document reads
 * `offsetLeft/offsetTop`. That works because all three run in a browser with the
 * cards already in flow. An export to a foreign tool has neither — a draw.io
 * file is written on the server, and a `<text>` in an SVG has no flow to be
 * measured in — so this module computes the same drawing arithmetically.
 *
 * It can, and this is the whole reason the band plan exists: a card has a fixed
 * width, so a band is a column count (see `bandPlan` in ../zones). Everything
 * below is that plan turned into pixels, plus one fixed card height. The result
 * is not a screenshot of the canvas — the cards there grow with their content —
 * but it is the same drawing: same bands, same order, same zone rectangles from
 * the same `inflatedUnion`, same cubic for every edge.
 *
 * ------------------------------------------------------------------ mirroring
 *
 * The numbers below mirror `globals.css`, and `layout.test.ts` guards the pair
 * that would silently drift: `--card-w` and `column-gap` on `.layer-drop.banded`.
 * The edge geometry mirrors `draw()` in components/Editor.tsx — if that cubic
 * changes, this one has to change with it or an export stops looking like the
 * studio.
 *
 * ------------------------------------------------------------------- the ground
 *
 * White, not the studio's calque. An exported diagram is pasted into a slide, a
 * wiki or a draw.io page, and all three are white; carrying `--bg` across would
 * put a grey plate around the drawing in every one of them. So the neutrals
 * below are the light theme's ink composited over paper rather than over the
 * calque, and the two agree everywhere it matters — the ink itself is the same.
 */

import type { Architecture, Component, Layer, Zone } from '../types';
import {
  BAND_GUTTER, SHELF_GAP, bandPlan, describeZone, inflatedUnion, layerRuns, layerSlots, withDescendants,
  zoneDepth, zoneIsPhysical, zonePad, zonesInUse, type Band, type Box, type ZoneRun
} from '../zones';
import { dashFor, edgePlateText, linkOf, protocolConvention, protocolNote } from '../links';
import { edgeOpacity, edgeStroke, stateTick } from '../lifecycle';
import { layerTintEnabled } from '../layers';
import { PALETTE } from '../defaults';

/* ------------------------------------------------------------------ the ink */

/** The light theme's tokens, resolved. Custom properties do not survive the trip
 *  into a foreign tool, so every colour has to be a literal by the time it
 *  leaves here. MIRRORS the `:root` block in app/globals.css. */
export const INK = {
  ink: '#0B1B2B',
  ink2: '#3D566B',
  ink3: '#8CA1B2',
  line2: '#DCE5EB',
  line3: '#D3DEE5',
  paper: '#FFFFFF'
} as const;

/** `--lt1..--lt6`, the layer ramp. */
export const LAYER_TINT_HEX = ['#5B7FA6', '#5E9070', '#9A8149', '#A5735F', '#8474A8', '#4E8C93'];

/** A zone's ground at nesting depth 0, 1 and 2 — `--ink` at 3 %, 6 % and 9 %,
 *  composited over paper. Deeper zones reuse the last one, exactly as the
 *  stylesheet does (it only defines `[data-depth]` up to 2). */
export const ZONE_FILL = ['#F8F8F9', '#F0F1F2', '#E9EAEC'];

export const zoneFill = (depth: number): string =>
  ZONE_FILL[Math.min(depth, ZONE_FILL.length - 1)];

/** The resting opacity of an ordinary edge. The canvas sits at .34 because it is
 *  a working surface with cards to click through; an export is read once and at
 *  a distance, so it takes the printed document's .45 instead. */
export const EDGE_BASE_OPACITY = 0.45;

/* ------------------------------------------------------------- the geometry */

/** MIRRORS `--card-w` on `.canvas` in app/globals.css. */
export const CARD_W = 206;

/** The one number that is a decision rather than a mirror.
 *
 *  On screen a card grows with its content, which is right for a surface you
 *  author on and wrong for a drawing that has to be one shape repeated. Sixty
 *  four holds the three lines the export draws — name, role, technologies — at
 *  the sizes below, and a component with none of the optional two simply leaves
 *  the lower half empty rather than making the row ragged. */
export const CARD_H = 64;

/** `gap` on `.zrun`: the space between two cards inside one band. */
export const CARD_GAP = 10;

/** The band label and the rule under it. */
export const LAYER_HEAD_H = 22;
export const LAYER_PAD_TOP = 16;
export const LAYER_PAD_BOTTOM = 12;

/** Room around the drawing. Wider than the deepest zone inset (19 px across,
 *  32 px down, from `zonePad`) so a rectangle around a band at the edge of the
 *  sheet still has paper to sit on. */
export const SHEET_PAD_X = 28;
export const SHEET_PAD_Y = 30;

/** A within-layer edge arcs 30 px below the cards it joins and reaches about
 *  three quarters of that at its belly. The last layer has no next band to lend
 *  it the room, so the sheet keeps some back. */
const EDGE_SLACK = 30;

const TITLE_H = 26;
const SUBTITLE_H = 18;
const LEGEND_H = 22;
const NOTE_H = 18;

/* ------------------------------------------------------------- the placement */

export interface NodePlacement {
  component: Component;
  box: Box;
  /** The scope's colour, resolved. */
  color: string;
  /** "NEW" / "MOD" / "DEL", or null. */
  tick: string | null;
}

export interface ZonePlacement {
  zone: Zone;
  box: Box;
  depth: number;
  /** Drawn solid rather than dashed — a boundary you could point at in a room. */
  physical: boolean;
  label: string;
}

export interface LayerPlacement {
  layer: Layer;
  index: number;
  label: string;
  /** `--lt1..--lt6` resolved, or null when the document turns tints off. */
  tint: string | null;
  /** Top of the band, top of its cards, and the dashed rule closing it. */
  y: number;
  bodyY: number;
  ruleY: number;
}

/** One dependency, as the cubic all four surfaces draw.
 *
 *  `M x1,y1 C x1,y1+k1 x2,y2+k2 x2,y2` — the control points are vertical
 *  offsets, which is what keeps a line leaving the bottom of a card looking like
 *  it left the bottom of a card. */
export interface EdgePlacement {
  from: string;
  to: string;
  x1: number; y1: number; k1: number;
  x2: number; y2: number; k2: number;
  color: string;
  opacity: number;
  width: number;
  /** SVG `stroke-dasharray`; empty for a synchronous call. */
  dash: string;
  /** What goes in the plate on the line — "+ JDBC" — or null. */
  label: string | null;
}

export interface Sheet {
  w: number;
  h: number;
  title: string | null;
  subtitle: string | null;
  /** "All calls are REST unless the line says otherwise.", or null. */
  note: string | null;
  layers: LayerPlacement[];
  zones: ZonePlacement[];
  nodes: NodePlacement[];
  edges: EdgePlacement[];
  /** The scopes in use, in declaration order. Colour carries scope on every
   *  surface, so an export that drops the key drops half the drawing. */
  legend: { id: string; label: string; color: string }[];
  /** Where the legend row's baseline sits. */
  legendY: number;
  noteY: number;
  lang: 'en' | 'fr';
}

/** The x of a 0-based grid column. Every column is `BAND_GUTTER` from the next,
 *  including two columns inside one band — that is `column-gap` on the grid,
 *  where `CARD_GAP` is the flex gap *within* a run. The two are different
 *  numbers on purpose; see the note above `.layer-drop.banded`. */
export const columnX = (index: number): number => index * (CARD_W + BAND_GUTTER);

/** How wide a band of `span` columns is. */
export const bandWidth = (span: number): number =>
  span * CARD_W + (span - 1) * BAND_GUTTER;

/** Cards per row inside a band. A band of `span` columns is exactly wide enough
 *  for `span` cards at `CARD_GAP`, because the grid's gutter is the wider of the
 *  two — the arithmetic is checked in `layout.test.ts`. */
const perRow = (span: number): number =>
  Math.max(1, Math.floor((bandWidth(span) + CARD_GAP) / (CARD_W + CARD_GAP)));

/** Lay the whole document out. Pure: same document in, same numbers out. */
export function layoutSheet(doc: Architecture): Sheet {
  const lang = doc.meta?.lang === 'fr' ? 'fr' : 'en';
  const zones = doc.zones || [];

  /* A component whose layer is gone would be counted by no band and placed on no
   * row. Every read path normalises that away, but the fallback is one line and
   * it keeps this function total. */
  const known = new Set(doc.layers.map(l => l.id));
  const fallbackLayer = doc.layers[0]?.id ?? '';
  const components: Component[] = doc.components.map(c =>
    doc.layers.length && known.has(c.layer) ? c : { ...c, layer: fallbackLayer });

  /* An unlayered document still draws: everything lands on one nameless band,
   * which is what the band plan already does internally. */
  const layers: Layer[] = doc.layers.length
    ? doc.layers
    : (components.length ? [{ id: fallbackLayer, name: '' }] : []);

  const plan = bandPlan(components, zones, doc.layers);
  const colour = groupColours(doc);
  const tinted = layerTintEnabled(doc.ui?.architecture);

  const title = doc.ui?.architecture?.title?.trim() || doc.meta?.name?.trim() || null;
  const subtitle = doc.ui?.architecture?.subtitle?.trim() || null;
  const conv = protocolConvention(doc.ui?.architecture);
  const note = protocolNote(conv, lang);

  const originX = SHEET_PAD_X;
  let y = SHEET_PAD_Y + (title ? TITLE_H : 0) + (subtitle ? SUBTITLE_H : 0);

  const placedLayers: LayerPlacement[] = [];
  const nodes: NodePlacement[] = [];
  /** One box per zone run, which is what the zone rectangles are measured from —
   *  the same choice `zoneLayer` makes on the canvas, and for the same reason: a
   *  run is already a tight, band-shaped box around a zone's members in one row. */
  const runBoxes = new Map<string, Box[]>();

  layers.forEach((layer, index) => {
    const here = components.filter(c => c.layer === layer.id);
    const bodyY = y + LAYER_PAD_TOP + LAYER_HEAD_H;

    /* Measured in two passes because a shelf's top depends on how tall the
     * shelves above it turned out. `layerSlots` ranks the shelves this layer
     * actually draws, so an empty one leaves no gap — the same compaction CSS
     * grid does on the three measured surfaces, which is why they agree. */
    const runs = layerRuns(here, zones)
      .map(run => ({ run, band: plan.band(run.zone)! }))
      .filter(x => x.band);
    const slots = layerSlots(runs.map(x => x.run), plan);

    const shelfH: number[] = Array.from({ length: slots.rows }, () => 0);
    const height = (run: ZoneRun, band: Band) => {
      const rows = Math.ceil(run.items.length / perRow(band.span));
      return rows * (CARD_H + CARD_GAP) - CARD_GAP;
    };
    runs.forEach(({ run, band }) => {
      const shelf = slots.row(run.zone) - 1;
      shelfH[shelf] = Math.max(shelfH[shelf], height(run, band));
    });

    const shelfY = shelfH.map((_, i) =>
      shelfH.slice(0, i).reduce((at, h) => at + h + SHELF_GAP, 0));
    const bodyH = shelfH.length ? shelfY[shelfH.length - 1] + shelfH[shelfH.length - 1] : 0;

    runs.forEach(({ run, band }) => {
      const x = originX + columnX(band.start - 1);
      const top = bodyY + shelfY[slots.row(run.zone) - 1];
      const cols = perRow(band.span);

      run.items.forEach((component, i) => {
        nodes.push({
          component,
          box: {
            x: x + (i % cols) * (CARD_W + CARD_GAP),
            y: top + Math.floor(i / cols) * (CARD_H + CARD_GAP),
            w: CARD_W,
            h: CARD_H
          },
          color: colour(component.group),
          tick: stateTick(component.state)
        });
      });

      if (run.zone) {
        const boxes = runBoxes.get(run.zone) || [];
        /* The run's own box, not the union of its cards: on the canvas a run
         * stretches to fill its band, so the rectangle is band-shaped on every
         * layer instead of jumping in and out with the card count. */
        boxes.push({ x, y: top, w: bandWidth(band.span), h: height(run, band) });
        runBoxes.set(run.zone, boxes);
      }
    });

    const h = LAYER_PAD_TOP + LAYER_HEAD_H + bodyH + LAYER_PAD_BOTTOM;
    placedLayers.push({
      layer,
      index,
      label: layer.name || layer.id,
      tint: tinted ? LAYER_TINT_HEX[index % LAYER_TINT_HEX.length] : null,
      y, bodyY, ruleY: y + h
    });
    y += h;
  });

  /* Outermost first, so a nested rectangle paints over its parent's fill rather
   * than under it — the tint is what makes depth read and it only stacks one way. */
  const placedZones: ZonePlacement[] = [];
  zonesInUse(zones, components).forEach(zone => {
    const family = withDescendants(zone.id, zones);
    const boxes: Box[] = [];
    family.forEach(id => (runBoxes.get(id) || []).forEach(b => boxes.push(b)));
    const box = inflatedUnion(boxes, zonePad(zone.id, zones));
    if (!box) return;
    placedZones.push({
      zone, box,
      depth: zoneDepth(zone.id, zones),
      physical: zoneIsPhysical(zone.kind),
      label: describeZone(zone, lang)
    });
  });

  const edges = layoutEdges(components, nodes, layers, colour, conv);

  const legend = (doc.groups || [])
    .filter(g => components.some(c => c.group === g.id))
    .map(g => ({ id: g.id, label: g.name || g.id, color: colour(g.id) }));

  const bottom = y + EDGE_SLACK;
  const legendY = legend.length ? bottom + 12 : bottom;
  const noteY = legendY + (legend.length ? LEGEND_H : 0);

  const contentW = plan.total ? bandWidth(plan.total) : 320;
  const legendW = legend.reduce((w, g) => w + 16 + textWidth(g.label, 10, 0.53), 0);

  return {
    w: originX * 2 + Math.max(contentW, legendW, note ? textWidth(note, 10, 0.6) : 0),
    h: noteY + (note ? NOTE_H : 0) + SHEET_PAD_Y,
    title, subtitle, note,
    layers: placedLayers,
    zones: placedZones,
    nodes, edges, legend, legendY, noteY,
    lang
  };
}

/* ---------------------------------------------------------------- the edges */

/** Every dependency as a cubic.
 *
 *  MIRRORS `draw()` in components/Editor.tsx, which is where this geometry is
 *  authored: same sign convention, same 24 px floor on the control offset, same
 *  arc under the row for a call that does not leave its layer. */
function layoutEdges(
  components: Component[],
  nodes: NodePlacement[],
  layers: Layer[],
  colour: (group: string) => string,
  conv: ReturnType<typeof protocolConvention>
): EdgePlacement[] {
  const boxOf = new Map(nodes.map(n => [n.component.id, n.box]));
  const byId = new Map(components.map(c => [c.id, c]));
  const layerAt = new Map(layers.map((l, i) => [l.id, i]));
  const out: EdgePlacement[] = [];

  components.forEach(c => (c.deps || []).forEach(dep => {
    const a = boxOf.get(c.id);
    const b = boxOf.get(dep);
    const callee = byId.get(dep);
    if (!a || !b || !callee) return;

    const x1 = a.x + a.w / 2;
    const x2 = b.x + b.w / 2;
    const la = layerAt.get(c.layer);
    const lb = layerAt.get(callee.layer);
    let y1: number, y2: number, k1: number, k2: number;
    if (la === lb) {
      y1 = a.y + a.h; y2 = b.y + b.h; k1 = 30; k2 = 30;
    } else {
      const up = (la ?? 0) > (lb ?? 0);
      y1 = up ? a.y : a.y + a.h;
      y2 = up ? b.y + b.h : b.y;
      const k = (up ? -1 : 1) * Math.max(24, Math.abs(y2 - y1) * 0.5);
      k1 = k; k2 = -k;
    }

    const link = linkOf(c, dep);
    out.push({
      from: c.id, to: dep,
      x1, y1, k1, x2, y2, k2,
      /* An edge belongs to its caller's scope, which is the reading the canvas
       * and the printed sheet both give it. */
      color: colour(c.group),
      opacity: edgeOpacity(link?.state, EDGE_BASE_OPACITY),
      width: edgeStroke(link?.state, 1.2),
      dash: dashFor(link?.kind),
      label: edgePlateText(link, conv)
    });
  }));

  return out;
}

/* --------------------------------------------------------------- the extras */

/** The scope palette, resolved to literals. `paintGroups` has already filled
 *  `color` on anything that came through normalisation; the modulo is the floor
 *  for a group that somehow did not. */
function groupColours(doc: Architecture): (group: string) => string {
  const by = new Map<string, string>();
  (doc.groups || []).forEach((g, i) => by.set(g.id, g.color || PALETTE[i % PALETTE.length]));
  return group => by.get(group) || INK.ink3;
}

/** Text width without a DOM, the way `labelPlateWidth` already estimates one:
 *  an average advance per character times the size. Overshooting is harmless
 *  everywhere it is used — it only ever decides how much room to leave. */
export const textWidth = (text: string, size: number, ratio: number): number =>
  text.length * size * ratio;

/** `text` cut to fit `max` pixels, with an ellipsis when it had to be cut.
 *
 *  The alternative is SVG's own overflow, which is to draw the whole string over
 *  whatever sits next to it — on a grid of fixed-width cards that is every
 *  neighbouring card. */
export function clip(text: string, max: number, size: number, ratio: number): string {
  if (textWidth(text, size, ratio) <= max) return text;
  const room = Math.max(1, Math.floor(max / (size * ratio)) - 1);
  return text.slice(0, room).trimEnd() + '…';
}
