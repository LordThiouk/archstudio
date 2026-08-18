'use client';

import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { aiStatusChanged } from './Analyse';
import { api } from '@/lib/api';

/* Where the operator chooses who reads their documents.
 *
 * Five providers, one form. The two buttons that matter are **Load models**
 * and **Test**: between them they answer "will this work?" before a document
 * is ever uploaded — the first proves the key and the endpoint, the second
 * proves the model will actually honour a JSON schema, which is the thing the
 * whole analysis rests on and the thing that varies most between models.
 *
 * The key is written to the database and never read back out to this page. */

interface ProviderInfo {
  id: string; label: string; blurb: string;
  keyUrl: string; keyPlaceholder: string; keyPrefixes?: string[];
  defaultBaseUrl?: string; baseUrlEditable: boolean;
  defaultModel?: string; supportsPdf: boolean; envKey?: string; envBaseUrl?: string;
}

interface PublicSettings {
  configured: boolean; provider: string; model: string; baseUrl: string;
  baseUrlFromEnv: boolean;
  hasKey: boolean; keyHint: string; keyFromEnv: boolean;
  inputPrice?: number; outputPrice?: number;
}

interface TestResult { ok: true; model: string; ms: number; inputTokens: number; outputTokens: number }

export function SettingsDialog({ onClose, reason }: {
  onClose: () => void;
  /** Why the dialog was opened, when it was opened *for* the reader rather
   *  than *by* them — arriving here from a button that could not do its job. */
  reason?: string;
}) {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [saved, setSaved] = useState<PublicSettings | null>(null);

  const [provider, setProvider] = useState('anthropic');
  const [model, setModel] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [inputPrice, setInputPrice] = useState('');
  const [outputPrice, setOutputPrice] = useState('');

  const [models, setModels] = useState<string[] | null>(null);
  const [test, setTest] = useState<TestResult | null>(null);
  const [busy, setBusy] = useState<'' | 'loading' | 'models' | 'testing' | 'saving'>('loading');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const info = providers.find(p => p.id === provider);

  /* Noticed as it is typed rather than after a round trip: one vendor's key in
   * another's field comes back as "invalid x-api-key", which names neither the
   * key nor the service and sends you off checking a key that is perfectly
   * good. Longest prefix first, so `sk-ant-` is not read as OpenAI's `sk-`. */
  const foreign = apiKey.trim()
    ? providers
        .filter(p => p.keyPrefixes?.length && p.id !== provider)
        .flatMap(p => p.keyPrefixes!.map(prefix => ({ p, prefix })))
        .sort((a, b) => b.prefix.length - a.prefix.length)
        .find(({ prefix }) => apiKey.trim().startsWith(prefix))?.p
    : undefined;

  useEffect(() => {
    api.json<{ settings: PublicSettings; providers: ProviderInfo[] }>('/api/settings/ai')
      .then(r => {
        setProviders(r.providers);
        setSaved(r.settings);
        setProvider(r.settings.provider);
        setModel(r.settings.model);
        setBaseUrl(r.settings.baseUrl);
        setInputPrice(r.settings.inputPrice?.toString() ?? '');
        setOutputPrice(r.settings.outputPrice?.toString() ?? '');
      })
      .catch(e => setError((e as Error).message))
      .finally(() => setBusy(''));
  }, []);

  /* Changing provider clears what belonged to the previous one rather than
   * carrying a model name or a base URL across, where it would be silently
   * wrong. The server does the same on save. */
  function pickProvider(next: ProviderInfo) {
    setProvider(next.id);
    setModel(next.defaultModel ?? '');
    setBaseUrl(next.defaultBaseUrl ?? '');
    setApiKey('');
    setModels(null);
    setTest(null);
    setError(''); setNote('');
  }

  const form = () => ({ provider, model, baseUrl, apiKey: apiKey || undefined });

  async function probe(action: 'models' | 'test') {
    setBusy(action === 'models' ? 'models' : 'testing');
    setError(''); setNote(''); if (action === 'test') setTest(null);
    try {
      if (action === 'models') {
        const r = await api.json<{ models: string[] }>('/api/settings/ai/probe', {
          method: 'POST', body: JSON.stringify({ ...form(), action: 'models' })
        });
        setModels(r.models);
        setNote(r.models.length ? `${r.models.length} models available.` : 'The provider returned no models.');
      } else {
        setTest(await api.json<TestResult>('/api/settings/ai/probe', {
          method: 'POST', body: JSON.stringify({ ...form(), action: 'test' })
        }));
      }
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(''); }
  }

  async function save(clearKey = false) {
    setBusy('saving'); setError(''); setNote('');
    try {
      const r = await api.json<{ settings: PublicSettings }>('/api/settings/ai', {
        method: 'PUT',
        body: JSON.stringify({
          provider, model, baseUrl,
          apiKey: apiKey || undefined,
          clearKey,
          inputPrice: inputPrice === '' ? null : Number(inputPrice),
          outputPrice: outputPrice === '' ? null : Number(outputPrice)
        })
      });
      setSaved(r.settings);
      setApiKey('');
      /* The buttons in the workspace and the editor are governed by this. */
      aiStatusChanged();
      setNote(clearKey ? 'Key forgotten.' : r.settings.configured
        ? 'Saved. Document analysis is on.'
        : 'Saved — still missing something before a run can be made.');
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(''); }
  }

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxHeight: '88vh', overflowY: 'auto' }}>
        <h2>Model provider</h2>
        <p className="lede">
          Which model reads your documents, for <b>Read a document</b> and <b>Enrich</b>. Nothing
          else in the studio uses it.
        </p>
        {reason && (
          <div className="warn" style={{ marginTop: 0, marginBottom: 14 }}>
            <Icon name="ai" size={15} /><span>{reason}</span>
          </div>
        )}

        {busy === 'loading' ? <div className="empty" style={{ padding: 24 }}>Loading…</div> : (
          <>
            <div className="field"><span>Provider</span>
              <div className="radio-row" style={{ flexWrap: 'wrap' }}>
                {providers.map(p => (
                  <button key={p.id} className={`radio${provider === p.id ? ' on' : ''}`}
                    aria-pressed={provider === p.id} onClick={() => pickProvider(p)}>
                    <i /> {p.label}
                  </button>
                ))}
              </div>
              {info && <div className="hint">{info.blurb}</div>}
            </div>

            {info?.baseUrlEditable && (
              <label className="field"><span>Endpoint</span>
                {/* The provider's own default, not a hard-coded Ollama address:
                    two providers use this field now, and suggesting the wrong
                    vendor's URL is worse than suggesting none. */}
                <input className="input" value={baseUrl} onChange={e => setBaseUrl(e.target.value)}
                  placeholder={info.defaultBaseUrl} spellCheck={false} />
                <div className="hint">
                  The base URL, ending in <code>/v1</code>. Must be reachable from the server,
                  not from your browser.
                  {info.envBaseUrl && (
                    <>
                      {' '}An internal instance can be set once with{' '}
                      <code>{info.envBaseUrl}</code> in the environment instead
                      {saved?.baseUrlFromEnv ? ', which is where this one comes from.' : '.'}
                    </>
                  )}
                </div>
              </label>
            )}

            <label className="field"><span>API key</span>
              <input className="input" type="password" value={apiKey} spellCheck={false}
                autoComplete="off"
                onChange={e => setApiKey(e.target.value)}
                placeholder={saved?.hasKey ? `stored ${saved.keyHint} — type a new one to replace it` : info?.keyPlaceholder} />
              {foreign && (
                <div className="warn" style={{ marginTop: 8 }}>
                  <Icon name="alert" size={15} />
                  <span>
                    That key belongs to <b>{foreign.label}</b>, not {info?.label ?? 'this provider'}.
                    {' '}Pick <b>{foreign.label}</b> above, or paste a key that belongs here.
                  </span>
                </div>
              )}
              <div className="hint">
                {saved?.keyFromEnv
                  ? <>Currently reading <code>{info?.envKey}</code> from the environment. A key typed here takes over.</>
                  : saved?.hasKey
                    ? <>A key is stored. <button className="linkbtn" onClick={() => save(true)} disabled={busy !== ''}>Forget it</button></>
                    : info?.keyUrl
                      ? <>Get one at <a href={info.keyUrl} target="_blank" rel="noreferrer">{new URL(info.keyUrl).host}</a>.</>
                      : 'Leave empty for a local server that does not authenticate.'}
              </div>
            </label>

            <div className="field"><span>Model</span>
              <div className="frow">
                {models
                  ? (
                    <select className="input" value={model} onChange={e => setModel(e.target.value)}>
                      <option value="">Choose a model…</option>
                      {models.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  )
                  : (
                    <input className="input" value={model} spellCheck={false}
                      onChange={e => setModel(e.target.value)}
                      placeholder={info?.defaultModel || 'model id'} />
                  )}
                <button className="btn" onClick={() => probe('models')} disabled={busy !== ''}>
                  {busy === 'models' ? 'Loading…' : 'Load models'}
                </button>
              </div>
              <div className="hint">
                It has to support JSON-schema output — most current models do, small local ones
                often do not. Test below before trusting it with a document.
              </div>
            </div>

            <div className="field"><span>Price, per million tokens (optional)</span>
              <div className="frow">
                <input className="input" inputMode="decimal" value={inputPrice}
                  onChange={e => setInputPrice(e.target.value)} placeholder="input, e.g. 5" />
                <input className="input" inputMode="decimal" value={outputPrice}
                  onChange={e => setOutputPrice(e.target.value)} placeholder="output, e.g. 25" />
              </div>
              <div className="hint">
                Only used to show what a run will cost before you start it. Left empty, the dialog
                shows a token count and no price — no rate is invented for you.
              </div>
            </div>

            <div className="frow" style={{ marginTop: 4 }}>
              <button className="btn" onClick={() => probe('test')} disabled={busy !== ''}>
                <Icon name="bolt" size={15} />{busy === 'testing' ? 'Testing…' : 'Test'}
              </button>
              {test && (
                <span className="ok-line">
                  <Icon name="eye" size={14} />
                  {test.model} answered under the schema in {(test.ms / 1000).toFixed(1)}s.
                </span>
              )}
            </div>

            <div className="warn" style={{ marginTop: 16 }}>
              <Icon name="lock" size={15} />
              <span>
                The key is stored <b>in clear text</b> in <code>data/studio.db</code>. There is no
                login here to encrypt it against, so anyone who can read that file — or a backup of
                it — can read the key. To keep it out of the data directory, set{' '}
                <code>{info?.envKey ?? 'the provider’s key variable'}</code> in the environment
                instead and leave this field empty.
              </span>
            </div>

            {error && <div className="err">{error}</div>}
            {note && !error && <div className="hint" style={{ marginTop: 10 }}>{note}</div>}
          </>
        )}

        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose}>Close</button>
          <button className="btn primary" onClick={() => save()} disabled={busy !== ''}>
            {busy === 'saving' ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
