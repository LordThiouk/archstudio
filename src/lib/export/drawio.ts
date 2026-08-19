/* The diagram as a draw.io file.
 *
 * Every other export leaves with the drawing finished: the standalone HTML is a
 * viewer, the SVG and the PNG are pictures. This one leaves with it *open*. The
 * reason to want that is not that draw.io draws better — it does not draw this
 * at all — it is that an architecture diagram has a second life in rooms this
 * app is not in, where someone has to move a box during the meeting, and the
 * tool in that room is draw.io.
 *
 * -------------------------------------------------------------------- fidelity
 *
 * What crosses intact: the band layout, the zone rectangles and their two stroke
 * treatments, the scope colour, the layer rules and their tint, every
 * dependency with its kind (the dash), its protocol (the label) and its
 * transition mark, and the edge grammar — a filled disc at the caller, an open
 * circle at the callee, which draw.io spells `startArrow=oval;startFill=1` and
 * `endArrow=oval;endFill=0`. No arrowheads, here as everywhere.
 *
 * What does not: the icons, and the security marks. Both are glyph sets this app
 * ships and draw.io does not, and a wrong glyph is worse than none. The marks
 * ride along as cell data instead (see below), so nothing is lost from the file
 * even though it is lost from the picture.
 *
 * ---------------------------------------------------------------------- shape
 *
 * Flat, not nested. draw.io containers would let a reader drag a zone and take
 * its contents with it, which is tempting — but a container's children carry
 * geometry relative to it, and zones here nest three deep across reserved bands.
 * Getting that wrong produces a file that opens to a pile. A flat sheet in the
 * right order is a file that opens to the drawing, and the reader can still
 * group by hand.
 *
 * Edges reference their endpoints by id rather than by waypoint, so moving a
 * card in draw.io reroutes its lines — which is the entire point of exporting
 * something editable.
 *
 * Components ship as `<object>` rather than bare `<mxCell>`, so the id, the
 * scope, the layer, the zone, the technologies and the security marks land in
 * draw.io's own Edit Data panel. That is what makes the export searchable there
 * instead of merely visible.
 */

import type { Architecture } from '../types';
import { MARK_LABELS } from '../marks';
import { STATE_LABELS } from '../lifecycle';
import {
  INK, LAYER_PAD_TOP, SHEET_PAD_X, layoutSheet, zoneFill,
  type EdgePlacement, type LayerPlacement, type NodePlacement, type Sheet, type ZonePlacement
} from './layout';

/** draw.io's own A4 landscape, and the one a new file opens on. The sheet almost
 *  always runs wider; `page="1"` then tiles it, which is what a reader printing
 *  a landscape diagram wants anyway. */
const PAGE_W = 1169;
const PAGE_H = 826;

const MONO_FONT = 'Courier New';
const SANS_FONT = 'Helvetica';

export function buildDrawioXml(doc: Architecture): string {
  return renderSheet(layoutSheet(doc));
}

export function renderSheet(sheet: Sheet): string {
  const cells: string[] = ['<mxCell id="0"/>', '<mxCell id="1" parent="0"/>'];

  if (sheet.title) cells.push(headingCells(sheet));
  /* Outermost first: draw.io paints in document order, so a nested rectangle has
   * to come after the one it sits inside or its tint is buried. */
  sheet.zones.forEach((z, i) => cells.push(zoneCell(z, i)));
  sheet.layers.forEach(l => cells.push(layerCells(l, sheet.w)));
  sheet.nodes.forEach(n => cells.push(nodeCell(n, sheet)));
  sheet.edges.forEach((e, i) => cells.push(edgeCell(e, i)));
  cells.push(footerCells(sheet));

  const model = `<mxGraphModel dx="${Math.round(sheet.w)}" dy="${Math.round(sheet.h)}" `
    + `grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" `
    + `page="1" pageScale="1" pageWidth="${PAGE_W}" pageHeight="${PAGE_H}" math="0" shadow="0">`
    + `<root>${cells.filter(Boolean).join('')}</root>`
    + `</mxGraphModel>`;

  const name = sheet.title || 'Architecture';
  return `<?xml version="1.0" encoding="UTF-8"?>`
    + `<mxfile host="Architecture Studio" agent="Architecture Studio" type="device">`
    + `<diagram id="architecture" name="${attr(name)}">${model}</diagram>`
    + `</mxfile>`;
}

/* -------------------------------------------------------------------- cells */

function headingCells(sheet: Sheet): string {
  let out = vertex('title', `<b>${esc(sheet.title!)}</b>`,
    `text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;`
    + `fontSize=16;fontColor=${INK.ink};fontFamily=${SANS_FONT};`,
    { x: SHEET_PAD_X, y: 8, w: sheet.w - SHEET_PAD_X * 2, h: 22 });
  if (sheet.subtitle) {
    out += vertex('subtitle', esc(sheet.subtitle),
      `text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;`
      + `fontSize=11;fontColor=${INK.ink2};fontFamily=${SANS_FONT};`,
      { x: SHEET_PAD_X, y: 30, w: sheet.w - SHEET_PAD_X * 2, h: 16 });
  }
  return out;
}

