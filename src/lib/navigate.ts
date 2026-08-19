/* Moving around the sheet without the mouse, and finding one card among two
 * hundred.
 *
 * Both are the same missing idea: the canvas had exactly one way in, the
 * pointer. The cards were divs with no tab stop, no role and no key that did
 * anything, so a diagram past one screen could only be worked through by
 * scrolling and aiming. What follows is the part of that with no DOM in it —
 * where an arrow key lands, and which components a query names — so the
 * component code is left with focus and scrolling. */

import type { Architecture, Component } from './types';

export type ArrowKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';

export function isArrowKey(key: string): key is ArrowKey {
  return key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown';
}

/** The sheet as the eye reads it: one row per layer, in layer order, each row in
 *  document order. Empty layers keep their row so an index still means a layer. */
export function sheetRows(doc: Architecture): string[][] {
  return doc.layers.map(l => doc.components.filter(c => c.layer === l.id).map(c => c.id));
}

/** Where an arrow key lands from `from`, or null when it runs off the sheet.
 *
 * Left and right walk the row. Up and down cross to the nearest layer that has
 * anything on it — stopping on an empty row would be a keystroke that appears to
 * do nothing — and keep the column, clamped to the width of the row they land in
 * so the last card of a short row is where a rightmost card goes. */
export function stepSelection(doc: Architecture, from: string, key: ArrowKey): string | null {
  const rows = sheetRows(doc);
  let r = -1, i = -1;
  rows.forEach((row, ri) => {
    const at = row.indexOf(from);
    if (at >= 0) { r = ri; i = at; }
  });
  if (r < 0) return null;

  if (key === 'ArrowLeft') return i > 0 ? rows[r][i - 1] : null;
  if (key === 'ArrowRight') return i < rows[r].length - 1 ? rows[r][i + 1] : null;

  const dir = key === 'ArrowUp' ? -1 : 1;
  for (let k = r + dir; k >= 0 && k < rows.length; k += dir) {
    if (rows[k].length) return rows[k][Math.min(i, rows[k].length - 1)];
  }
  return null;
}

/* -------------------------------------------------------------------- search */

/** How well a component answers a query. Higher is better; 0 is no match.
 *
 * The ladder is about where the words were found rather than how many matched:
 * someone typing "gate" wants the component called Gateway before the one whose
 * role happens to mention a gateway, and both before the three that merely sit
 * in a layer of that name. */
function score(c: Component, q: string, layerName: string, groupName: string): number {
  const name = c.name.toLowerCase();
  if (name === q) return 100;
  if (name.startsWith(q)) return 80;
  if (name.includes(q)) return 60;
  if (c.id.includes(q)) return 50;
  if ((c.tech || []).some(t => t.toLowerCase().includes(q))) return 40;
  /* Above `role` and below `tech`: someone typing "openshift" who wrote it on
   * the component means it, while a role that happens to mention the word is a
   * weaker answer. */
  if ((c.deployedOn || '').toLowerCase().includes(q)) return 35;
  if ((c.role || '').toLowerCase().includes(q)) return 30;
  if ((c.badge || '').toLowerCase().includes(q)) return 25;
  if (layerName.includes(q) || groupName.includes(q)) return 10;
  return 0;
}

export interface Hit { component: Component; layerName: string; groupName: string }

/** Components a query names, best first. An empty query returns the sheet in
 *  reading order, because the palette opens on it and a blank list would be a
 *  worse first impression than the document itself. */
export function searchComponents(doc: Architecture, query: string, limit = 40): Hit[] {
  const layerOf = new Map(doc.layers.map(l => [l.id, l.name]));
  const groupOf = new Map(doc.groups.map(g => [g.id, g.name]));
  const decorate = (c: Component): Hit => ({
    component: c,
    layerName: layerOf.get(c.layer) ?? c.layer,
    groupName: groupOf.get(c.group) ?? c.group
  });

  const q = query.trim().toLowerCase();
  if (!q) {
    const order = sheetRows(doc).flat();
    const byId = new Map(doc.components.map(c => [c.id, c]));
    return order.map(id => byId.get(id)).filter(Boolean).slice(0, limit).map(c => decorate(c!));
  }

  return doc.components
    .map(c => {
      const hit = decorate(c);
      return { hit, s: score(c, q, hit.layerName.toLowerCase(), hit.groupName.toLowerCase()) };
    })
    .filter(x => x.s > 0)
    /* Ties keep document order rather than falling to whatever sort() does with
     * them, so the list does not reshuffle between two keystrokes that score the
     * same. */
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map(x => x.hit);
}
