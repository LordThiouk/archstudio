import type { Adapter, AiConfig, CompleteInput, CompleteResult, TokenCount } from './types';
import { ProviderError, baseUrlOf, estimateTokens, failure, providerInfo, request } from './types';

/* Everything that speaks `/v1/chat/completions`.
 *
 * OpenAI, NVIDIA's hosted NIM endpoint, Ollama, LM Studio, vLLM, Groq,
 * Together, OpenRouter — one wire format, one adapter. Written against REST
 * with `fetch` rather than a vendor SDK, and deliberately: the whole point of
 * this adapter is to work against a base URL nobody has seen yet, which is
 * exactly what an SDK pinned to one vendor's assumptions is worst at. (Claude
 * keeps its SDK — see anthropic.ts.)
 *
 * Structured output has two spellings here. OpenAI's is `response_format:
 * json_schema` with `strict: true`; NVIDIA's NIM does not implement it and
 * documents `nvext.guided_json` instead. The registry says which to send, and
 * `complete` falls back from the first to the second when a server says it
 * does not know it — which is what lets a self-hosted NIM work under
 * "OpenAI-compatible". A server that supports neither says so in the error,
 * which the settings dialog's Test button surfaces before a document is ever
 * uploaded. */

const headers = (cfg: AiConfig): Record<string, string> => ({
  'Content-Type': 'application/json',
  /* A local server usually wants no key at all; sending an empty bearer makes
   * some of them reject a request they would otherwise have served. */
  ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {})
});

function textOf(input: CompleteInput): string {
  const pdf = input.parts.find(p => p.kind === 'pdf');
  if (pdf) {
    throw new ProviderError(
      'This provider is set up for text documents. Send the PDF to Anthropic or Gemini, '
      + 'or convert it to Markdown or plain text first.'
    );
  }
  return input.parts.map(p => (p.kind === 'text' ? p.text : '')).join('\n\n');
}

type Structured = 'response_format' | 'guided_json';

function body(cfg: AiConfig, input: CompleteInput, tokenField: string, structured: Structured) {
  return {
    model: cfg.model,
    messages: [
      { role: 'system', content: input.system },
      { role: 'user', content: textOf(input) }
    ],
    [tokenField]: input.maxTokens,
    ...(structured === 'response_format'
      ? {
          response_format: {
            type: 'json_schema',
            json_schema: { name: 'architecture_analysis', strict: true, schema: input.schema }
          }
        }
      /* NVIDIA's own extension, and the only structured-output mechanism NIM
       * implements. Sent alone: a server that understands one of these does
       * not necessarily ignore the other quietly. */
      : { nvext: { guided_json: input.schema } })
  };
}

export const openaiAdapter: Adapter = {
  async listModels(cfg) {
    const res = await request(`${baseUrlOf(cfg)}/models`, { headers: headers(cfg) }, 'list the models');
    if (!res.ok) throw await failure(res, 'Could not list the models');
    const json = await res.json() as { data?: { id?: string }[] };
    return (json.data ?? []).map(m => String(m.id)).filter(Boolean).sort();
  },

  async countTokens(cfg, input): Promise<TokenCount> {
    /* No counting endpoint in this API. The estimate is character-based and
     * says so wherever it is shown. */
    return { tokens: estimateTokens(input), exact: false };
  },

  async complete(cfg, input): Promise<CompleteResult> {
    /* "OpenAI-compatible" is a family, not a specification, and two fields in
     * this request are spelled differently across it. Rather than ask the
     * operator which dialect their server speaks, send the common form and
     * adapt to what the server says it wants — each correction fires at most
     * once, and only on the error that names the field. */
    let tokenField = 'max_tokens';
    let structured: Structured = providerInfo(cfg.provider).structured ?? 'response_format';
    let res: Response;

    for (let attempt = 0; ; attempt++) {
      res = await request(`${baseUrlOf(cfg)}/chat/completions`, {
        method: 'POST', headers: headers(cfg),
        body: JSON.stringify(body(cfg, input, tokenField, structured))
      }, 'run the analysis');

      if (res.ok || res.status !== 400 || attempt >= 2) break;

      const said = await res.clone().text().catch(() => '');
      /* Renamed on OpenAI's newer models, kept as-is by most others. */
      if (tokenField === 'max_tokens' && said.includes('max_completion_tokens')) {
        tokenField = 'max_completion_tokens';
        continue;
      }
      /* A NIM container behind a custom endpoint, or an older vLLM: it wants
       * guided_json and has just said it does not know response_format. */
      if (structured === 'response_format' && /response_format|json_schema/i.test(said)) {
        structured = 'guided_json';
        continue;
      }
      break;
    }

    if (!res.ok) throw await failure(res, 'The analysis was refused');

    const json = await res.json() as {
      choices?: { message?: { content?: string }; finish_reason?: string }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const choice = json.choices?.[0];

    if (choice?.finish_reason === 'length') {
      throw new ProviderError(
        'The answer was cut off before it was complete — the document describes more than one run can return.'
      );
    }
    if (choice?.finish_reason === 'content_filter') {
      throw new ProviderError('The provider’s content filter stopped this analysis.');
    }
    if (!choice?.message?.content) {
      throw new ProviderError('The provider returned an empty answer.');
    }

    return {
      json: JSON.parse(choice.message.content),
      inputTokens: json.usage?.prompt_tokens ?? 0,
      outputTokens: json.usage?.completion_tokens ?? 0
    };
  }
};