function footerCells(sheet: Sheet): string {
  let out = '';
  if (sheet.legend.length) {
    /* One cell rather than one per scope: a legend is read as a line, and eight
     * loose text boxes is eight things to move by accident. */
    const body = sheet.legend
      .map(g => `<font color="${g.color}">&#9632;</font> ${esc(g.label)}`)
      .join('&nbsp;&nbsp;&nbsp;&nbsp;');
    out += vertex('legend', body,
      `text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;`
      + `fontSize=10;fontColor=${INK.ink2};fontFamily=${SANS_FONT};`,
      { x: SHEET_PAD_X, y: sheet.legendY - 4, w: sheet.w - SHEET_PAD_X * 2, h: 18 });
  }
  if (sheet.note) {
    out += vertex('note', esc(sheet.note),
      `text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;`
      + `fontSize=10;fontColor=${INK.ink3};fontFamily=${MONO_FONT};`,
      { x: SHEET_PAD_X, y: sheet.noteY - 2, w: sheet.w - SHEET_PAD_X * 2, h: 16 });
  }
  return out;
}

/* Solid for a boundary you could point at in a room, dashed for one that only
 * exists in a document. `connectable=0` so a reader dragging a new dependency
 * across the sheet cannot accidentally anchor it to the ground. */
function zoneCell(z: ZonePlacement, index: number): string {
  const style = `rounded=0;whiteSpace=wrap;html=1;`
    + `fillColor=${zoneFill(z.depth)};strokeColor=${INK.line3};`
    + (z.physical ? `dashed=0;` : `dashed=1;dashPattern=5 4;`)
    + `verticalAlign=top;align=left;spacingLeft=6;spacingTop=2;`
    + `fontSize=9;fontColor=${INK.ink3};fontFamily=${MONO_FONT};connectable=0;`;
  return vertex(`z-${index}-${slug(z.zone.id)}`, esc(z.label.toUpperCase()), style, {
    x: z.box.x, y: z.box.y, w: z.box.w, h: z.box.h
  });
}

function layerCells(l: LayerPlacement, sheetW: number): string {
  const colour = l.tint || INK.ink3;
  let out = '';
  if (l.label) {
    const body = l.layer.desc
      ? `${esc(l.label.toUpperCase())} <font color="${INK.ink3}">${esc(l.layer.desc)}</font>`
      : esc(l.label.toUpperCase());
    out += vertex(`l-${l.index}`, body,
      `text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;`
      + `fontSize=10;fontColor=${colour};fontFamily=${MONO_FONT};connectable=0;`,
      { x: SHEET_PAD_X, y: l.y + LAYER_PAD_TOP - 2, w: sheetW - SHEET_PAD_X * 2, h: 16 });
  }
  /* draw.io's `line` shape draws across the vertical middle of its geometry, so
   * the box is centred on the rule rather than starting at it. */
  return out + vertex(`lr-${l.index}`, '',
    `line;html=1;strokeColor=${colour};strokeWidth=1;dashed=1;dashPattern=4 4;`
    + `opacity=42;connectable=0;`,
    { x: SHEET_PAD_X, y: l.ruleY - 4, w: sheetW - SHEET_PAD_X * 2, h: 8 });
}

/* The card. Colour rides in the label as a filled square rather than on the
 * border — rule 1 travels with the drawing, and a square inside the value moves
 * with the cell where a second shape would be left behind the first time someone
 * drags it. */
