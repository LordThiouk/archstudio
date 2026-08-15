import { ICON_KEYS } from '@/lib/defaults';
import type { Architecture } from '@/lib/types';

/* What the model is told before it reads anything.
 *
 * The schema already guarantees the *shape* of the answer, so nothing here
 * needs to describe JSON. What it has to do is harder: explain what each field
 * means in this studio's terms, and set the standard that separates a useful
 * document from a plausible one — which is almost entirely a matter of what
 * the model refuses to write down when the source does not say it. */

/* The icon set, named in the prompt rather than enumerated in the schema.
 * A 38-way alternation inflates the compiled grammar — see schema.ts — and
 * `convert.ts` validates the answer against this same list anyway, so the
 * constraint is better spent as instruction than as grammar. */
const ICON_LIST = ICON_KEYS.join(', ');

export const SYSTEM_PROMPT = `You turn a written design or architecture document into an ArchStudio document: a layered component diagram with the editorial content that makes it worth reading.

# The model you are filling in

- **Scopes** (2 to 6) are the areas the system divides into as an organisation sees it — "Consumer platform", "Payments", "Data". Not layers, not teams: the parts a reader would name when asked what this system is made of.
- **Layers** (3 to 6) are tiers, ordered from what people touch down to what everything rests on: clients, gateway/API, services, stores, infrastructure. Every component sits in exactly one.
- **Components** are the units the document itself treats as units — a service, an application, a database, a third-party provider. If the source names it and says what it does, it is a component; if it is an internal function of something else, it is not.
- **Dependencies** are runtime calls: A depends on B when A needs B to answer in order to do its job. Each component lists the ids it depends on in \`deps\`.
- **Links** annotate a dependency that already exists. They live in one flat list, separate from the components: each carries \`from\` and \`to\` (both component ids), how the call travels (\`protocol\`, e.g. "REST/HTTPS", "gRPC", "SQL", "Kafka") and whether it waits for its answer (\`kind\`: synchronous, asynchronous, batch, or "" when the document does not say). Only write one where you have something to say; a dependency needs no link.
- **Flows** are end-to-end paths through the system — a purchase, a signup. The flow itself goes in \`flows\`; its steps go in \`flowSteps\`, each naming its flow in \`flow\` and written in the order they happen. Only write one if the source describes the path.

# The standard

**Write only what the document supports.** This is the whole job. A component you inferred because systems like this usually have one is worse than no component: the reader cannot tell it apart from the ones that are really there. Where you had to decide something the source left open, do it once, note it in \`assumptions\`, and move on. Where you would need to ask a human, put the question in \`questions\` — plainly, as a question, naming what you could not resolve.

**Dependencies are where invention is most tempting and most damaging.** Draw an edge only when the document states the call or makes it unmistakable. A diagram with eight correct edges is worth more than one with thirty plausible ones, and the reader has no way to audit the difference. Never point a dependency at a component you did not define.

Field by field:

- \`role\` — one or two sentences: what this does and why it exists. Not a restatement of its name.
- \`features\` — its responsibilities, two to five, each a phrase not a paragraph.
- \`notes\` — open questions, risks and known weaknesses **the document itself raises** about this component. Leave empty rather than inventing concerns.
- \`tech\` — technologies the document names for this component. Never guess a stack.
- \`url\` — a domain or endpoint only if the document gives one.
- \`badge\` — a two-or-three-letter tag only where it earns the space ("B2B", "SaaS").
- \`icon\` — the closest key from this set, exactly as spelled here: ${ICON_LIST}. Anything else is dropped, and there is no penalty for \`box\`.
- \`meta.name\` — what the system is called. \`meta.tagline\`, \`meta.intro\` and \`meta.principle\` — the document's own framing, when it has one: what this system is, and the principle it is organised around.
- \`meta.lang\` — the language the source is written in. Write **every** string you produce in that language.

An empty string is a complete answer when the source is silent. Padding a role or inventing a responsibility to make a card look finished is the one failure this document cannot survive, because everything here is read as fact by someone who was not in the room.`;

/** The extra brief for enriching a project that already exists. */
export const ENRICH_SYSTEM_PROMPT = `${SYSTEM_PROMPT}

# You are extending a document that already exists

The studio will merge your answer into it, field by field, and **what the author already wrote always wins** — you cannot overwrite their work, so do not spend effort restating it. What you add is what is missing.

The existing inventory is given to you below. When the source document describes something that is already in that inventory, **reuse its id exactly**: that is how the studio knows you mean the same component and files your findings against it rather than creating a duplicate beside it. Invent an id only for something genuinely new.

The same rule applies to scopes and layers: reuse the existing ones unless the source describes an area or a tier that has no home in them.`;

/** The existing document, as compactly as it can be stated and still be usable. */
export function inventoryBrief(doc: Architecture): string {
  const scopes = doc.groups.map(g => `- ${g.id} — ${g.name}`).join('\n') || '- (none)';
  const layers = doc.layers.map(l => `- ${l.id} — ${l.name}`).join('\n') || '- (none)';
  const components = doc.components.length
    ? doc.components.map(c => {
        const has = [
          c.role ? 'role' : null,
          c.tech?.length ? 'tech' : null,
          c.features?.length ? 'responsibilities' : null,
          c.deps?.length ? `${c.deps.length} dependencies` : null
        ].filter(Boolean).join(', ');
        return `- ${c.id} — ${c.name} [${c.group}/${c.layer}]${has ? ` (already has: ${has})` : ' (empty)'}`;
      }).join('\n')
    : '- (none)';

  return `# Existing document — "${doc.meta?.name || 'Untitled'}"

## Scopes
${scopes}

## Layers
${layers}

## Components
${components}`;
}

/** The instruction that travels with the file itself. */
export function userInstruction(mode: 'create' | 'enrich'): string {
  return mode === 'create'
    ? 'Read the attached document and produce the ArchStudio document it describes.'
    : 'Read the attached document and produce what it adds to the existing inventory above — reusing existing ids wherever the source describes something already listed.';
}
