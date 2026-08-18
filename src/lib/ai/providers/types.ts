/* One shape for every provider.
 *
 * The studio needs exactly one thing from a model: read this document and
 * return JSON that validates against this schema. Every provider can do it,
 * and every provider spells it differently — a `format` here, a
 * `response_format` there, a `responseSchema` in a third place, with a
 * different name for the same field in each. The adapters below absorb that,
 * and nothing above this directory knows which vendor answered.
 *
 * Six entries, three adapters: OpenAI, NVIDIA, Poolside and "anything
 * OpenAI-compatible" are one code path, which is also what makes Ollama, vLLM,
 * Groq, Together and OpenRouter work without a line of their own.
 *
 * A named entry buys nothing the `compatible` row cannot already do — it buys
 * the operator not having to know a base URL, and it buys the one field the
 * studio cannot guess: `supportsPdf`, which narrows the file picker before
 * someone chooses a document the provider will refuse. */

export type ProviderId =
  | 'anthropic' | 'openai' | 'gemini' | 'nvidia' | 'poolside' | 'compatible';
export type AdapterId = 'anthropic' | 'openai' | 'gemini';

/** What the studio holds about one provider. The key never leaves the server. */
export interface AiConfig {
  provider: ProviderId;
  model: string;
  /** Required for `compatible`; defaulted from the registry otherwise. */
  baseUrl?: string;
  apiKey: string;
  /** US dollars per million tokens. Optional: without them the run shows a
   *  token count and no price, which is better than a made-up price. */
  inputPrice?: number;
  outputPrice?: number;
}

/** The content of one request, before any provider has been chosen. */
export type Part =
  | { kind: 'text'; text: string }
  | { kind: 'pdf'; filename: string; base64: string };

export interface CompleteInput {
  system: string;
  parts: Part[];
  /** Plain JSON Schema. Each adapter translates it into its own dialect. */
  schema: Record<string, unknown>;
  maxTokens: number;
}

export interface CompleteResult {
  json: unknown;
  inputTokens: number;
  outputTokens: number;
}

export interface TokenCount {
  tokens: number;
  /** False when the number is a character-count estimate rather than the
   *  provider's own tokeniser — the UI says so rather than implying precision. */
  exact: boolean;
}

export interface Adapter {
  listModels(cfg: AiConfig): Promise<string[]>;
  complete(cfg: AiConfig, input: CompleteInput): Promise<CompleteResult>;
  countTokens(cfg: AiConfig, input: CompleteInput): Promise<TokenCount>;
}

/** What the settings dialog needs to render one provider's form. */
export interface ProviderInfo {
  id: ProviderId;
  label: string;
  adapter: AdapterId;
  blurb: string;
  /** Where to get a key, for the link under the field. */
  keyUrl: string;
  keyPlaceholder: string;
  defaultBaseUrl?: string;
  /** Only `compatible` asks the operator for one. */
  baseUrlEditable: boolean;
  defaultModel?: string;
  /** Whether a PDF can be handed over as-is. Text always can. */
  supportsPdf: boolean;
  /** Read when no key is stored, so a container can pass one in. */
  envKey?: string;
  /* Read when no endpoint is stored — only on the providers whose endpoint is
   * the operator's to choose, which is what `baseUrlEditable` marks. An
   * enterprise running its own inference instance would otherwise have to open
   * the dialog and retype the URL on every fresh deployment, while its key
   * arrives from the environment: the same configuration, half of it
   * automatable. Overriding an endpoint the dialog presents as fixed is a
   * different feature and deliberately not this one. */
  envBaseUrl?: string;
  /* How this provider's keys begin. Used only to notice that a key belongs to
   * a *different* provider — never to reject one, because a vendor is free to
   * change the shape of its keys tomorrow and a studio that refused the new
   * format would be broken for no reason. A warning is right here; a rule is
   * not. */
  keyPrefixes?: string[];
  /* How this server wants a schema, on the OpenAI-compatible adapter.
   *
   * `response_format` is OpenAI's; NVIDIA's NIM does not implement it and
   * documents its own `nvext.guided_json` instead — and recommends it, on the
   * grounds that OpenAI's older `json_object` mode lets a model return any
   * valid JSON at all, including `{}`. Sending the wrong one does not fail
   * loudly: the field is ignored and the answer comes back unconstrained,
   * which is the one outcome this whole feature is built to prevent. The
   * adapter also falls back on its own when a server says it does not know the
   * first form — that is what makes a self-hosted NIM work under
   * "OpenAI-compatible". */
  structured?: 'response_format' | 'guided_json';
}

