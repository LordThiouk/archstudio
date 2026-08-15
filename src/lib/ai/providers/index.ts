import { anthropicAdapter } from './anthropic';
import { geminiAdapter } from './gemini';
import { openaiAdapter } from './openai';
import { providerInfo, type Adapter, type AdapterId, type AiConfig } from './types';

export * from './types';

const ADAPTERS: Record<AdapterId, Adapter> = {
  anthropic: anthropicAdapter,
  openai: openaiAdapter,
  gemini: geminiAdapter
};

/** The adapter that will serve this config. Five providers, three adapters. */
export const adapterFor = (cfg: AiConfig): Adapter => ADAPTERS[providerInfo(cfg.provider).adapter];
