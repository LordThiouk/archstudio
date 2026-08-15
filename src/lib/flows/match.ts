/* Binding a pattern's steps to a document's components.
 *
 * The scorer is deliberately dumb: token overlap on a few fields, integer
 * weights, no learning and no fuzzy distance. Two reasons. It runs in the
 * browser on every pattern the user opens, so it has to be instant on a
 * hundred-component document. And its output is a *proposal* shown in a form
 * with a select per step — being right eight times out of ten and legibly wrong
 * the other two beats being right nine times out of ten by a rule nobody can
 * predict.
 *
 * Determinism matters more than accuracy here: the same pattern against the
 * same document must always propose the same bindings, or the review step stops
 * being reviewable. Hence integer weights (floats invite ties that shift with
 * hint order), iteration in document order, and a strict `>` so the earliest
 * component always wins a tie.
 */

import type { Component } from '../types';
import type { FlowHint } from './types';

export interface Binding {
  /** null when nothing scored above zero — the step is proposed as skipped. */
  component: string | null;
  score: number;
  /** False when the winner only had weak signals. Drives the "guess" chip. */
  confident: boolean;
}

/** Enough weight to stop calling it a guess — see `confident` below. */
const CONFIDENT_AT = 8;

/** Below four characters a prefix match is noise: `db` would take "dbt". */
const MIN_LOOSE = 4;

/**
 * Fold text into a space-padded bag of tokens: accents stripped, lowercase,
 * anything non-alphanumeric turned into a separator. Same diacritic idiom as
 * `slugify`, so a French hint (`entree`) reaches a French component
 * ("Passerelle d'entrée"). The padding is what lets a whole-token test be a
 * plain `includes(' term ')`.
 */
export function fold(s: string | undefined): string {
  if (!s) return ' ';
  const flat = s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return flat ? ` ${flat} ` : ' ';
}

const foldAll = (xs: (string | undefined)[] | undefined): string =>
  (xs || []).map(fold).join('');

/** Does the haystack hold `term` as a whole token? */
const hasToken = (hay: string, term: string): boolean => hay.includes(` ${term} `);

/** Does some token in the haystack start with `term`? */
const hasPrefix = (hay: string, term: string): boolean => hay.includes(` ${term}`);

/**
 * How well `c` answers `h`, and whether any of it came from what the component
 * calls itself.
 *
 * The weights are ordered, not calibrated: an exact name token (10) must beat a
 * prefix (8), which must beat everything the wide haystack can offer (4), which
 * must beat a layer or icon coincidence (2). Only the ordering is load-bearing.
 *
 * `strong` is tracked separately because score alone conflates two very
 * different situations. A component named "Order API" answering a hint for
 * `api` and one whose *feature list* happens to mention pricing twice can reach
 * the same total, and only the first is something the user can check at a
 * glance. The second is worth proposing and worth flagging, so the modal needs
 * to be able to tell them apart.
 */
function rate(c: Component, h: FlowHint): { score: number; strong: boolean } {
  const narrow = fold(c.name) + fold(c.id);
  const wide = narrow + foldAll(c.tech) + fold(c.role) + fold(c.badge) + foldAll(c.notes)
    + foldAll(c.features);

  for (const raw of h.avoid || []) {
    const t = fold(raw).trim();
    if (t && hasPrefix(narrow, t)) return { score: -1, strong: false };
  }

  let s = 0;
  let strong = false;
  for (const raw of h.name || []) {
    const t = fold(raw).trim();
    if (!t) continue;
    if (hasToken(narrow, t)) { s += 10; strong = true; }
    else if (t.length >= MIN_LOOSE && hasPrefix(narrow, t)) { s += 8; strong = true; }
    else if (t.length >= MIN_LOOSE && narrow.includes(t)) { s += 4; strong = true; }
    else if (hasToken(wide, t)) s += 4;
  }
  for (const raw of h.tech || []) {
    const t = fold(raw).trim();
    if (!t) continue;
    if (hasToken(wide, t)) s += 3;
    else if (t.length >= MIN_LOOSE && wide.includes(t)) s += 2;
  }
  if (c.layer && h.layers?.includes(c.layer)) s += 2;
  if (c.icon && h.icons?.includes(c.icon)) s += 2;
  return { score: s, strong };
}

/** How well `c` answers `h`. Zero means "no signal", -1 means "disqualified". */
export function scoreComponent(c: Component, h: FlowHint): number {
  return rate(c, h).score;
}

/* Two adjustments applied before comparison, never to the reported score.
 * A step landing on the component the previous step already occupies is a
 * no-op in the viewer's animation, so it is effectively banned; a component
 * revisited later in the flow is legal — a journey that returns to the client
 * is normal — but is not the default guess. */
const SAME_AS_PREVIOUS = -1000;
const ALREADY_USED = -3;

/**
 * Propose one component per step. Greedy, left to right: an earlier step never
 * reconsiders because of a later one, which keeps the result explainable
 * ("step 3 took the gateway because step 3 asked for it").
 */
export function matchSteps(steps: { hint: FlowHint }[], components: Component[]): Binding[] {
  const used = new Set<string>();
  let previous: string | null = null;
  const out: Binding[] = [];

  for (const step of steps) {
    let bestId: string | null = null;
    let bestAdjusted = 0;
    let best = { score: 0, strong: false };

    for (const c of components) {
      const rated = rate(c, step.hint);
      if (rated.score <= 0) continue;
      const adjusted = rated.score
        + (c.id === previous ? SAME_AS_PREVIOUS : used.has(c.id) ? ALREADY_USED : 0);
      if (adjusted > bestAdjusted) {
        bestAdjusted = adjusted;
        best = rated;
        bestId = c.id;
      }
    }

    if (bestId) used.add(bestId);
    previous = bestId;
    out.push({
      component: bestId,
      score: bestId ? best.score : 0,
      /* Confident means "you can see why from the component's own name".
       * Anything won on features, stack, layer or icon alone is a proposal
       * worth making and worth flagging. */
      confident: best.strong && best.score >= CONFIDENT_AT
    });
  }

  return out;
}
