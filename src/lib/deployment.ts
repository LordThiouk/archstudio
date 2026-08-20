/* Where a component runs.
 *
 * ------------------------------------------------------------ why not a zone
 *
 * A zone of kind `platform` already says "this runs on OpenShift", and it says
 * it by drawing a boundary. That is the right answer when the boundary is part
 * of the argument — when the point of the drawing is that these six things are
 * inside the cluster and those three are not. It is the wrong answer when the
 * hosting is just a fact about a component: a zone reserves a band of columns on
 * every layer of the sheet, forces its members to be contiguous, and there is
 * only one per component.
 *
 * So this is the other half. It draws no boundary, costs the layout nothing, and
 * works when what runs on a platform is scattered across the sheet. The two are
 * independent on purpose: a component can sit in the OpenShift zone *and* say
 * `deployedOn: "OpenShift"`, and the document is not wrong twice — it has drawn
 * a boundary and recorded a fact.
 *
 * ------------------------------------------------------------- why free text
 *
 * Every closed list breaks on the first real answer. "OpenShift" is a runtime
 * and "AWS" is a provider, and OpenShift on AWS is one deployment, not two
 * fields. Past the three obvious clouds the tail runs OVH, Scaleway, on-prem,
 * bare metal, Vercel, Fly, a named datacentre — a vocabulary nobody can finish
 * and everybody would fight.
 *
 * What makes free text usable as a filter dimension anyway is one pass:
 * `canonicalise` folds "openshift" onto the "OpenShift" the document already
 * has, so a typo cannot split one platform into three chips. The values in use
 * are then both the suggestion list and the chip row, which is the same trick
 * `marksInUse` plays — a key is drawn only when the document earned it.
 */

import type { Component } from './types';

/** The label every prose surface prints in front of the value. The card does
 *  not: there it is one outlined pill among tinted ones, and the treatment is
 *  the label. */
export const DEPLOYED_ON_LABELS: Record<'en' | 'fr', string> = {
  en: 'Deployed on',
  fr: 'Déployé sur'
};

/** Trim, fold the inner whitespace, and return `undefined` rather than an empty
 *  string — the contract `normalizeMarks` keeps, and the reason a document
 *  written before this field existed exports byte for byte as it did. */
export function cleanDeployedOn(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const out = value.trim().replace(/\s+/g, ' ');
  return out || undefined;
}

/** One spelling per platform, across the whole document.
 *
 *  Free text splits under case: "openshift" typed into the second component is
 *  a second chip, a second inventory row and a filter that hides half of what it
 *  claims. So the first spelling a document uses wins, and every later
 *  case-variant is folded onto it — in reading order, so the answer does not
 *  depend on which component happened to be edited last.
 *
 *  Only case is folded. "OpenShift 4.14" and "OpenShift" are two answers, and
 *  guessing that they are one is not this function's call to make. */
export function canonicalise(components: Component[]): void {
  const first = new Map<string, string>();
  components.forEach(c => {
    const value = cleanDeployedOn(c.deployedOn);
    if (!value) return;
    const key = value.toLowerCase();
    const known = first.get(key);
    if (known) c.deployedOn = known;
    else { first.set(key, value); c.deployedOn = value; }
  });
}

/** The platforms this document names, once each, alphabetically.
 *
 *  Alphabetical rather than by count: this list is a row of filter chips, and a
 *  row that reorders itself when you add a component is a row you have to read
 *  again every time. */
export function deploymentsInUse(components: Component[]): string[] {
  const seen = new Set<string>();
  components.forEach(c => {
    const value = cleanDeployedOn(c.deployedOn);
    if (value) seen.add(value);
  });
  return [...seen].sort((a, b) => a.localeCompare(b));
}
