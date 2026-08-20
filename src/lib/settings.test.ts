import { strict as assert } from 'node:assert';
import { after, before, test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/* Settings are the one place a credential is handled, so these tests are about
 * two properties and nothing else: **the key never comes back out**, and the
 * three states of the key field — untouched, replaced, forgotten — are told
 * apart. Everything else about this module is a JSON blob in a row.
 *
 * `node --test` gives each file its own process, so pointing DATABASE_PATH at
 * a scratch file here cannot affect another test or the developer's own data.
 * The import is deferred because db.ts reads that variable when it loads. */

const dbFile = path.join(os.tmpdir(), `archstudio-settings-${process.pid}.db`);
process.env.DATABASE_PATH = dbFile;

let S: typeof import('./settings');

before(async () => { S = await import('./settings'); });
after(() => {
  for (const f of [dbFile, `${dbFile}-wal`, `${dbFile}-shm`]) fs.rmSync(f, { force: true });
});

test('nothing is configured until a provider, a model and a key exist', () => {
  assert.equal(S.resolveAiConfig(), null);

  S.saveAiSettings({ provider: 'anthropic', model: 'claude-opus-5' });
  assert.equal(S.resolveAiConfig(), null, 'a model without a key cannot run');

  S.saveAiSettings({ apiKey: 'sk-ant-secret-value-7f3a' });
  assert.equal(S.resolveAiConfig()?.model, 'claude-opus-5');
});

test('the key never leaves the server — only its last four characters', () => {
  const shown = S.publicAiSettings();
  assert.equal(shown.hasKey, true);
  assert.equal(shown.keyHint, '…7f3a');
  assert.equal(JSON.stringify(shown).includes('sk-ant-secret'), false);
});

test('an absent key field leaves the stored key alone', () => {
  /* The browser never receives the key, so it cannot send one back: an absent
   * field has to mean "keep it". A save that changed the model must not
   * silently log the operator out of their provider. */
  S.saveAiSettings({ model: 'claude-opus-4-8' });
  assert.equal(S.resolveAiConfig()?.apiKey, 'sk-ant-secret-value-7f3a');
  assert.equal(S.resolveAiConfig()?.model, 'claude-opus-4-8');
});

test('null forgets the key, and only the key', () => {
  S.saveAiSettings({ apiKey: null });
  assert.equal(S.publicAiSettings().hasKey, false);
  assert.equal(S.publicAiSettings().model, 'claude-opus-4-8');
  assert.equal(S.resolveAiConfig(), null);
});

test('a key in the environment is used when none is stored, and says so', () => {
  process.env.ANTHROPIC_API_KEY = 'sk-ant-from-the-environment-1234';
  try {
    const shown = S.publicAiSettings();
    assert.equal(shown.hasKey, true);
    assert.equal(shown.keyFromEnv, true);
    assert.equal(shown.keyHint, '…1234');
    assert.equal(S.resolveAiConfig()?.apiKey, 'sk-ant-from-the-environment-1234');

    /* A key typed into the dialog takes over from the environment. */
    S.saveAiSettings({ apiKey: 'sk-ant-typed-in-here-abcd' });
    assert.equal(S.publicAiSettings().keyFromEnv, false);
    assert.equal(S.resolveAiConfig()?.apiKey, 'sk-ant-typed-in-here-abcd');
  } finally {
    delete process.env.ANTHROPIC_API_KEY;
  }
});

test('switching provider does not carry the previous one’s model or key across', () => {
  S.saveAiSettings({ provider: 'gemini' });
  const shown = S.publicAiSettings();
  assert.equal(shown.provider, 'gemini');
  assert.equal(shown.model, '', 'a Claude model id would be nonsense here');
  assert.equal(shown.hasKey, false, 'and an Anthropic key would not authenticate');
  assert.match(shown.baseUrl, /generativelanguage/);
});

test('a local OpenAI-compatible server is usable with no key at all', () => {
  S.saveAiSettings({ provider: 'compatible', model: 'llama3.1', baseUrl: 'http://localhost:11434/v1' });
  const cfg = S.resolveAiConfig();
  assert.equal(cfg?.apiKey, '');
  assert.equal(cfg?.baseUrl, 'http://localhost:11434/v1');
});

test('a candidate config falls back to the stored key so Test works without retyping it', () => {
  S.saveAiSettings({ provider: 'openai', model: 'gpt-x', apiKey: 'sk-openai-stored-9999' });
  const candidate = S.candidateAiConfig({ provider: 'openai', model: 'gpt-y' });
  assert.equal(candidate?.apiKey, 'sk-openai-stored-9999');
  assert.equal(candidate?.model, 'gpt-y', 'the form’s model wins over the stored one');
  /* …but not across providers: that key would not authenticate there. */
  assert.equal(S.candidateAiConfig({ provider: 'gemini', model: 'gemini-x' }), null);
});

test('prices are optional and clearable', () => {
  S.saveAiSettings({ inputPrice: 5, outputPrice: 25 });
  assert.equal(S.resolveAiConfig()?.inputPrice, 5);
  S.saveAiSettings({ inputPrice: null, outputPrice: null });
  assert.equal(S.resolveAiConfig()?.inputPrice, undefined);
});

/* ------------------------------------------------- an endpoint from the env
 *
 * The key could always come from the environment; the endpoint could not, which
 * left an enterprise running its own inference instance automating half a
 * configuration and typing the other half into a dialog on every fresh volume.
 * Only the two providers whose endpoint the dialog actually offers take one. */

test('an internal endpoint arrives from the environment with no dialog visit', () => {
  process.env.POOLSIDE_BASE_URL = 'https://poolside.acme.internal/v1';
  process.env.POOLSIDE_API_KEY = 'ps-from-env-1234';
  S.saveAiSettings({ provider: 'poolside', model: 'poolside/laguna-s-2.1' });

  const cfg = S.resolveAiConfig();
  assert.equal(cfg?.baseUrl, 'https://poolside.acme.internal/v1');
  assert.equal(cfg?.apiKey, 'ps-from-env-1234');

  /* And the dialog says where it came from, rather than showing it as if
   * someone had typed it. */
  const shown = S.publicAiSettings();
  assert.equal(shown.baseUrl, 'https://poolside.acme.internal/v1');
  assert.equal(shown.baseUrlFromEnv, true);
  assert.equal(shown.configured, true);
});

test('a typed endpoint beats the environment, and the dialog stops claiming otherwise', () => {
  process.env.POOLSIDE_BASE_URL = 'https://poolside.acme.internal/v1';
  S.saveAiSettings({
    provider: 'poolside', model: 'm', apiKey: 'ps-typed', baseUrl: 'https://typed.example/v1'
  });
  assert.equal(S.resolveAiConfig()?.baseUrl, 'https://typed.example/v1');
  assert.equal(S.publicAiSettings().baseUrlFromEnv, false);
});

test('the environment cannot redirect a provider whose endpoint is presented as fixed', () => {
  /* Gemini declares no `envBaseUrl`, so a variable named after it is inert —
   * a config that silently called somewhere else, with no field on screen to
   * reveal it, is the failure this asymmetry exists to prevent. */
  process.env.GEMINI_BASE_URL = 'https://not-google.example/v1';
  S.saveAiSettings({ provider: 'gemini', model: 'gemini-x', apiKey: 'AIza-test' });
  assert.match(String(S.resolveAiConfig()?.baseUrl), /generativelanguage\.googleapis\.com/);
  assert.equal(S.publicAiSettings().baseUrlFromEnv, false);
  delete process.env.GEMINI_BASE_URL;
});

test('the endpoint the dialog shows is the endpoint a run will call', () => {
  /* These two resolved the field through different chains before: one fell back
   * to the registry default and the other did not, so the dialog could show a
   * blank endpoint for a configuration that ran perfectly well. */
  delete process.env.POOLSIDE_BASE_URL;
  S.saveAiSettings({ provider: 'poolside', model: 'm', apiKey: 'ps-typed', baseUrl: '' });
  assert.equal(S.publicAiSettings().baseUrl, S.resolveAiConfig()!.baseUrl);
});
