/* The same schema, in each vendor's accent.
 *
 * `ANALYSIS_SCHEMA` is plain JSON Schema and stays that way: it is the thing
 * `convert.ts` is written against and the thing the tests hold. What differs is
 * what each API will accept.
 *
 * - **Anthropic** takes it unchanged.
 * - **OpenAI-compatible** takes it unchanged under `strict: true`, which
 *   demands `additionalProperties: false` on every object and every property
 *   listed in `required`. The schema already satisfies both — not by luck: it
 *   was written that way so "unknown" is the empty string rather than an
 *   absent field, and `schema.test.ts` keeps it so.
 * - **Gemini** wants an OpenAPI-flavoured Schema object: types in upper case,
 *   no `additionalProperties`, and an explicit property order. */

type Node = {
  type?: string;
  properties?: Record<string, Node>;
  items?: Node;
  required?: string[];
  enum?: string[];
  additionalProperties?: boolean;
};

export interface GeminiSchema {
  type: string;
  properties?: Record<string, GeminiSchema>;
  items?: GeminiSchema;
  required?: string[];
  enum?: string[];
  format?: string;
  propertyOrdering?: string[];
}

export function toGeminiSchema(schema: Record<string, unknown>): GeminiSchema {
  return convert(schema as Node);
}

function convert(node: Node): GeminiSchema {
  const out: GeminiSchema = { type: String(node.type ?? 'string').toUpperCase() };

  /* An enum is worth keeping — it is what stops the model inventing an icon —
   * but only when every value is a real word. Gemini's enum handling pairs
   * with `format: "enum"`, and an empty-string member of that set is asking
   * for trouble on a surface we cannot test from here. Where the studio uses
   * "" to mean "I don't know" (a link's kind), the constraint is dropped and
   * `convert.ts` does the validating instead — it already has to, since a
   * model can return a wrong-but-legal value under any schema. */
  if (node.enum?.length && node.enum.every(v => v !== '')) {
    out.enum = [...node.enum];
    out.format = 'enum';
  }

  if (node.items) out.items = convert(node.items);

  if (node.properties) {
    out.properties = Object.fromEntries(
      Object.entries(node.properties).map(([k, v]) => [k, convert(v)])
    );
    /* Gemini emits fields in whatever order it likes unless told; the schema's
     * own order reads best when a human inspects the raw answer. */
    out.propertyOrdering = Object.keys(node.properties);
  }

  if (node.required?.length) out.required = [...node.required];

  return out;
}
