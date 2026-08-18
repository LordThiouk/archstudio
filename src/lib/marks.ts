/* How a component is reached, and what it holds.
 *
 * Every landscape diagram in the wild carries a second legend under the
 * technical one: SSO protected, basic authentication, secured. It is drawn as
 * badges on the cards, and it is the half of the drawing a security review
 * actually reads — "which of these is reachable without a login" is a question
 * about the whole sheet at once, which is exactly what a diagram is for and
 * what a table of components is not.
 *
 * A closed set, not free text. `badge` already exists for the one word that
 * fits no category ("B2B"), and it stays. What a closed set buys is the legend:
 * five glyphs the reader learns once, generated only for the ones this document
 * uses, and a search that can find every unauthenticated endpoint. Free text
 * would give "SSO", "sso", "Sign-on" and no legend at all.
 *
 * Neutral ink, never a hue. The reference diagrams paint the SSO badge red;
 * colour here belongs to scope (rule 1) and teal to what the reader can act on
 * (rule 2), so a mark is a glyph and its meaning lives in the legend. That also
 * makes it survive the monochrome print, which a red badge does not.
 */

import type { Component } from './types';

export type SecurityMark = 'sso' | 'basic-auth' | 'secured' | 'public' | 'pii';

/** Declaration order is drawing order, everywhere: the marks on a card and the
 *  entries in the legend read the same way round on every sheet. Weakest
 *  protection first, because that is the reading a review is scanning for. */
export const SECURITY_MARKS: SecurityMark[] = ['public', 'basic-auth', 'sso', 'secured', 'pii'];

/** Icon key per mark, from the shared set in `ICON_KEYS`. */
export const MARK_ICON: Record<SecurityMark, string> = {
  public: 'globe',
  'basic-auth': 'users',
  sso: 'key',
  secured: 'lock',
  pii: 'eye'
};

export const MARK_LABELS: Record<SecurityMark, { en: string; fr: string }> = {
  public: { en: 'no authentication', fr: 'sans authentification' },
  'basic-auth': { en: 'basic authentication', fr: 'authentification basique' },
  sso: { en: 'SSO protected', fr: 'protégé par SSO' },
  secured: { en: 'secured', fr: 'sécurisé' },
  pii: { en: 'holds personal data', fr: 'contient des données personnelles' }
};

/** What each mark claims, shown once in the editor rather than in a tooltip —
 *  the treatment `LINK_KIND_BLURBS` and `STATE_BLURBS` get. */
export const MARK_BLURBS: Record<SecurityMark, string> = {
  public: 'Reachable without credentials. Say so here rather than let a reader assume otherwise.',
  'basic-auth': 'A shared secret over the wire. Name it so the review can ask why.',
  sso: 'Behind the identity provider. Its availability is now your availability.',
  secured: 'Authenticated and encrypted, by a mechanism this diagram does not name.',
  pii: 'Holds personal data. Decides retention, residency and who may read a backup.'
};

const KNOWN = new Set<string>(SECURITY_MARKS);

export const isSecurityMark = (v: unknown): v is SecurityMark =>
  typeof v === 'string' && KNOWN.has(v);

/** Keep the known marks, once each, in declaration order.
 *
 *  Returns `undefined` when nothing survives, so a component that carries none
 *  has no key rather than an empty array — the same contract `links` keeps, and
 *  the reason a document written before this field existed exports unchanged. */
export function normalizeMarks(marks: unknown): SecurityMark[] | undefined {
  if (!Array.isArray(marks)) return undefined;
  const seen = new Set(marks.filter(isSecurityMark));
  const out = SECURITY_MARKS.filter(m => seen.has(m));
  return out.length ? out : undefined;
}

/** Which marks this document uses — both renderers ask before drawing a legend.
 *  A legend for five glyphs on a sheet that uses one is furniture. */
export function marksInUse(components: Component[]): SecurityMark[] {
  const seen = new Set<SecurityMark>();
  components.forEach(c => (c.marks || []).forEach(m => seen.add(m)));
  return SECURITY_MARKS.filter(m => seen.has(m));
}

/** "SSO protected · holds personal data" — the drawer and the printed sheet
 *  spell the marks out, because they have the room a card corner does not. */
export function describeMarks(
  marks: SecurityMark[] | undefined, lang: 'en' | 'fr' = 'en'
): string | null {
  if (!marks?.length) return null;
  return marks.map(m => MARK_LABELS[m][lang]).join(' · ');
}