export const PROVIDERS: ProviderInfo[] = [
  {
    id: 'anthropic', label: 'Anthropic', adapter: 'anthropic',
    blurb: 'Claude. Reads PDFs directly and counts tokens exactly before a run.',
    keyUrl: 'https://platform.claude.com/settings/keys',
    keyPlaceholder: 'sk-ant-…',
    keyPrefixes: ['sk-ant-'],
    defaultModel: 'claude-opus-5',
    baseUrlEditable: false,
    supportsPdf: true,
    envKey: 'ANTHROPIC_API_KEY'
  },
  {
    id: 'openai', label: 'OpenAI', adapter: 'openai',
    blurb: 'Text documents only here — hand a PDF to Anthropic or Gemini, or paste its text.',
    keyUrl: 'https://platform.openai.com/api-keys',
    keyPlaceholder: 'sk-…',
    keyPrefixes: ['sk-'],
    defaultBaseUrl: 'https://api.openai.com/v1',
    baseUrlEditable: false,
    supportsPdf: false,
    envKey: 'OPENAI_API_KEY'
  },
  {
    id: 'gemini', label: 'Google Gemini', adapter: 'gemini',
    blurb: 'Reads PDFs directly and counts tokens exactly.',
    keyUrl: 'https://aistudio.google.com/apikey',
    keyPlaceholder: 'AIza…',
    keyPrefixes: ['AIza'],
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    baseUrlEditable: false,
    supportsPdf: true,
    envKey: 'GEMINI_API_KEY'
  },
  {
    id: 'nvidia', label: 'NVIDIA NIM', adapter: 'openai',
    blurb: 'The hosted NIM endpoint. Text documents only, and the model must support guided JSON — test it before trusting it.',
    keyUrl: 'https://build.nvidia.com',
    keyPlaceholder: 'nvapi-…',
    keyPrefixes: ['nvapi-'],
    defaultBaseUrl: 'https://integrate.api.nvidia.com/v1',
    baseUrlEditable: false,
    supportsPdf: false,
    envKey: 'NVIDIA_API_KEY',
    structured: 'guided_json'
  },
  /* Poolside's models are coding models: text-to-text, no image and no document
   * input on any of the three, so a PDF has to become Markdown first.
   *
   * Two things are deliberately loose here. The base URL is editable because
   * Poolside's own documentation says it differs by access method — their
   * platform, Bedrock, OpenRouter, a self-hosted deployment — and a wrong
   * default you can correct in the field beats a right one that only holds for
   * one of the four. And nothing is claimed about structured output, because
   * their documentation does not mention `response_format`: the adapter sends
   * OpenAI's form and falls back to `guided_json`, and the Test button runs a
   * real schema-constrained completion, which is the only thing that settles it.
   * Verified against docs.poolside.ai on 2026-08-18. */
  {
    id: 'poolside', label: 'Poolside', adapter: 'openai',
    blurb: 'Laguna — coding models, text documents only. Check the base URL against your access method, and press Test: JSON-schema output is not documented, so it is worth proving before a run.',
    keyUrl: 'https://docs.poolside.ai/api/overview',
    keyPlaceholder: 'your Poolside API key',
    defaultBaseUrl: 'https://inference.poolside.ai/v1',
    baseUrlEditable: true,
    /* No suggested model, like OpenAI, Gemini and NIM: their ids churn, and the
     * settings dialog can ask the endpoint what it serves. Poolside documents
     * three Laguna models and says the ids differ by access method, which makes
     * a hard-coded default a guess that would be wrong for three of the four. */
    supportsPdf: false,
    envKey: 'POOLSIDE_API_KEY',
    envBaseUrl: 'POOLSIDE_BASE_URL'
  },
  {
    id: 'compatible', label: 'OpenAI-compatible', adapter: 'openai',
    blurb: 'Anything that speaks /v1/chat/completions — Ollama, LM Studio, vLLM, Groq, Together, OpenRouter. The model must support JSON-schema output.',
    keyUrl: '',
    keyPlaceholder: 'left empty for a local server',
    defaultBaseUrl: 'http://localhost:11434/v1',
    baseUrlEditable: true,
    supportsPdf: false,
    envBaseUrl: 'OPENAI_COMPATIBLE_BASE_URL'
  }
];

