import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { ANALYSIS_SCHEMA } from '../schema';
import { toGeminiSchema, type GeminiSchema } from './dialects';
import { PROVIDERS, providerInfo, baseUrlOf, foreignKeyOwner } from './types';

/* The schema is the contract the whole feature rests on, and each provider
 * accepts it in a different accent. Anthropic and the OpenAI-compatible
 * surface take it unchanged — `schema.test.ts` already holds it to what
 * `strict: true` demands. Gemini needs a translation, which is what this file
 * watches. */

const gemini = toGeminiSchema(ANALYSIS_SCHEMA as unknown as Record<string, unknown>);

const find = (node: GeminiSchema, path: string[]): GeminiSchema => {
  let cur = node;
  for (const step of path) {
    cur = step === '[]' ? cur.items! : cur.properties![step];
    assert.ok(cur, `missing ${path.join('.')}`);
  }
  return cur;
};

test('types are upper-cased all the way down', () => {
  assert.equal(gemini.type, 'OBJECT');
  assert.equal(find(gemini, ['document', 'components']).type, 'ARRAY');
  assert.equal(find(gemini, ['document', 'components', '[]', 'name']).type, 'STRING');
  assert.equal(find(gemini, ['document', 'components', '[]', 'tech']).type, 'ARRAY');
});

test('additionalProperties is dropped — Gemini rejects it', () => {
  const seen: string[] = [];
  const walk = (n: GeminiSchema, path: string) => {
    if ('additionalProperties' in n) seen.push(path);
    if (n.items) walk(n.items, `${path}[]`);
    for (const [k, v] of Object.entries(n.properties ?? {})) walk(v, `${path}.${k}`);
  };
  walk(gemini, 'root');
  assert.deepEqual(seen, []);
});

test('required survives, so "unknown" still has to be an empty string', () => {
  assert.deepEqual([...(gemini.required ?? [])].sort(), ['assumptions', 'document', 'questions']);
  assert.ok(find(gemini, ['document', 'components', '[]']).required?.includes('deps'));
});

test('the enum that uses "" for “I don’t know” is not carried over', () => {
  /* A link's kind may legitimately be empty, and an empty enum member on this
   * surface is a bet not worth taking — convert.ts validates it instead. */
  const kind = find(gemini, ['document', 'links', '[]', 'kind']);
  assert.equal(kind.enum, undefined);
  assert.equal(kind.type, 'STRING');

  /* `meta.lang` has no empty member, so it keeps its constraint. */
  const lang = find(gemini, ['document', 'meta', 'lang']);
  assert.deepEqual(lang.enum, ['en', 'fr']);
  assert.equal(lang.format, 'enum');
});

/* --------------------------------------------------------------- registry */

test('every provider is complete enough to build a form and a request from', () => {
  for (const p of PROVIDERS) {
    assert.ok(p.label, `${p.id} needs a label`);
    assert.ok(p.blurb, `${p.id} needs a blurb`);
    assert.ok(['anthropic', 'openai', 'gemini'].includes(p.adapter), `${p.id} has no adapter`);
    /* Only Anthropic's SDK carries its own endpoint; everything else is called
     * over plain HTTP and needs somewhere to call. */
    if (p.adapter !== 'anthropic') {
      assert.ok(p.defaultBaseUrl || p.baseUrlEditable, `${p.id} has nowhere to send a request`);
    }
  }
  assert.equal(new Set(PROVIDERS.map(p => p.id)).size, PROVIDERS.length, 'ids must be unique');
});

test('NVIDIA asks for a schema its own way, and only NVIDIA does', () => {
  /* NIM does not implement `response_format` and documents `nvext.guided_json`
   * instead. Sending the wrong one is not a loud failure — the field is
   * ignored and the answer comes back unconstrained, which is the single
   * outcome this feature exists to prevent. */
  assert.equal(providerInfo('nvidia').structured, 'guided_json');
  for (const p of PROVIDERS.filter(x => x.id !== 'nvidia')) {
    assert.equal(p.structured, undefined, `${p.id} should use the default dialect`);
  }
});

test('the base URL is normalised, and an unknown provider degrades to the first', () => {
  assert.equal(
    baseUrlOf({ provider: 'compatible', model: 'm', apiKey: '', baseUrl: 'http://box:1234/v1/' }),
    'http://box:1234/v1'
  );
  /* Falls back to the registry's default when the config carries none. */
  assert.match(baseUrlOf({ provider: 'openai', model: 'm', apiKey: 'k' }), /api\.openai\.com/);
  assert.equal(providerInfo('nope' as never).id, PROVIDERS[0].id);
});

test('a key from another vendor is recognised as such', () => {
  /* The failure this prevents: an NVIDIA key pasted into the Anthropic field
   * comes back as "invalid x-api-key", which names neither vendor. */
  assert.equal(foreignKeyOwner('anthropic', 'nvapi-abc123')?.id, 'nvidia');
  assert.equal(foreignKeyOwner('gemini', 'sk-ant-abc123')?.id, 'anthropic');
  /* Longest prefix wins: an Anthropic key must not read as OpenAI's `sk-`. */
  assert.equal(foreignKeyOwner('openai', 'sk-ant-abc123')?.id, 'anthropic');
  assert.equal(foreignKeyOwner('anthropic', 'sk-plain-openai-key')?.id, 'openai');

  /* Silent when the key belongs where it is, is empty, or is a shape nobody
   * claims — a vendor may change its format and must not be refused for it. */
  assert.equal(foreignKeyOwner('anthropic', 'sk-ant-abc'), null);
  assert.equal(foreignKeyOwner('anthropic', '  '), null);
  assert.equal(foreignKeyOwner('compatible', 'whatever-a-local-server-wants'), null);
});
