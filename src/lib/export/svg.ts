/* The diagram as one standalone SVG.
 *
 * Two things need this and they want it for opposite reasons. A vector export is
 * what you drop into Figma or a design document and scale without it turning to
 * mush. And it is the only honest way to reach a PNG from a codebase with no
 * headless browser in it: rasterising happens in the reader's own browser, by
 * loading this string into an `<img>` and painting it onto a canvas.
 *
 * That second consumer is what fixes the constraints, because SVG inside an
 * `<img>` runs in a restricted mode:
 *
 *   no external requests   so a typeface has to arrive as a base64 `@font-face`
 *                          or not at all (`fontCss`, injected by the caller —
 *                          this module reads no files, so it stays testable and
 *                          usable from the browser)
 *   no `<foreignObject>`   so every string is a real `<text>`, which means no
 *                          wrapping and no measuring: `clip` in ./layout cuts
 *                          each one to the room its box actually has
 *   no scripts, no CSS vars so every colour is a literal, which is what the INK
 *                          table in ./layout is for
 *
 * Paint order is the canvas's, and it is not the order you would guess. Zones are
 * the ground, so they go first. Then the lines and their plates. Then the layer
 * band — its label *and* its rule — because on the sheet a `.layer` sits at
 * z-index 2 and the edge SVG at 1: a band's name is furniture the reader orients
 * by, and twenty lines crossing a diagram will cross it. Then the cards, on top
 * of everything. A line running under a card is the card's, which is the same
 * answer the editor gives and the right one.
 */

import type { Architecture } from '../types';
import {
  CARD_H, INK, LAYER_PAD_TOP, SHEET_PAD_X, clip, layoutSheet, textWidth, zoneFill,
  type EdgePlacement, type LayerPlacement, type NodePlacement, type Sheet, type ZonePlacement
} from './layout';

const SANS = "Archivo, 'Helvetica Neue', Helvetica, Arial, sans-serif";
const MONO = "'Space Mono', ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace";

/** Average advance per character, as a fraction of the font size. Archivo sits
 *  near .52 for mixed case; Space Mono advances a flat .6 by construction. The
 *  numbers only decide where to cut a string, so a hair of overshoot is free. */
const SANS_RATIO = 0.53;
const MONO_RATIO = 0.6;

export interface SvgOptions {
  /** `@font-face` rules with the faces inlined as data URIs. Without them the
   *  drawing falls back to the reader's Helvetica, which is legible and is not
   *  the studio. Injected rather than read here so this module has no `node:fs`
   *  in it and can run on either side of the wire. */
  fontCss?: string;
}

export function buildDiagramSvg(doc: Architecture, options: SvgOptions = {}): string {
  return renderSheet(layoutSheet(doc), options);
}

export function renderSheet(sheet: Sheet, options: SvgOptions = {}): string {
  const w = round(sheet.w);
  const h = round(sheet.h);

  const style = [
    options.fontCss || '',
    `.s{font-family:${SANS}}`,
    `.m{font-family:${MONO}}`
  ].filter(Boolean).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" `
    + `viewBox="0 0 ${w} ${h}" role="img"${sheet.title ? ` aria-label="${attr(sheet.title)}"` : ''}>`
    + `<style>${style}</style>`
    + (sheet.title ? `<title>${esc(sheet.title)}</title>` : '')
    + `<rect width="${w}" height="${h}" fill="${INK.paper}"/>`
    + heading(sheet)
    + group(sheet.zones.map(zoneSvg).join(''))
    + group(sheet.edges.map(edgeSvg).join(''))
    + group(sheet.edges.map(edgeLabelSvg).join(''))
    + group(sheet.layers.map(l => layerSvg(l, sheet.w)).join(''))
    + group(sheet.nodes.map(nodeSvg).join(''))
    + footer(sheet)
    + `</svg>`;
}

/* ------------------------------------------------------------------- pieces */

function heading(sheet: Sheet): string {
  if (!sheet.title) return '';
  const x = SHEET_PAD_X;
  let out = text(x, 22, esc(sheet.title), {
    cls: 's', size: 16, fill: INK.ink, weight: '700'
  });
  if (sheet.subtitle) {
    out += text(x, 40, esc(sheet.subtitle), { cls: 's', size: 11, fill: INK.ink2 });
  }
  return out;
}

