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
  /** True when the endpoint comes from the environment rather than this dialog. */
  baseUrlFromEnv: boolean;
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

/* The endpoint, from the environment. Same precedence as the key — what is
 * stored wins, the environment fills in behind it, the registry default is the
 * floor — because an operator running an internal inference instance is
 * configuring one thing, not two, and having to type half of it into a dialog
 * on every fresh volume is how a deployment stops being reproducible. */
const envBaseUrlFor = (provider: ProviderId): string => {
  const name = providerInfo(provider).envBaseUrl;
  return name ? (process.env[name]?.trim() ?? '') : '';
};

/* No `baseUrl` here, deliberately. Every resolver reads a stored endpoint as an
 * operator decision that outranks the environment, so seeding the row with the
 * registry default would switch `POOLSIDE_BASE_URL` off for anyone who ever
 * opened the dialog. The default is applied at the *end* of the resolution
 * chain instead, where it belongs, and never written down. */
const defaults = (provider: ProviderId): StoredAi => ({
  provider,
  model: providerInfo(provider).defaultModel ?? ''
});

/** The config a run will use, or null when there is not enough to run one. */
export function resolveAiConfig(): AiConfig | null {
  const stored = readRow();
  if (!stored?.provider || !stored.model) return null;

  const info = providerInfo(stored.provider);
  const apiKey = stored.apiKey?.trim() || envKeyFor(stored.provider);
  const baseUrl = stored.baseUrl?.trim() || envBaseUrlFor(stored.provider)
    || info.defaultBaseUrl || '';

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
  /* Resolved through the same chain `resolveAiConfig` uses, so the URL the
   * dialog shows is the URL a run will call. They disagreed before this: one
   * fell back to the registry default and the other did not. */
  const ownUrl = stored.baseUrl?.trim() ?? '';
  const envUrl = envBaseUrlFor(stored.provider);

  return {
    configured: resolveAiConfig() !== null,
    provider: stored.provider,
    model: stored.model ?? '',
    baseUrl: ownUrl || envUrl || info.defaultBaseUrl || '',
    baseUrlFromEnv: !ownUrl && envUrl.length > 0,
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
    || envBaseUrlFor(provider)
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

  /* Only what the operator actually chose is stored. Baking the registry default
   * into the row would look harmless — the resolved URL is the same — but it
   * makes the stored value non-empty, and every resolver treats a stored value
   * as an operator decision that outranks the environment. `POOLSIDE_BASE_URL`
   * would then be live on a fresh install and dead the moment anyone opened this
   * dialog, which is the worst possible shape for a deployment setting.
   *
   * The same reasoning does not apply to the default *model*: there is no
   * environment layer under it, so storing it costs nothing. */
  const chosenBaseUrl = patch.baseUrl?.trim() || base.baseUrl || undefined;

  const next: StoredAi = {
    provider,
    model: patch.model?.trim() ?? base.model ?? '',
    baseUrl: chosenBaseUrl,
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
