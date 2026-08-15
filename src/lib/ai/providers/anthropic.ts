import Anthropic from '@anthropic-ai/sdk';
import type { Adapter, AiConfig, CompleteInput, CompleteResult, Part, TokenCount } from './types';
import { ProviderError } from './types';

/* Claude, through the official SDK.
 *
 * The one adapter that does not hand-roll HTTP: the SDK is already a
 * dependency, and it brings retries, streaming and the exact token counter
 * with it. The other two adapters call REST directly — see openai.ts for why
 * that is the right trade there and not here. */

const client = (cfg: AiConfig) => new Anthropic({ apiKey: cfg.apiKey });

/* The SDK's `message` is the whole response body — `401 {"type":"error",…}` —
 * which is the right thing in a log and the wrong thing under a form field.
 * The sentence the API actually wrote is one level in. */
async function unwrap<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (e) {
    if (e instanceof ProviderError) throw e;
    const err = e as { status?: number; error?: { error?: { message?: string } }; message?: string };
    throw new ProviderError(
      err.error?.error?.message || err.message || 'The provider could not be reached.',
      err.status
    );
  }
}

const toContent = (parts: Part[]): Anthropic.ContentBlockParam[] =>
  parts.map(p => p.kind === 'text'
    ? { type: 'text', text: p.text }
    : {
        type: 'document',
        title: p.filename,
        source: { type: 'base64', media_type: 'application/pdf', data: p.base64 }
      });

const params = (cfg: AiConfig, input: CompleteInput) => ({
  model: cfg.model,
  max_tokens: input.maxTokens,
  system: input.system,
  output_config: {
    effort: 'high' as const,
    format: { type: 'json_schema' as const, schema: input.schema }
  },
  messages: [{ role: 'user' as const, content: toContent(input.parts) }]
});

export const anthropicAdapter: Adapter = {
  async listModels(cfg) {
    return unwrap(async () => {
      const out: string[] = [];
      for await (const m of client(cfg).models.list()) out.push(m.id);
      return out;
    });
  },

  async countTokens(cfg, input): Promise<TokenCount> {
    const { model, system, messages } = params(cfg, input);
    const counted = await unwrap(() => client(cfg).messages.countTokens({ model, system, messages }));
    return { tokens: counted.input_tokens, exact: true };
  },

  async complete(cfg, input): Promise<CompleteResult> {
    /* Streamed because the answer is large: a non-streaming request at this
     * max_tokens risks the SDK's HTTP timeout, and the run takes minutes. */
    const message = await unwrap(() => client(cfg).messages.stream(params(cfg, input)).finalMessage());

    if (message.stop_reason === 'refusal') {
      throw new ProviderError(
        'The model declined to analyse this document'
        + (message.stop_details?.explanation ? `: ${message.stop_details.explanation}` : '.')
      );
    }
    if (message.stop_reason === 'max_tokens') {
      throw new ProviderError(
        'The answer was cut off before it was complete — the document describes more than one run can return.'
      );
    }

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('');

    return {
      json: JSON.parse(text),
      inputTokens: message.usage.input_tokens + (message.usage.cache_read_input_tokens ?? 0),
      outputTokens: message.usage.output_tokens
    };
  }
};