function footer(sheet: Sheet): string {
  let out = '';
  let x = SHEET_PAD_X;
  sheet.legend.forEach(g => {
    out += `<rect x="${round(x)}" y="${round(sheet.legendY)}" width="9" height="9" fill="${g.color}"/>`;
    out += text(x + 14, sheet.legendY + 8.5, esc(g.label), {
      cls: 's', size: 10, fill: INK.ink2
    });
    x += 14 + textWidth(g.label, 10, SANS_RATIO) + 16;
  });
  if (sheet.note) {
    out += text(SHEET_PAD_X, sheet.noteY + 10, esc(sheet.note), {
      cls: 'm', size: 10, fill: INK.ink3
    });
  }
  return out;
}

/* Two treatments and no hue — colour is scope's. Solid is a boundary you could
 * point at in a room, dashed one that exists in a document. MIRRORS `zoneSvg` in
 * ../zones, which builds the same rectangle for the three browser renderers; the
 * difference here is only that the fill and the stroke are literals rather than
 * classes, because there is no stylesheet on the other side of this file. */
function zoneSvg(z: ZonePlacement): string {
  return `<rect x="${round(z.box.x)}" y="${round(z.box.y)}" `
    + `width="${round(z.box.w)}" height="${round(z.box.h)}" `
    + `fill="${zoneFill(z.depth)}" stroke="${INK.line3}" stroke-width="1"`
    + (z.physical ? '' : ' stroke-dasharray="5 4"') + `/>`
    + text(z.box.x + 9, z.box.y + 11, esc(z.label.toUpperCase()), {
      cls: 'm', size: 9.5, fill: INK.ink3, spacing: 0.08 * 9.5
    });
}

function layerSvg(l: LayerPlacement, sheetW: number): string {
  const label = (l.label || '').toUpperCase();
  let out = '';
  if (label) {
    out += text(SHEET_PAD_X, l.y + LAYER_PAD_TOP + 10, esc(label), {
      cls: 'm', size: 10, fill: l.tint || INK.ink3, spacing: 0.06 * 10
    });
    if (l.layer.desc) {
      out += text(
        SHEET_PAD_X + textWidth(label, 10, MONO_RATIO) + 0.06 * 10 * label.length + 12,
        l.y + LAYER_PAD_TOP + 10,
        esc(l.layer.desc),
        { cls: 'm', size: 10, fill: INK.ink3, opacity: 0.8 }
      );
    }
  }
  return out + `<line x1="${SHEET_PAD_X}" y1="${round(l.ruleY)}" `
    + `x2="${round(sheetW - SHEET_PAD_X)}" y2="${round(l.ruleY)}" `
    + `stroke="${l.tint || INK.line3}" stroke-width="1" stroke-dasharray="4 4" opacity="0.42"/>`;
}

/* The card. One shape repeated, three lines of content, and the two channels the
 * transition is allowed to use: the border treatment and a monospace tick in the
 * corner. Colour stays on the chip, where scope lives. */
function nodeSvg(n: NodePlacement): string {
  const { box: b, component: c } = n;
  const removed = c.state === 'removed';
  const marked = c.state === 'new' || c.state === 'changed';

  let out = `<g${removed ? ' opacity="0.55"' : ''}>`
    + `<rect x="${round(b.x)}" y="${round(b.y)}" width="${b.w}" height="${b.h}" `
    + `fill="${INK.paper}" stroke="${marked ? INK.ink2 : INK.line3}" `
    + `stroke-width="${marked ? 1.8 : 1}"`
    + (removed ? ' stroke-dasharray="4 3"' : '') + `/>`
    + `<rect x="${round(b.x + 12)}" y="${round(b.y + 13)}" width="9" height="9" fill="${n.color}"/>`;

  const tickW = n.tick ? 28 : 0;
  out += text(b.x + 27, b.y + 21.5,
    esc(clip(c.name, b.w - 27 - 12 - tickW, 12, SANS_RATIO)),
    { cls: 's', size: 12, fill: INK.ink, weight: '600' });

  if (n.tick) {
    out += text(b.x + b.w - 12, b.y + 21, esc(n.tick),
      { cls: 'm', size: 8.5, fill: INK.ink2, anchor: 'end', spacing: 0.06 * 8.5 });
  }

  if (c.role) {
    out += text(b.x + 12, b.y + 38, esc(clip(c.role, b.w - 24, 10, SANS_RATIO)),
      { cls: 's', size: 10, fill: INK.ink2 });
  }

  const lower = [c.badge, ...(c.tech || [])].filter(Boolean).join(' · ');
  if (lower) {
    out += text(b.x + 12, b.y + CARD_H - 11, esc(clip(lower, b.w - 24, 9, MONO_RATIO)),
      { cls: 'm', size: 9, fill: INK.ink3 });
  }

  return out + `</g>`;
}

