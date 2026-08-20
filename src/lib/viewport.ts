/* Zoom for the editing canvas — the same two-mechanism answer the viewer gives,
 * because it is the same problem: the sheet is HTML flow, not an absolutely
 * positioned drawing, and the two directions do not want the same tool.
 *
 * Out, below 100 %, uses the `zoom` property: it scales the layout itself, so
 * the sheet still resolves to the width of the frame and reflows into it. More
 * cards land on each row instead of the drawing shrinking away from the right
 * edge, and there is nothing to pan sideways to.
 *
 * In, above 100 %, uses `transform`: the layout is left alone and the frame
 * scrolls over a magnified sheet, which is what you want when you are reading
 * one corner of it. A transform cannot do the job below 100 % — the untransformed
 * box still counts towards the scroll container's width, so the frame would offer
 * a horizontal scrollbar over empty paper.
 *
 * MIRRORS the ZOOM & PAN block in viewer/engine.js. The editor and the export
 * scale the same sheet; they should not disagree about what 70 % means. */

export const ZOOM_MIN = 0.4;
export const ZOOM_MAX = 2;
export const ZOOM_STEP = 0.1;

/** Snapped to whole percents before clamping, so repeated steps cannot drift
 *  onto 0.7000000000000001 and print as 70 % while comparing unequal. */
export function clampZoom(z: number): number {
  if (!Number.isFinite(z)) return 1;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 100) / 100));
}

export interface ZoomStyle { zoom?: string; transform?: string }

/** The inline style a factor asks for. `hasZoomProperty` is false on browsers
 *  that never learned `zoom` (Firefox before 126), where the transform does both
 *  directions: a worse view below 100 %, because the sheet shrinks away from the
 *  right edge rather than reflowing into it, but a true one — and the edges still
 *  land on their cards, because both mechanisms scale what a rect reports. */
export function zoomStyle(zoom: number, hasZoomProperty: boolean): ZoomStyle {
  if (zoom === 1) return {};
  if (hasZoomProperty && zoom < 1) return { zoom: String(zoom) };
  return { transform: `scale(${zoom})`, transformOrigin: 'top left' } as ZoomStyle;
}

/** The factors Fit tries, largest first. Scaling reflows, so the height at a
 *  given factor cannot be calculated — it has to be measured, and this is the
 *  ladder to measure down. */
export function fitLadder(): number[] {
  const out: number[] = [];
  const lo = Math.round(ZOOM_MIN * 100);
  const step = Math.round(ZOOM_STEP * 100);
  for (let pct = 100; pct >= lo; pct -= step) out.push(pct / 100);
  return out;
}

/** Keep the point under `anchor` where it was while the factor changes.
 *  Returns the frame's new scroll offsets. */
export function anchoredScroll(
  from: number, to: number,
  scroll: { left: number; top: number },
  anchor: { x: number; y: number }
): { left: number; top: number } {
  const cx = (scroll.left + anchor.x) / from;
  const cy = (scroll.top + anchor.y) / from;
  return { left: Math.max(0, cx * to - anchor.x), top: Math.max(0, cy * to - anchor.y) };
}