/** The provider a key visibly belongs to, when it is not the one selected.
 *
 *  Pasting one vendor's key into another's field produces an authentication
 *  error that names neither vendor — "invalid x-api-key" — and there is
 *  nothing in it to tell you that you are simply in the wrong row. The
 *  prefixes are public and stable enough to say "that looks like an NVIDIA
 *  key"; longest first, so `sk-ant-` is not read as OpenAI's `sk-`. */
export function foreignKeyOwner(provider: ProviderId, key: string): ProviderInfo | null {
  const trimmed = key.trim();
  if (!trimmed) return null;
  const match = [...PROVIDERS]
    .filter(p => p.keyPrefixes?.length)
    .flatMap(p => p.keyPrefixes!.map(prefix => ({ p, prefix })))
    .sort((a, b) => b.prefix.length - a.prefix.length)
    .find(({ prefix }) => trimmed.startsWith(prefix));
  return match && match.p.id !== provider ? match.p : null;
}

export const providerInfo = (id: ProviderId): ProviderInfo =>
  PROVIDERS.find(p => p.id === id) ?? PROVIDERS[0];

/** The base URL a config will actually call. */
export const baseUrlOf = (cfg: AiConfig): string =>
  (cfg.baseUrl || providerInfo(cfg.provider).defaultBaseUrl || '').replace(/\/+$/, '');

/* Roughly four characters to a token for English prose, which is the figure
 * every provider's own documentation uses for a rule of thumb. Only reached
 * when the provider has no counting endpoint, and always reported as an
 * estimate. A PDF is counted on its decoded size, which is wronger still —
 * hence `exact: false` and a UI that says "about". */
export function estimateTokens(input: CompleteInput): number {
  let chars = input.system.length;
  for (const part of input.parts) {
    chars += part.kind === 'text' ? part.text.length : (part.base64.length * 3) / 4;
  }
  return Math.ceil(chars / 4);
}

/** Providers answer errors in their own shapes; this is the one the studio shows. */
export class ProviderError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'ProviderError';
  }
}

/* `fetch` throws for anything below HTTP — a wrong port, a stopped container,
 * a hostname that does not resolve — and the message it throws is the useless
 * "fetch failed", with the real reason one `cause` deep. An operator pointing
 * the studio at their own server hits this far more often than they hit a 401,
 * so it is worth naming what actually happened. */
export async function request(url: string, init: RequestInit, what: string): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (e) {
    const cause = (e as { cause?: { code?: string; message?: string } }).cause;
    const reason = cause?.code === 'ECONNREFUSED' ? 'nothing is listening there'
      : cause?.code === 'ENOTFOUND' ? 'the host does not resolve'
      : cause?.code === 'CERT_HAS_EXPIRED' ? 'its certificate has expired'
      : cause?.message || (e as Error).message;
    throw new ProviderError(`Could not reach ${new URL(url).origin} to ${what}: ${reason}.`);
  }
}

/** Pulls whatever a provider put in the body of a failed response. */
export async function failure(res: Response, fallback: string): Promise<ProviderError> {
  const body = await res.text().catch(() => '');
  let detail = body.slice(0, 500);
  try {
    const parsed = JSON.parse(body);
    detail = parsed?.error?.message || parsed?.message || parsed?.error || detail;
  } catch { /* not JSON — the raw body is the best we have */ }
  return new ProviderError(`${fallback} (HTTP ${res.status})${detail ? `: ${detail}` : ''}`, res.status);
}
