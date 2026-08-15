import { AI_MAX_TOKENS } from './config';
import { adapterFor, type AiConfig, type CompleteInput, type Part } from './providers';
import { analysisSchema, type Analysis, type SchemaLevel } from './schema';
import { ENRICH_SYSTEM_PROMPT, SYSTEM_PROMPT, inventoryBrief, userInstruction } from './prompt';
import type { Architecture } from '@/lib/types';

/* The one call this project makes to anything outside the machine it runs on.
 *
 * A single request: read a document, return an ArchStudio document under a
 * schema the provider enforces during generation. No agent, no loop, no tools —
 * there is nothing here for a model to explore, and a second round trip would
 * only give it room to drift from the source it was handed.
 *
 * Which vendor answers is decided in the settings dialog and resolved by
 * `adapterFor`; nothing below this line knows or cares. */

export type SourceKind = 'pdf' | 'text';

export interface Source {
  kind: SourceKind;
  filename: string;
  /** base64 for a PDF, the text itself for anything else. */
  data: string;
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  /** US dollars, only when the settings carry a price for this model. */
  cost: number | null;
}

export interface AnalysisResult {
  analysis: Analysis;
  usage: Usage;
  /** True when the provider refused the full schema and the lean one was used:
   *  flows and the technology table were not asked for. Surfaced in review. */
  reduced: boolean;
}

export interface Estimate {
  tokens: number;
  /** False when the number came from counting characters, not the provider. */
  exact: boolean;
  lowCost: number | null;
  highCost: number | null;
}

function buildInput(source: Source, existing: Architecture | null, level: SchemaLevel = 'full'): CompleteInput {
  const mode = existing ? 'enrich' : 'create';
  const parts: Part[] = [];
  if (existing) parts.push({ kind: 'text', text: inventoryBrief(existing) });
  parts.push(source.kind === 'pdf'
    ? { kind: 'pdf', filename: source.filename, base64: source.data }
    : { kind: 'text', text: `<document name="${source.filename}">\n${source.data}\n</document>` });
  parts.push({ kind: 'text', text: userInstruction(mode) });

  return {
    system: existing ? ENRICH_SYSTEM_PROMPT : SYSTEM_PROMPT,
    parts,
    schema: analysisSchema(level) as unknown as Record<string, unknown>,
    maxTokens: AI_MAX_TOKENS
  };
}

const price = (tokens: number, perMTok?: number): number | null =>
  perMTok === undefined ? null : (tokens / 1_000_000) * perMTok;

/** What this run will cost before it is started. The output half is a guess,
 *  and is shown as a range: a document's worth of components lands somewhere
 *  between 8k and 30k tokens, and nothing cheaper than the run itself knows. */
export async function estimate(cfg: AiConfig, source: Source, existing: Architecture | null): Promise<Estimate> {
  const input = buildInput(source, existing);
  const counted = await adapterFor(cfg).countTokens(cfg, input);

  const inCost = price(counted.tokens, cfg.inputPrice);
  const out = (n: number) => price(n, cfg.outputPrice);
  const total = (o: number | null) => (inCost === null && o === null ? null : (inCost ?? 0) + (o ?? 0));

  return {
    tokens: counted.tokens,
    exact: counted.exact,
    lowCost: total(out(8_000)),
    highCost: total(out(30_000))
  };
}

/* A provider compiles the schema into a grammar before it generates, and past
 * a size none of them publishes it refuses outright — Anthropic says "the
 * compiled grammar is too large". The schema is already written to keep that
 * small (flat links, no icon enum), but "small enough" is not something this
 * code can know for a given vendor and model. So when it happens, ask for less
 * of the document rather than failing: the lean schema drops the flows and the
 * technology table, which are the two deepest branches, and the reader is told
 * what was skipped. */
const GRAMMAR_TOO_BIG = /grammar is too large|too complex|schema is too large|exceeds.*complexity/i;

export async function analyse(
  cfg: AiConfig, source: Source, existing: Architecture | null
): Promise<AnalysisResult> {
  let reduced = false;
  let result;
  try {
    result = await adapterFor(cfg).complete(cfg, buildInput(source, existing, 'full'));
  } catch (e) {
    if (!GRAMMAR_TOO_BIG.test((e as Error).message ?? '')) throw e;
    reduced = true;
    result = await adapterFor(cfg).complete(cfg, buildInput(source, existing, 'lean'));
  }

  /* The schema is enforced during generation, so this is the contract moving
   * rather than the model wandering — but a compatible server that only
   * pretends to support json_schema lands here too, which is exactly the case
   * the settings dialog's Test button exists to catch first. */
  if (!result.json || typeof result.json !== 'object') {
    throw new Error('The provider returned something that is not the agreed document format.');
  }

  const inCost = price(result.inputTokens, cfg.inputPrice);
  const outCost = price(result.outputTokens, cfg.outputPrice);

  return {
    analysis: result.json as Analysis,
    reduced,
    usage: {
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      cost: inCost === null && outCost === null ? null : (inCost ?? 0) + (outCost ?? 0)
    }
  };
}
