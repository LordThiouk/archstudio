import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { fold, matchSteps, scoreComponent } from './match';
import type { Component } from '../types';
import type { FlowHint } from './types';

/* The scorer's job is to be *predictably* right, not cleverly right: its output
 * lands in a form the user reviews. So these tests are about the two properties
 * that make a review possible — the same input always proposes the same
 * bindings, and a wrong proposal is wrong for a reason you can point at. */

const comp = (id: string, name: string, rest: Partial<Component> = {}): Component =>
  ({ id, name, group: 'core', layer: 'services', ...rest });

const DOC: Component[] = [
  comp('web', 'Web app', { layer: 'clients', icon: 'web', tech: ['Next.js'] }),
  comp('api-consumer', 'Consumer API', { tech: ['Node.js', 'REST'] }),
  comp('api-gateway', 'API gateway', { layer: 'edge', icon: 'route' }),
  comp('auth-svc', 'Authentication service', { tech: ['OIDC', 'JWT'], icon: 'shield' }),
  comp('pg-users', 'PostgreSQL users', { layer: 'data', icon: 'db', tech: ['PostgreSQL'] }),
  comp('redis', 'Redis cache', { layer: 'data', icon: 'db', tech: ['Redis'] })
];

const one = (hint: FlowHint) => matchSteps([{ hint }], DOC)[0];

test('an exact name token beats a component that only shares a weaker signal', () => {
  assert.equal(one({ name: ['gateway'] }).component, 'api-gateway');
  /* "Consumer API" holds the token `api` too, but only the gateway holds
   * `gateway` — the decoy must not win on the shared half. */
  assert.equal(one({ name: ['gateway', 'api'] }).component, 'api-gateway');
});

test('a token prefix of four characters or more matches, shorter ones do not', () => {
  const auth = one({ name: ['auth'] });
  assert.equal(auth.component, 'auth-svc', '`auth` reaches "Authentication service"');
  assert.equal(auth.confident, true);

  /* `db` is two characters: matching it as a prefix would take "dbt", "dbo"
   * and anything else starting with those letters. It stays a whole-token test,
   * and no component here holds `db` as a token. */
  assert.equal(one({ name: ['db'] }).component, null);
});

test('avoid disqualifies outright, whatever else the component scores', () => {
  assert.equal(one({ name: ['api'] }).component, 'api-consumer');
  assert.equal(one({ name: ['api'], avoid: ['consumer'] }).component, 'api-gateway');
  assert.equal(one({ name: ['redis'], avoid: ['cache'] }).component, null);
});

test('accents fold, so a French hint reaches a French component', () => {
  const fr = [comp('edge', "Passerelle d'entrée")];
  assert.equal(fold("Passerelle d'entrée"), ' passerelle d entree ');
  assert.equal(matchSteps([{ hint: { name: ['entree'] } }], fr)[0].component, 'edge');
});

test('the wide haystack is a weak signal, and says so', () => {
  /* Nothing is named "oidc"; only auth-svc lists it as a technology. It wins,
   * but below the confidence bar — the UI flags it as a guess. */
  const b = one({ tech: ['oidc'] });
  assert.equal(b.component, 'auth-svc');
  assert.equal(b.confident, false);
});

test('layer and icon alone can pick a component but never with confidence', () => {
  const b = one({ layers: ['data'], icons: ['db'] });
  assert.equal(b.component, 'pg-users', 'the earlier of the two data components');
  assert.equal(b.confident, false);
});

test('nothing above zero means the step is proposed as skipped', () => {
  assert.deepEqual(one({ name: ['kafka', 'pubsub'] }), { component: null, score: 0, confident: false });
});

test('ties resolve to the earlier component, and two runs agree', () => {
  const twins = [comp('a', 'Message queue'), comp('b', 'Message queue')];
  assert.equal(matchSteps([{ hint: { name: ['queue'] } }], twins)[0].component, 'a');

  const steps = [{ hint: { name: ['web'] } }, { hint: { name: ['api'] } }, { hint: { name: ['db', 'postgresql'] } }];
  assert.deepEqual(matchSteps(steps, DOC), matchSteps(steps, DOC));
});

test('two consecutive steps never land on the same component', () => {
  /* A step that does not move is a no-op in the viewer's animation. On a
   * one-component document the honest answer is a single binding and a skip. */
  const solo = [comp('mono', 'Monolith', { tech: ['Rails'] })];
  const got = matchSteps([{ hint: { name: ['monolith'] } }, { hint: { name: ['monolith'] } }], solo);
  assert.equal(got[0].component, 'mono');
  assert.equal(got[1].component, null);
});

test('a flow may return to a component it already visited', () => {
  const steps = [
    { hint: { name: ['web'] } },
    { hint: { name: ['gateway'] } },
    { hint: { name: ['web'] } }
  ];
  assert.deepEqual(matchSteps(steps, DOC).map(b => b.component), ['web', 'api-gateway', 'web']);
});

test('scoreComponent is ordered: exact name > prefix > wide > layer', () => {
  /* `id` is folded into the same narrow haystack as `name`, so this needs a
   * component whose id does not hand the weaker hint an exact token for free. */
  const c = comp('svc-7', 'Authentication service', { tech: ['JWT'] });
  assert.ok(scoreComponent(c, { name: ['authentication'] }) > scoreComponent(c, { name: ['auth'] }));
  assert.ok(scoreComponent(c, { name: ['auth'] }) > scoreComponent(c, { tech: ['jwt'] }));
  assert.ok(scoreComponent(c, { tech: ['jwt'] }) > scoreComponent(c, { layers: ['services'] }));
});

test('an unnamed component is never proposed, only chosen by hand', () => {
  assert.equal(matchSteps([{ hint: { name: ['api'] } }], [comp('x', '')])[0].component, null);
});
