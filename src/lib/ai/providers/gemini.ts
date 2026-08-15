import type { Adapter, AiConfig, CompleteInput, CompleteResult, TokenCount } from './types';
import { ProviderError, baseUrlOf, failure, request } from './types';
import { toGeminiSchema } from './dialects';

/* Google's Generative Language API.
 *
 * Reads PDFs as inline data, and — like Anthropic and unlike the
 * OpenAI-compatible surface — will count the tokens of a request before it is
 * run, so the estimate shown to the reader is the real number.
 *
 * The key travels as a header rather than the `?key=` query parameter the
 * quickstarts use: a URL ends up in proxy logs and error messages, and this
 * one would be carrying a credential. */

const headers = (cfg: AiConfig): Record<string, string> => ({
  'Content-Type': 'application/json',
  'x-goog-api-key': cfg.apiKey
});

const parts = (input: CompleteInput) =>
  input.parts.map(p => p.kind === 'text'
    ? { text: p.text }
    : { inlineData: { mimeType: 'application/pdf', data: p.base64 } });

const payload = (cfg: AiConfig, input: CompleteInput) => ({
  systemInstruction: { parts: [{ text: input.system }] },
  contents: [{ role: 'user', parts: parts(input) }],
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: toGeminiSchema(input.schema),
    maxOutputTokens: input.maxTokens
  }
});

export const geminiAdapter: Adapter = {
  async listModels(cfg) {
    const res = await request(`${baseUrlOf(cfg)}/models?pageSize=200`, { headers: headers(cfg) }, 'list the models');
    if (!res.ok) throw await failure(res, 'Could not list the models');
    const json = await res.json() as {
      models?: { name?: string; supportedGenerationMethods?: string[] }[];
    };
    return (json.models ?? [])
      /* Only the ones that can answer a prompt: the list also carries
       * embedding and token-counting models, which would fail confusingly if
       * one were picked. Some responses omit the field — keep those rather
       * than hide a model that would have worked. */
      .filter(m => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes('generateContent'))
      .map(m => String(m.name ?? '').replace(/^models\//, ''))
      .filter(Boolean)
      .sort();
  },

  async countTokens(cfg, input): Promise<TokenCount> {
    const res = await request(`${baseUrlOf(cfg)}/models/${encodeURIComponent(cfg.model)}:countTokens`, {
      method: 'POST',
      headers: headers(cfg),
      body: JSON.stringify({ contents: payload(cfg, input).contents })
    }, 'measure the document');
    if (!res.ok) throw await failure(res, 'Could not measure the document');
    const json = await res.json() as { totalTokens?: number };
    return { tokens: json.totalTokens ?? 0, exact: true };
  },

  async complete(cfg, input): Promise<CompleteResult> {
    const res = await request(`${baseUrlOf(cfg)}/models/${encodeURIComponent(cfg.model)}:generateContent`, {
      method: 'POST', headers: headers(cfg), body: JSON.stringify(payload(cfg, input))
    }, 'run the analysis');
    if (!res.ok) throw await failure(res, 'The analysis was refused');

    const json = await res.json() as {
      candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
      promptFeedback?: { blockReason?: string };
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };

    if (json.promptFeedback?.blockReason) {
      throw new ProviderError(`The provider blocked this document (${json.promptFeedback.blockReason}).`);
    }

    const candidate = json.candidates?.[0];
    if (candidate?.finishReason === 'MAX_TOKENS') {
      throw new ProviderError(
        'The answer was cut off before it was complete — the document describes more than one run can return.'
      );
    }
    if (candidate?.finishReason && !['STOP', 'MAX_TOKENS'].includes(candidate.finishReason)) {
      throw new ProviderError(`The provider stopped early (${candidate.finishReason}).`);
    }

    const text = (candidate?.content?.parts ?? []).map(p => p.text ?? '').join('');
    if (!text) throw new ProviderError('The provider returned an empty answer.');

    return {
      json: JSON.parse(text),
      inputTokens: json.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: json.usageMetadata?.candidatesTokenCount ?? 0
    };
  }
};