/* The line, and the two shapes that carry its direction: a filled disc at the
 * caller, an open circle at the callee. No arrowhead anywhere — that grammar is
 * the same on all four surfaces and it survives a monochrome print. */
function edgeSvg(e: EdgePlacement): string {
  const d = `M${round(e.x1)},${round(e.y1)} C${round(e.x1)},${round(e.y1 + e.k1)} `
    + `${round(e.x2)},${round(e.y2 + e.k2)} ${round(e.x2)},${round(e.y2)}`;
  return `<g opacity="${e.opacity}">`
    + `<path d="${d}" fill="none" stroke="${e.color}" stroke-width="${e.width}" `
    + `stroke-linecap="round"${e.dash ? ` stroke-dasharray="${e.dash}"` : ''}/>`
    + `<circle cx="${round(e.x1)}" cy="${round(e.y1)}" r="3.5" fill="${e.color}"/>`
    + `<circle cx="${round(e.x2)}" cy="${round(e.y2)}" r="3" fill="${INK.paper}" `
    + `stroke="${e.color}" stroke-width="1.5"/>`
    + `</g>`;
}

/* The plate on the line, collected apart from the curves so every one of them
 * paints over every line rather than only over the ones drawn before it — the
 * same two-pass the canvas does. Opaque rather than a halo: the curve runs
 * underneath, and a stroked outline on 9 px type turns to mud. */
function edgeLabelSvg(e: EdgePlacement): string {
  if (!e.label) return '';
  const x = (e.x1 + e.x2) / 2;
  const y = (4 * e.y1 + 4 * e.y2 + 3 * e.k1 + 3 * e.k2) / 8;
  const w = e.label.length * 5.4 + 11;
  return `<rect x="${round(x - w / 2)}" y="${round(y - 6.5)}" width="${round(w)}" height="13" `
    + `fill="${INK.paper}" stroke="${INK.line3}" stroke-width="1"/>`
    + text(x, y + 3.2, esc(e.label), {
      cls: 'm', size: 9, fill: INK.ink3, anchor: 'middle'
    });
}

/* -------------------------------------------------------------- primitives */

interface TextOptions {
  cls: 's' | 'm';
  size: number;
  fill: string;
  weight?: string;
  anchor?: 'middle' | 'end';
  spacing?: number;
  opacity?: number;
}

function text(x: number, y: number, body: string, o: TextOptions): string {
  if (!body) return '';
  return `<text class="${o.cls}" x="${round(x)}" y="${round(y)}" `
    + `font-size="${o.size}" fill="${o.fill}"`
    + (o.weight ? ` font-weight="${o.weight}"` : '')
    + (o.anchor ? ` text-anchor="${o.anchor}"` : '')
    + (o.spacing ? ` letter-spacing="${round(o.spacing)}"` : '')
    + (o.opacity ? ` opacity="${o.opacity}"` : '')
    + `>${body}</text>`;
}

const group = (body: string): string => (body ? `<g>${body}</g>` : '');

/** Half a pixel is below anything a reader can see and above what a coordinate
 *  needs to say; rounding to one decimal keeps the file readable and small. */
const round = (n: number): number => Math.round(n * 10) / 10;

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const attr = (s: string): string => esc(s).replace(/"/g, '&quot;');
