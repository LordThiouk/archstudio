import { db, now, plain } from './db';
import { PROVIDERS, providerInfo, type AiConfig, type ProviderId } from './ai/providers/types';

/* Operator settings, kept in the database rather than the environment.
 *
 * The trade is explicit and worth stating where the code is, not only in the
 * README: **the API key is stored in `data/studio.db` in clear text.** There is
 * no master secret in a single-user, no-login application to encrypt it
 * against, and a key derived from something on the machine would only look like
 * encryption. So the honest arrangement is: anyone who can read the database
 * file can read the key, backups of that file carry it, and the settings dialog
 * says so before you paste one.
 *
 * Two things follow from that, both enforced here. The key is never returned to
 * the browser — only whether one exists and its last four characters. And a key
 * in the environment still wins when none is stored, so an install that would
 * rather keep secrets out of its data directory can pass one in and never open
 * this dialog. */

const KEY = 'ai';

export interface StoredAi {
  provider: ProviderId;
  model: string;
  baseUrl?: string;
  apiKey?: string;
  /** US dollars per million tokens, if the operator wants a cost estimate. */
  inputPrice?: number;
  outputPrice?: number;
}

/** What the browser is allowed to know. No key, ever. */
export interface PublicAiSettings {
  /** Whether a run could actually be made with what is stored. */
  configured: boolean;
  provider: ProviderId;
  model: string;
  baseUrl: string;
  hasKey: boolean;
  /** "…7f3a" — enough to tell two keys apart, not enough to use one. */
  keyHint: string;
  /** True when the key comes from the environment rather than this dialog. */
  keyFromEnv: boolean;
  inputPrice?: number;
  outputPrice?: number;
}

function readRow(): StoredAi | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(KEY);
  if (!row) return null;
  try {
    return JSON.parse(plain<{ value: string }>(row).value) as StoredAi;
  } catch {
    return null;
  }
}

function writeRow(value: StoredAi): void {
  db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).run(KEY, JSON.stringify(value), now());
}

const envKeyFor = (provider: ProviderId): string => {
  const name = providerInfo(provider).envKey;
  return name ? (process.env[name]?.trim() ?? '') : '';
};

const defaults = (provider: ProviderId): StoredAi => ({
  provider,
  model: providerInfo(provider).defaultModel ?? '',
  baseUrl: providerInfo(provider).defaultBaseUrl
});

/** The config a run will use, or null when there is not enough to run one. */
export function resolveAiConfig(): AiConfig | null {
  const stored = readRow();
  if (!stored?.provider || !stored.model) return null;

  const info = providerInfo(stored.provider);
  const apiKey = stored.apiKey?.trim() || envKeyFor(stored.provider);
  const baseUrl = stored.baseUrl?.trim() || info.defaultBaseUrl || '';

  /* A local OpenAI-compatible server is normally unauthenticated, so an empty
   * key is a valid configuration there and only there. */
  if (!apiKey && stored.provider !== 'compatible') return null;
  if (!baseUrl && info.adapter !== 'anthropic') return null;

  return {
    provider: stored.provider,
    model: stored.model,
    baseUrl,
    apiKey,
    inputPrice: stored.inputPrice,
    outputPrice: stored.outputPrice
  };
}

export function publicAiSettings(): PublicAiSettings {
  const stored = readRow() ?? defaults(PROVIDERS[0].id);
  const info = providerInfo(stored.provider);
  const own = stored.apiKey?.trim() ?? '';
  const env = envKeyFor(stored.provider);
  const key = own || env;

  return {
    configured: resolveAiConfig() !== null,
    provider: stored.provider,
    model: stored.model ?? '',
    baseUrl: stored.baseUrl ?? info.defaultBaseUrl ?? '',
    hasKey: key.length > 0,
    keyHint: key ? `…${key.slice(-4)}` : '',
    keyFromEnv: !own && env.length > 0,
    inputPrice: stored.inputPrice,
    outputPrice: stored.outputPrice
  };
}

/** The config a form is *proposing*, for listing models and testing before it
 *  is saved. The key falls back to the stored one, because the browser never
 *  had it to send back — otherwise pressing Test without retyping the key
 *  would fail for a reason that has nothing to do with what is being tested. */
export function candidateAiConfig(patch: AiSettingsPatch): AiConfig | null {
  const stored = readRow();
  const provider = PROVIDERS.some(p => p.id === patch.provider)
    ? patch.provider! : (stored?.provider ?? PROVIDERS[0].id);
  const info = providerInfo(provider);
  const sameProvider = stored?.provider === provider;

  const apiKey = (typeof patch.apiKey === 'string' && patch.apiKey.trim())
    || (sameProvider ? stored?.apiKey?.trim() ?? '' : '')
    || envKeyFor(provider);
  const baseUrl = patch.baseUrl?.trim()
    || (sameProvider ? stored?.baseUrl?.trim() ?? '' : '')
    || info.defaultBaseUrl || '';

  if (!apiKey && provider !== 'compatible') return null;
  if (!baseUrl && info.adapter !== 'anthropic') return null;

  return {
    provider,
    model: patch.model?.trim() || (sameProvider ? stored?.model ?? '' : info.defaultModel ?? ''),
    baseUrl,
    apiKey,
    inputPrice: stored?.inputPrice,
    outputPrice: stored?.outputPrice
  };
}

export interface AiSettingsPatch {
  provider?: ProviderId;
  model?: string;
  baseUrl?: string;
  /** Absent leaves the stored key alone; null clears it; a string replaces it. */
  apiKey?: string | null;
  inputPrice?: number | null;
  outputPrice?: number | null;
}

export function saveAiSettings(patch: AiSettingsPatch): PublicAiSettings {
  const known = PROVIDERS.some(p => p.id === patch.provider);
  const previous = readRow();
  const provider = known ? patch.provider! : (previous?.provider ?? PROVIDERS[0].id);

  /* Switching provider resets the model and base URL rather than carrying the
   * previous vendor's values across, where they would be silently wrong. */
  const switched = previous?.provider !== undefined && previous.provider !== provider;
  const base = switched ? defaults(provider) : (previous ?? defaults(provider));

  const next: StoredAi = {
    provider,
    model: patch.model?.trim() ?? base.model ?? '',
    baseUrl: patch.baseUrl?.trim() || base.baseUrl || providerInfo(provider).defaultBaseUrl,
    apiKey: patch.apiKey === null ? undefined
      : patch.apiKey !== undefined ? patch.apiKey.trim() || undefined
      : (switched ? undefined : base.apiKey),
    inputPrice: patch.inputPrice === null ? undefined : patch.inputPrice ?? base.inputPrice,
    outputPrice: patch.outputPrice === null ? undefined : patch.outputPrice ?? base.outputPrice
  };

  writeRow(next);

  /* Replacing or forgetting a key rewrites the row, and the old bytes sit in a
   * free page — and in the write-ahead log — until something reuses them. For
   * ordinary data nobody would mind; for a credential, "I removed it" has to
   * be true on disk. `secure_delete` zeroes what is deleted from here on, the
   * checkpoint folds the WAL back into the file, and the vacuum rewrites it so
   * copies written before either of those existed do not survive. Cheap on a
   * file this size, and only on the save that actually changed the key. */
  if ((previous?.apiKey ?? '') !== (next.apiKey ?? '')) {
    db.exec('PRAGMA wal_checkpoint(TRUNCATE); VACUUM;');
  }

  return publicAiSettings();
}
