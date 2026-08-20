import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { blankArchitecture, normalizeArchitecture } from './defaults';
import {
  canMoveEnvironment, componentsWithEnvs, envEntry, envEntryIsEmpty, environmentName,
  environmentsInUse, envsOf, moveEnvironment, setEnvField
} from './environments';
import type { Architecture, Component, Environment } from './types';

const comp = (id: string, over: Partial<Component> = {}): Component => ({
  id, name: id, group: 'core', layer: 'services', icon: 'box',
  tech: [], features: [], notes: [], deps: [], ...over
});

/* Declared out of alphabetical order on purpose: the order is the pipeline, and
 * every test below leans on the fact that nothing re-sorts it. */
const ENVS: Environment[] = [
  { id: 'dev', name: 'Dev' },
  { id: 'sa', name: 'SA', note: 'anonymised data' },
  { id: 'prod', name: 'Production' }
];

const build = (environments: Environment[], components: Component[]): Architecture =>
  normalizeArchitecture({ ...blankArchitecture('Test'), environments, components });

/* ------------------------------------------------------------- the entries */

test('an entry that says nothing is empty, and one that says anything is not', () => {
  assert.equal(envEntryIsEmpty({ env: 'dev' }), true);
  assert.equal(envEntryIsEmpty({ env: 'dev', url: '   ' }), true);
  assert.equal(envEntryIsEmpty({ env: 'dev', url: 'x.test' }), false);
  assert.equal(envEntryIsEmpty({ env: 'dev', version: '2.4.1' }), false);
  assert.equal(envEntryIsEmpty({ env: 'dev', note: 'VPN only' }), false);
});

test('a component reads its entries in the document order, not the typing order', () => {
  /* Every table downstream reads across a row, so the columns have to line up
   * without each one sorting for itself. */
  const c = comp('api', {
    envs: [{ env: 'prod', url: 'a' }, { env: 'dev', url: 'b' }, { env: 'sa', url: 'c' }]
  });
  assert.deepEqual(envsOf(c, ENVS).map(e => e.env), ['dev', 'sa', 'prod']);
});

test('an entry pointing at an environment the document does not declare is not read', () => {
  const c = comp('api', { envs: [{ env: 'dev', url: 'a' }, { env: 'gone', url: 'b' }] });
  assert.deepEqual(envsOf(c, ENVS).map(e => e.env), ['dev']);
});

/* --------------------------------------------------------------- the editor */

test('typing into a blank environment creates the entry, one field at a time', () => {
  const c = comp('api');
  setEnvField(c, 'sa', 'url', 'api-sa.test');
  assert.deepEqual(c.envs, [{ env: 'sa', url: 'api-sa.test' }]);
  setEnvField(c, 'sa', 'version', '2.5.0-rc2');
  assert.deepEqual(c.envs, [{ env: 'sa', url: 'api-sa.test', version: '2.5.0-rc2' }]);
});

test('clearing the last field drops the entry rather than leaving a husk', () => {
  /* Otherwise the document would carry a row saying only "this component has an
   * environment", which no table can render and no author meant to write. */
  const c = comp('api', { envs: [{ env: 'sa', url: 'api-sa.test' }] });
  setEnvField(c, 'sa', 'url', '');
  assert.equal(c.envs, undefined);
});

test('clearing one field of several leaves the entry standing', () => {
  const c = comp('api', { envs: [{ env: 'sa', url: 'api-sa.test', version: '2.4.1' }] });
  setEnvField(c, 'sa', 'url', '');
  assert.deepEqual(c.envs, [{ env: 'sa', version: '2.4.1' }]);
});

/* ----------------------------------------------------------------- in use */

test('a table only draws the environments something was written into', () => {
  /* A document that declared five and filled two should print two columns, not
   * five and three columns of dashes — the restraint `marksInUse` keeps. */
  const items = [
    comp('a', { envs: [{ env: 'prod', url: 'x' }] }),
    comp('b', { envs: [{ env: 'dev', url: 'y' }] }),
    comp('c')
  ];
  assert.deepEqual(environmentsInUse(items, ENVS).map(e => e.id), ['dev', 'prod']);
  assert.deepEqual(componentsWithEnvs(items).map(c => c.id), ['a', 'b']);
});

test('an environment nobody filled in draws no column even when declared', () => {
  assert.deepEqual(environmentsInUse([comp('a')], ENVS), []);
});

test('an environment is named in the reader’s words, and falls back to its id', () => {
  assert.equal(environmentName(ENVS, 'sa'), 'SA');
  assert.equal(environmentName(ENVS, 'nope'), 'nope');
});

/* ---------------------------------------------------------------- the order */

test('an environment moves one place, and refuses by identity at either end', () => {
  assert.deepEqual(moveEnvironment(ENVS, 'prod', -1).map(e => e.id), ['dev', 'prod', 'sa']);
  assert.equal(moveEnvironment(ENVS, 'dev', -1), ENVS);
  assert.equal(moveEnvironment(ENVS, 'prod', 1), ENVS);
  assert.equal(moveEnvironment(ENVS, 'nope', 1), ENVS);
  assert.equal(canMoveEnvironment(ENVS, 'dev', -1), false);
  assert.equal(canMoveEnvironment(ENVS, 'dev', 1), true);
});

/* ------------------------------------------------- through the normaliser */

test('the declared order survives the normaliser — it is the pipeline, not a set', () => {
  const doc = build(ENVS, []);
  assert.deepEqual(doc.environments.map(e => e.id), ['dev', 'sa', 'prod']);
  assert.equal(doc.environments[1].note, 'anonymised data');
});

test('an address for an environment that is gone is dropped on read', () => {
  const doc = build([{ id: 'dev', name: 'Dev' }], [
    comp('api', { envs: [{ env: 'dev', url: 'a.test' }, { env: 'gone', url: 'b.test' }] })
  ]);
  assert.deepEqual(doc.components[0].envs, [{ env: 'dev', url: 'a.test' }]);
});

test('blank entries and duplicates do not survive, and nothing left means nothing stored', () => {
  const doc = build(ENVS, [
    comp('a', { envs: [{ env: 'dev', url: '  ' }] }),
    comp('b', { envs: [{ env: 'sa', url: 'x' }, { env: 'sa', url: 'y' }] })
  ]);
  assert.equal(doc.components[0].envs, undefined);
  assert.deepEqual(doc.components[1].envs, [{ env: 'sa', url: 'x' }]);
});

test('a document that names no environment reads exactly as it did before the field', () => {
  const doc = build([], [comp('a'), comp('b')]);
  assert.deepEqual(doc.environments, []);
  assert.ok(doc.components.every(c => c.envs === undefined));
});

test('envEntry finds one entry without caring about order', () => {
  const c = comp('api', { envs: [{ env: 'prod', url: 'p' }, { env: 'dev', url: 'd' }] });
  assert.equal(envEntry(c, 'dev')?.url, 'd');
  assert.equal(envEntry(c, 'sa'), undefined);
});
