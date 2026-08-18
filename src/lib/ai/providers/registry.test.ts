import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { PROVIDERS, baseUrlOf, foreignKeyOwner, providerInfo, type AiConfig } from './types';

/* The registry is the only place a provider is declared: `settings.ts` validates
 * against it, the settings dialog renders one row per entry, and `adapterFor`
 * routes on it. So a wrong field here is a wrong field in three places, and most
 * of the wrongness only shows up on the one document that happens to exercise
 * it. These are the invariants worth catching at the table instead. */

const cfg = (over: Partial<AiConfig>): AiConfig =>
  ({ provider: 'anthropic', model: 'm', apiKey: 'k', ...over });

test('ids are unique and labels are distinct', () => {
  assert.equal(new Set(PROVIDERS.map(p => p.id)).size, PROVIDERS.length);
  assert.equal(new Set(PROVIDERS.map(p => p.label)).size, PROVIDERS.length);
});

test('only an adapter that can carry a PDF is allowed to claim one', () => {
  /* This is the invariant with teeth. The OpenAI-compatible adapter *throws* on
   * a PDF part — deliberately, with an error telling you to use Anthropic or
   * Gemini — so a provider on that adapter claiming `supportsPdf` would widen
   * the file picker to `.pdf` and then fail at analysis time, after the upload.
   * Poolside is the newest entry on that adapter and its models are text-only,
   * which is exactly the mistake this catches. */
  PROVIDERS.filter(p => p.supportsPdf).forEach(p => {
    assert.notEqual(p.adapter, 'openai',
      `${p.label} claims PDF support on the adapter that refuses PDFs`);
  });
});

test('every provider on a URL-based adapter resolves to a base URL', () => {
  /* `settings.ts` returns null — "not configured" — when a non-Anthropic config
   * has no base URL, so an entry with neither a default nor an editable field
   * would be silently impossible to turn on. */
  PROVIDERS.filter(p => p.adapter !== 'anthropic').forEach(p => {
    assert.ok(p.defaultBaseUrl || p.baseUrlEditable,
      `${p.label} has no default base URL and no field to type one in`);
  });
});

test('an editable base URL is still prefilled, so the field is never blank', () => {
  PROVIDERS.filter(p => p.baseUrlEditable).forEach(p => {
    assert.ok(p.defaultBaseUrl, `${p.label} offers the field but suggests nothing`);
  });
});

test('base URLs are absolute and carry no trailing slash once resolved', () => {
  /* The adapters concatenate `/chat/completions` and `/models` onto this, so a
   * trailing slash produces a double one and a 404 that names nothing. */
  PROVIDERS.filter(p => p.defaultBaseUrl).forEach(p => {
    const url = baseUrlOf(cfg({ provider: p.id }));
    assert.doesNotThrow(() => new URL(url), `${p.label}: ${url} is not a URL`);
    assert.ok(!url.endsWith('/'), `${p.label}: ${url} ends in a slash`);
  });
});

test('every provider a key is required for says where to get one', () => {
  /* `compatible` is the exception on both counts: it is the local-server row,
   * and `settings.ts` lets it run with no key at all. */
  PROVIDERS.filter(p => p.id !== 'compatible').forEach(p => {
    assert.ok(p.keyUrl, `${p.label} asks for a key and does not say where from`);
    assert.ok(p.keyPlaceholder, `${p.label} has an unlabelled key field`);
    assert.ok(p.envKey, `${p.label} cannot be configured from the environment`);
  });
});

test('a suggested model is optional, but never an empty string', () => {
  /* Most providers suggest nothing on purpose — model ids churn, and the dialog
   * can ask the endpoint what it serves. What must not happen is a present-but-
   * blank default: `settings.ts` writes `defaultModel ?? ''` into the stored
   * config, and "" would read as configured-with-no-model. */
  PROVIDERS.forEach(p => {
    assert.notEqual(p.defaultModel, '', `${p.label} suggests the empty model`);
  });
  assert.equal(providerInfo('anthropic').defaultModel, 'claude-opus-5');
});

