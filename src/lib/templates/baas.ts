import type { BrickId } from '../lego/bricks';

/** Provider rows are deliberately separate from hyperscaler `SERVICES`. */
export interface BaasService { id: 'firebase-auth' | 'supabase-auth' | 'openai'; name: string; role: BrickId }

export const BAAS_SERVICES: readonly BaasService[] = [
  { id: 'firebase-auth', name: 'Firebase Auth', role: 'identity' },
  { id: 'supabase-auth', name: 'Supabase Auth', role: 'identity' },
  { id: 'openai', name: 'OpenAI API', role: 'llm' }
];
