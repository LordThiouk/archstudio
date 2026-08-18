/* The grammar of a transition.
 *
 * A landscape diagram is not one more picture of the system. It is a picture of
 * a *delta*: this is what exists, this is what we are adding, this is what goes
 * away. That is the whole reason it survives a year of steering committees on
 * one page — you present the same drawing and move the marks.
 *
 * The hard constraint is that the reference diagrams all encode this in fill
 * colour (blue = new, yellow = updated, hatched = removed), and colour here
 * belongs to scope. Rule 1: a scope colour never touches a border, and no other
 * meaning may touch the fill. Rule 2: teal is reserved for what you can act on.
 * So the transition gets the channels colour never claimed:
 *
 *   on a card   the border treatment, and a monospace tick in the corner
 *   on an edge  the stroke weight, and a sign in the plate the protocol
 *               already established — `+` added, `~` changed, `-` removed
 *
 * All four survive a monochrome print and a reader who cannot separate two
 * hues, which a hatched red box does not.
 *
 * Unset means "already there", and is left unset rather than written out. A
 * document that says nothing about its transition draws exactly as it did
 * before this file existed.
 */

import type { Component, Link } from './types';

export type Lifecycle = 'new' | 'changed' | 'removed';

export const LIFECYCLES: Lifecycle[] = ['new', 'changed', 'removed'];

/** The corner tick on a card. Three letters, monospace — rule 3. */
export const STATE_TICK: Record<Lifecycle, string> = {
  new: 'NEW',
  changed: 'MOD',
  removed: 'DEL'
};

/** The sign in an edge's plate. One character, so it fits in front of a
 *  protocol without pushing the plate wider than the curve it sits on. */
export const STATE_SIGN: Record<Lifecycle, string> = {
  new: '+',
  changed: '~',
  removed: '-'
};

export const STATE_LABELS: Record<Lifecycle, { en: string; fr: string }> = {
  new: { en: 'new', fr: 'nouveau' },
  changed: { en: 'updated', fr: 'modifié' },
  removed: { en: 'removed', fr: 'supprimé' }
};

/** What each mark commits you to, shown once in the editor rather than hidden
 *  in a tooltip — the same treatment `LINK_KIND_BLURBS` gets. */
export const STATE_BLURBS: Record<Lifecycle, string> = {
  new: 'Does not exist yet. Everything it depends on has to exist first.',
  changed: 'Exists, and this programme changes it. The riskiest of the three.',
  removed: 'Exists and goes away. Nothing new may depend on it.'
};

/** Both renderers emphasise a departure from the existing state, and only the
 *  removal is drawn quieter than an ordinary edge. */
export const STATE_STROKE: Record<Lifecycle, number> = {
  new: 2,
  changed: 2,
  removed: 1.2
};

/** A removal is drawn as a ghost — it is on the sheet to be read, not to be
 *  followed. Existing edges sit at .3 in the viewer and .45 on paper, so this
 *  is a fraction of whatever the surface's resting opacity is. */
export const REMOVED_GHOST = 0.45;

export const isLifecycle = (v: unknown): v is Lifecycle =>
  typeof v === 'string' && (LIFECYCLES as string[]).includes(v);

/** The tick for a card, or null when the component is simply already there. */
export const stateTick = (state?: Lifecycle): string | null =>
  state ? STATE_TICK[state] : null;

/** The sign for an edge's plate, or null. */
export const stateSign = (state?: Lifecycle): string | null =>
  state ? STATE_SIGN[state] : null;

/** Which states this document actually uses — components and edges together.
 *
 *  Both renderers ask before drawing a legend and before offering the
 *  Transition toggle: a switch that changes nothing is worse than no switch,
 *  because the reader spends a moment working out that it did nothing. */
export function statesInUse(components: Component[]): Lifecycle[] {
  const seen = new Set<Lifecycle>();
  components.forEach(c => {
    if (c.state) seen.add(c.state);
    (c.links || []).forEach(l => { if (l.state) seen.add(l.state); });
  });
  return LIFECYCLES.filter(s => seen.has(s));
}

/** Does this document describe a transition at all? */
export const isTransition = (components: Component[]): boolean =>
  components.some(c => c.state || (c.links || []).some(l => l.state));

/* --------------------------------------------------------------- the target
 *
 * With the Transition toggle off the sheet shows the state we are heading for,
 * which means the removals leave the drawing rather than fading inside it — the
 * same reasoning as the emptied clusters under a scope filter: a view you asked
 * to narrow should get shorter, not merely paler.
 */

/** Is this component hidden when the reader asks for the target state only? */
export const droppedInTarget = (c: Component, transition: boolean): boolean =>
  !transition && c.state === 'removed';

/** Is this edge hidden in the target state?
 *
 *  An edge goes when it is marked removed *or* when either end does — a
 *  dependency on a component that will not be there is not a dependency that
 *  survives, whatever the edge itself was annotated with. */
export function edgeDroppedInTarget(
  caller: Component, callee: Component, link: Link | undefined, transition: boolean
): boolean {
  if (transition) return false;
  return link?.state === 'removed'
    || caller.state === 'removed'
    || callee.state === 'removed';
}

/** The resting opacity of an edge on a surface whose ordinary edges sit at
 *  `base` — a removal is a ghost of one. */
export const edgeOpacity = (state: Lifecycle | undefined, base: number): number =>
  state === 'removed' ? base * REMOVED_GHOST : base;

/** The stroke weight for an edge, given the surface's ordinary weight. */
export const edgeStroke = (state: Lifecycle | undefined, base: number): number =>
  state ? STATE_STROKE[state] : base;