test('environment variable names are unique, so two providers cannot share a key', () => {
  const keys = PROVIDERS.map(p => p.envKey).filter(Boolean);
  assert.equal(new Set(keys).size, keys.length);
});

/* `envKey` is read by `settings.ts` and works the moment it is declared here.
 * What does *not* follow the registry is the two hand-written lists an operator
 * actually reads — so adding a provider and forgetting them ships a variable
 * that works and that nobody knows exists. Both are checked here rather than
 * remembered, and the failure names the file. */
const repoFile = (name: string) =>
  readFileSync(join(import.meta.dirname, '..', '..', '..', '..', name), 'utf8');

/** Every environment variable the registry declares, key and endpoint alike. */
const envVars = () =>
  PROVIDERS.flatMap(p => [p.envKey, p.envBaseUrl].filter(Boolean).map(name => ({ name, p })));

test('.env.example lists every provider variable', () => {
  const text = repoFile('.env.example');
  envVars().forEach(({ name, p }) => {
    assert.ok(text.includes(name!), `.env.example never mentions ${name} (${p.label})`);
  });
});

test('docker-compose passes every provider variable through', () => {
  /* A container operator sets it in `.env` and it reaches the app only if the
   * service declares it — a missing line here is silence, not an error. */
  const text = repoFile('docker-compose.yml');
  envVars().forEach(({ name, p }) => {
    assert.ok(text.includes(`${name}=\${${name}:-}`),
      `docker-compose.yml does not forward ${name} (${p.label})`);
  });
});

test('the README names every provider variable', () => {
  const text = repoFile('README.md');
  envVars().forEach(({ name, p }) => {
    assert.ok(text.includes(`\`${name}\``), `README.md never mentions ${name} (${p.label})`);
  });
});

test('only a provider whose endpoint is the operator\'s can take one from the environment', () => {
  /* Otherwise the environment could redirect a provider the dialog presents as
   * fixed — an Anthropic config quietly calling somewhere else, with no field on
   * screen to reveal it. Overriding a fixed endpoint is a different feature. */
  PROVIDERS.filter(p => p.envBaseUrl).forEach(p => {
    assert.equal(p.baseUrlEditable, true,
      `${p.label} takes an endpoint from the environment but shows no field for it`);
  });
});

test('endpoint variables are unique and distinct from the key variables', () => {
  const all = envVars().map(v => v.name);
  assert.equal(new Set(all).size, all.length);
});

test('a key prefix belongs to exactly one provider', () => {
  /* `foreignKeyOwner` resolves longest-prefix-first; two providers claiming the
   * same prefix would make its answer depend on array order. */
  const prefixes = PROVIDERS.flatMap(p => p.keyPrefixes ?? []);
  assert.equal(new Set(prefixes).size, prefixes.length);
});

test('Poolside is reachable, text-only, and rides the OpenAI-compatible adapter', () => {
  const p = providerInfo('poolside');
  assert.equal(p.adapter, 'openai');
  assert.equal(p.supportsPdf, false);
  assert.equal(baseUrlOf(cfg({ provider: 'poolside' })), 'https://inference.poolside.ai/v1');
  /* Editable on purpose: Poolside's own documentation says the base URL differs
   * by access method — their platform, Bedrock, OpenRouter, self-hosted. */
  assert.equal(p.baseUrlEditable, true);
  /* No prefix claimed: the shape of a Poolside key is not documented, and the
   * prefixes exist only to warn that a key belongs elsewhere. Claiming a wrong
   * one would produce a wrong warning, which is worse than none. */
  assert.equal(p.keyPrefixes, undefined);
  assert.equal(foreignKeyOwner('poolside', 'sk-ant-abc')?.id, 'anthropic');
});

test('nothing claims a structured-output dialect it does not need', () => {
  /* Unset means "send OpenAI's `response_format` and fall back to
   * `guided_json`", which is right for everything except NIM, where the
   * fallback would burn a request on every run. */
  const named = PROVIDERS.filter(p => p.structured).map(p => p.id);
  assert.deepEqual(named, ['nvidia']);
});