function nodeCell(n: NodePlacement, sheet: Sheet): string {
  const c = n.component;
  const removed = c.state === 'removed';
  const marked = c.state === 'new' || c.state === 'changed';

  const lines = [
    `<font color="${n.color}">&#9632;</font> <b>${esc(c.name)}</b>`
    + (n.tick ? ` <font color="${INK.ink2}" style="font-size:8px">${esc(n.tick)}</font>` : '')
  ];
  if (c.role) lines.push(`<font color="${INK.ink2}" style="font-size:9px">${esc(c.role)}</font>`);
  const lower = [c.badge, ...(c.tech || [])].filter(Boolean).join(' · ');
  if (lower) lines.push(`<font color="${INK.ink3}" style="font-size:8px">${esc(lower)}</font>`);

  const style = `rounded=0;whiteSpace=wrap;html=1;fillColor=${INK.paper};`
    + `strokeColor=${marked ? INK.ink2 : INK.line3};strokeWidth=${marked ? 1.8 : 1};`
    + (removed ? `dashed=1;dashPattern=4 3;opacity=55;` : '')
    + `align=left;verticalAlign=top;spacingLeft=6;spacingTop=2;`
    + `fontSize=11;fontColor=${INK.ink};fontFamily=${SANS_FONT};`;

  /* What the picture cannot carry, carried as data: draw.io shows these in Edit
   * Data, and its search finds them. The icon and the security glyphs are this
   * app's own sets — a wrong glyph is worse than a named field. */
  const data: Record<string, string> = { archId: c.id };
  const scope = sheet.legend.find(g => g.id === c.group);
  if (scope) data.scope = scope.label;
  const layer = sheet.layers.find(l => l.layer.id === c.layer);
  if (layer?.label) data.layer = layer.label;
  const zone = sheet.zones.find(z => z.zone.id === c.zone);
  if (zone) data.zone = zone.zone.name;
  if (c.tech?.length) data.tech = c.tech.join(', ');
  if (c.marks?.length) data.security = c.marks.map(m => MARK_LABELS[m][sheet.lang]).join(', ');
  if (c.state) data.state = STATE_LABELS[c.state][sheet.lang];
  if (c.url) data.link = c.url;

  return object(`n-${slug(c.id)}`, lines.join("<br>"), data,
    `<mxCell style="${attr(style)}" vertex="1" parent="1">`
    + geometry({ x: n.box.x, y: n.box.y, w: n.box.w, h: n.box.h })
    + `</mxCell>`);
}

/* Source and target rather than waypoints: a reader who moves a card gets its
 * lines redrawn, which is why they opened this in draw.io at all. */
function edgeCell(e: EdgePlacement, index: number): string {
  const style = `edgeStyle=none;curved=1;html=1;rounded=0;`
    + `startArrow=oval;startFill=1;startSize=7;endArrow=oval;endFill=0;endSize=7;`
    + `strokeColor=${e.color};strokeWidth=${e.width};`
    + (e.dash ? `dashed=1;dashPattern=${e.dash};` : `dashed=0;`)
    + (e.opacity < 0.45 ? `opacity=${Math.round(e.opacity * 100)};` : '')
    + `fontSize=9;fontColor=${INK.ink3};fontFamily=${MONO_FONT};`
    + `labelBackgroundColor=${INK.paper};`;
  return `<mxCell id="e-${index}" value="${attr(esc(e.label || ''))}" style="${attr(style)}" `
    + `edge="1" parent="1" source="n-${attr(slug(e.from))}" target="n-${attr(slug(e.to))}">`
    + `<mxGeometry relative="1" as="geometry"/>`
    + `</mxCell>`;
}

/* --------------------------------------------------------------- primitives */

interface Rect { x: number; y: number; w: number; h: number }

function vertex(id: string, value: string, style: string, r: Rect): string {
  return `<mxCell id="${attr(id)}" value="${attr(value)}" style="${attr(style)}" `
    + `vertex="1" parent="1">${geometry(r)}</mxCell>`;
}

function object(id: string, label: string, data: Record<string, string>, cell: string): string {
  const attrs = Object.entries(data)
    .map(([k, v]) => ` ${k}="${attr(v)}"`).join('');
  return `<object id="${attr(id)}" label="${attr(label)}"${attrs}>${cell}</object>`;
}

const geometry = (r: Rect): string =>
  `<mxGeometry x="${round(r.x)}" y="${round(r.y)}" `
  + `width="${round(r.w)}" height="${round(r.h)}" as="geometry"/>`;

const round = (n: number): number => Math.round(n * 10) / 10;

/* Escaped twice, and that is not a bug.
 *
 * Every style here says `html=1`, so a cell's value is HTML — which then has to
 * survive being an XML attribute. So authored text is escaped once for the HTML
 * parser (`esc`, applied to the text and never to the `<font>` and `<b>` tags
 * around it), and the finished markup is escaped again for the XML parser
 * (`attr`, applied to the whole value). A component called "R&D" leaves here as
 * `R&amp;amp;D`, arrives at draw.io's HTML parser as `R&amp;D`, and is drawn as
 * "R&D". Escaping either half only once is what turns that into "R&amp;D" on the
 * card, or into a file draw.io refuses to open.
 *
 * Both are strict — every `&`, with no lookahead for things that already look
 * like entities. A lookahead reads "R&D;" as an entity and lets it through
 * unescaped, and an unescaped ampersand is not a wrong drawing, it is a broken
 * file. Entities this module writes itself (`&#9632;`, the scope square) survive
 * anyway: double-escaped here, decoded by the XML parser, decoded again by the
 * HTML one. */

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const attr = (s: string): string =>
  s.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Component ids are slugs, but an imported document's need not be, and a cell
 *  id with a quote in it is a broken file rather than a wrong drawing. */
const slug = (id: string): string => id.replace(/[^A-Za-z0-9_.-]/g, '_');
