import { LINK_KINDS } from '@/lib/links';

/* The contract the model answers under.
 *
 * This is a JSON Schema passed to the provider, so the response is constrained
 * at generation time: the model cannot return prose, a half document, or a
 * field this file does not declare. That is the whole reason the feature is
 * safe to build — the failure mode of an LLM here is a *wrong* document, never
 * a malformed one, and a wrong document is something a human can read and
 * reject.
 *
 * Three shapes here cost a little elegance and buy a lot:
 *
 * 1. **Every property is required, and "unknown" is the empty string or the
 *    empty array.** Optional properties are legal JSON Schema, but they double
 *    the state space of the compiled grammar — Anthropic's own guidance is to
 *    make everything required — and the exact treatment of optionality is not
 *    something this file should bet on across four vendors. It also makes the
 *    model consider each field rather than quietly omit the ones it finds
 *    hard. `toArchitecture` drops the empties.
 *
 * 2. **It is kept flat and enum-free on purpose.** A schema is compiled into a
 *    grammar before generation, and past a size nobody publishes the provider
 *    refuses it outright: *"the compiled grammar is too large"*. Two things
 *    drive that — large enums, and objects nested inside arrays inside arrays.
 *    So dependency annotations live in one flat `links` array keyed by
 *    `from`/`to` rather than inside each component, and the icon is a plain
 *    string rather than a 38-way alternation. Nothing is lost: `convert.ts`
 *    validates both against the studio's own sets, which it has to do anyway —
 *    a model can return a wrong-but-legal value under any schema.
 *
 * 3. **This is a wire shape, not `Architecture`.** Deliberately a subset: no
 *    `ui`, no `theme`, no `sections`. Those are the author's decisions about
 *    how the document is presented and argued, and a model that has read one
 *    PDF has no basis for them.
 *
 * `src/lib/ai/schema.test.ts` checks this file against `types.ts` so the two
 * cannot drift apart silently. */

const str = { type: 'string' } as const;
const strList = { type: 'array', items: { type: 'string' } } as const;

const object = (props: Record<string, unknown>) => ({
  type: 'object',
  additionalProperties: false,
  required: Object.keys(props),
  properties: props
});

const list = (props: Record<string, unknown>) => ({ type: 'array', items: object(props) });

export const COMPONENT_FIELDS = [
  'id', 'name', 'group', 'layer', 'icon', 'badge', 'url', 'role',
  'tech', 'features', 'notes', 'deps'
] as const;

/** How much of the document to ask for. `lean` drops the two deepest branches
 *  and is the retry when a provider refuses to compile the full one. */
export type SchemaLevel = 'full' | 'lean';

export function analysisSchema(level: SchemaLevel = 'full') {
  const document: Record<string, unknown> = {
    meta: object({
      /** ISO 639-1 of the source document — the export is rendered in it. */
      lang: { type: 'string', enum: ['en', 'fr'] },
      name: str,
      tagline: str,
      kicker: str,
      intro: str,
      principle: str
    }),
    groups: list({ id: str, name: str, short: str, description: str }),
    layers: list({ id: str, name: str, desc: str }),
    components: list({
      id: str,
      name: str,
      group: str,
      layer: str,
      /* A key from the studio's icon set. Named in the prompt rather than
       * enumerated here — see the note on grammar size above. */
      icon: str,
      badge: str,
      url: str,
      role: str,
      tech: strList,
      features: strList,
      notes: strList,
      deps: strList
    }),
    /* Flat, and outside `components`, so the component item stays a shallow
     * object of strings and string arrays. */
    links: list({
      from: str,
      to: str,
      /* "" is how the model says it does not know how the call travels.
       * Forcing a choice between three kinds would manufacture one. Four short
       * literals: small enough to be worth constraining. */
      kind: { type: 'string', enum: ['', ...LINK_KINDS] },
      protocol: str,
      note: str
    })
  };

  if (level === 'full') {
    document.technologies = list({ name: str, category: str, description: str, groups: strList });
    document.flows = list({ id: str, name: str, sub: str, group: str, note: str });
    /* Steps are flat too, for the same reason the links are: an object inside
     * an array inside an array is what a grammar compiler charges most for.
     * Each names the flow it belongs to, and their order in this list is the
     * order of the flow. */
    document.flowSteps = list({ flow: str, component: str, title: str, description: str });
  }

  return object({
    document: object(document),
    /* The two side-channels. They never reach the document — they are what the
     * reader needs in order to judge it, and the reason this feature shows a
     * review screen rather than writing straight to the database. */
    assumptions: strList,
    questions: strList
  });
}

/** The full contract. `analysisSchema('lean')` is the fallback. */
export const ANALYSIS_SCHEMA = analysisSchema('full');

/* ------------------------------------------------------------------ types */
/* Hand-written rather than inferred: the schema above is a plain object so
 * that it can be sent over the wire unchanged, and inferring types from it
 * would be a lot of machinery to restate twelve field names. */

export interface WireLink { from: string; to: string; kind: string; protocol: string; note: string }

export interface WireComponent {
  id: string; name: string; group: string; layer: string;
  icon: string; badge: string; url: string; role: string;
  tech: string[]; features: string[]; notes: string[]; deps: string[];
}

export interface WireDocument {
  meta: { lang: 'en' | 'fr'; name: string; tagline: string; kicker: string; intro: string; principle: string };
  groups: { id: string; name: string; short: string; description: string }[];
  layers: { id: string; name: string; desc: string }[];
  components: WireComponent[];
  links: WireLink[];
  /** Absent on a lean run. */
  technologies?: { name: string; category: string; description: string; groups: string[] }[];
  /** Absent on a lean run. */
  flows?: { id: string; name: string; sub: string; group: string; note: string }[];
  /** Absent on a lean run. Ordered; each step names its flow. */
  flowSteps?: { flow: string; component: string; title: string; description: string }[];
}

export interface Analysis {
  document: WireDocument;
  assumptions: string[];
  questions: string[];
}
