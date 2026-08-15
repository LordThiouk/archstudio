/* Turning one of the user's own flows into something reusable.
 *
 * The obvious implementation — store the `Flow` as it stands — is the wrong
 * one, and it fails in the worst possible way. Component ids are local to a
 * document, so a saved flow reinserted into any *other* project resolves to
 * nothing, `normalizeArchitecture` strips every step, and the user gets an
 * empty flow back with no explanation. "Save this for later" must not do that.
 *
 * So a saved flow is converted to the same hinted shape the catalogue uses: the
 * step keeps its prose, and its component is described rather than named. Three
 * things follow, and they are the whole argument for this file:
 *
 *   - catalogue and library share one insertion path, one modal, one scorer;
 *   - reinserted into the *source* project it still binds exactly, because the
 *     hint carries the component's own name tokens and its id, which score a
 *     whole-token match on that very component;
 *   - reinserted anywhere else it degrades into a proposal the user reviews,
 *     which is the honest answer rather than a silent one.
 *
 * This reads the document from React state, not from the database, so a pattern
 * saved while the editor is still dirty captures what is on screen. That is the
 * behaviour people expect from a button sitting next to the thing it copies.
 */

import {
  LIBRARY_MAX_DESC, LIBRARY_MAX_STEPS,
  type FlowHint, type FlowPatternStep, type LibraryPattern
} from './types';
import type { Architecture, Component, Flow } from '../types';

/** A word is worth hinting on from three characters up — below that it matches everything. */
const MIN_TOKEN = 3;

const tokens = (s: string | undefined): string[] =>
  (s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().split(/[^a-z0-9]+/)
    .filter(t => t.length >= MIN_TOKEN);

const uniq = (xs: string[]): string[] => [...new Set(xs)];

/** Describe a component well enough that the scorer can find it again. */
function hintFor(c: Component): FlowHint {
  const name = uniq([...tokens(c.name), ...tokens(c.id)]).slice(0, 5);
  const tech = uniq((c.tech || []).flatMap(tokens)).filter(t => !name.includes(t)).slice(0, 4);
  return {
    ...(name.length ? { name } : {}),
    ...(tech.length ? { tech } : {}),
    ...(c.layer ? { layers: [c.layer] } : {}),
    ...(c.icon ? { icons: [c.icon] } : {})
  };
}

const clamp = (s: string | undefined): string | undefined =>
  s && s.length > LIBRARY_MAX_DESC ? s.slice(0, LIBRARY_MAX_DESC) : s;

/**
 * The POST body for "save as a pattern". `id` and `savedAt` are the server's to
 * mint — a client-chosen id could collide with an existing entry, and a
 * client-chosen timestamp would order the library by the user's clock.
 */
export type NewLibraryPattern = Omit<LibraryPattern, 'id' | 'savedAt'>;

export function toFlowPattern(doc: Architecture, flow: Flow, opts?: { from?: string }): NewLibraryPattern {
  const byId = new Map(doc.components.map(c => [c.id, c]));

  const steps: FlowPatternStep[] = flow.steps
    .slice(0, LIBRARY_MAX_STEPS)
    .flatMap((s, i) => {
      const c = byId.get(s.component);
      /* A step whose component has already been deleted describes nothing.
       * Keeping it would only produce a step that skips on every insert. */
      if (!c) return [];
      const description = clamp(s.description);
      return [{
        key: `s${i}`,
        title: s.title,
        ...(description ? { description } : {}),
        hint: hintFor(c)
      }];
    });

  return {
    source: 'library',
    icon: 'route',
    name: flow.name,
    tagline: flow.sub || `${steps.length} steps`,
    ...(flow.sub ? { sub: flow.sub } : {}),
    ...(flow.note ? { note: flow.note } : {}),
    ...(opts?.from ? { from: opts.from } : {}),
    steps
  };
}
