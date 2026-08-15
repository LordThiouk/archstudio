import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { toArchitecture } from './convert';
import type { WireComponent, WireDocument, WireLink } from './schema';

/* The model answers under a schema, so these tests are not about malformed
 * JSON — they are about a well-formed answer that is *wrong*: an id that is
 * not an id, a dependency on something never defined, a field filled with the
 * empty string the schema forced it to send. Each of those has to become
 * either a correct document or a reported repair, and never a silent loss. */

const wireComponent = (over: Partial<WireComponent> = {}): WireComponent => ({
  id: 'api', name: 'API', group: 'core', layer: 'services',
  icon: 'server', badge: '', url: '', role: '',
  tech: [], features: [], notes: [], deps: [], ...over
});

const link = (over: Partial<WireLink> = {}): WireLink =>
  ({ from: 'api', to: 'db', kind: '', protocol: '', note: '', ...over });

const wire = (over: Partial<WireDocument> = {}): WireDocument => ({
  meta: { lang: 'en', name: 'Test', tagline: '', kicker: '', intro: '', principle: '' },
  groups: [{ id: 'core', name: 'Core', short: '', description: '' }],
  layers: [{ id: 'services', name: 'Services', desc: '' }],
  components: [],
  links: [],
  technologies: [],
  flows: [],
  flowSteps: [],
  ...over
});

test('the empty strings the schema forces are dropped, not written down', () => {
  const { document } = toArchitecture(wire({ components: [wireComponent()] }));
  const c = document.components![0];
  assert.equal('role' in c, false);
  assert.equal('url' in c, false);
  assert.equal('badge' in c, false);
  assert.equal(document.meta!.tagline, undefined);
  /* The lists stay, empty: the editor expects them to exist. */
  assert.deepEqual(c.tech, []);
});

test('a dependency on a component that was never defined is dropped and reported', () => {
  const { document, repairs } = toArchitecture(wire({
    components: [wireComponent({ deps: ['db', 'ghost'] }), wireComponent({ id: 'db', name: 'Database' })]
  }));
  assert.deepEqual(document.components![0].deps, ['db']);
  assert.equal(repairs.filter(r => r.kind === 'dep').length, 1);
  assert.match(repairs.find(r => r.kind === 'dep')!.detail, /ghost/);
});

test('ids are slugified and every reference to them is repointed', () => {
  const { document } = toArchitecture(wire({
    groups: [{ id: 'Core Domain', name: 'Core', short: '', description: '' }],
    layers: [{ id: 'Service Tier', name: 'Services', desc: '' }],
    components: [
      wireComponent({ id: 'Payments API', name: 'Payments', group: 'Core Domain', layer: 'Service Tier', deps: ['Ledger DB'] }),
      wireComponent({ id: 'Ledger DB', name: 'Ledger', group: 'Core Domain', layer: 'Service Tier' })
    ],
    flows: [{ id: 'Take a payment', name: 'Payment', sub: '', group: 'Core Domain', note: '' }],
    flowSteps: [{ flow: 'Take a payment', component: 'Payments API', title: 'Charge', description: '' }]
  }));

  const [payments, ledger] = document.components!;
  assert.equal(payments.id, 'payments-api');
  assert.equal(ledger.id, 'ledger-db');
  assert.deepEqual(payments.deps, ['ledger-db']);
  assert.equal(payments.group, 'core-domain');
  assert.equal(payments.layer, 'service-tier');
  assert.equal(document.flows![0].steps[0].component, 'payments-api');
});

test('an unknown scope is rebased on the first one, and says so', () => {
  const { document, repairs } = toArchitecture(wire({
    components: [wireComponent({ group: 'invented' })]
  }));
  assert.equal(document.components![0].group, 'core');
  assert.equal(repairs.filter(r => r.kind === 'scope').length, 1);
});

test('an annotation cannot outlive the dependency it describes', () => {
  const { document } = toArchitecture(wire({
    components: [wireComponent({ deps: ['db'] }), wireComponent({ id: 'db', name: 'Database' })],
    links: [
      link({ to: 'db', kind: 'sync', protocol: 'SQL' }),
      link({ to: 'ghost', kind: 'async', protocol: 'Kafka' })
    ]
  }));
  assert.deepEqual(document.components![0].links, [{ to: 'db', kind: 'sync', protocol: 'SQL' }]);
});

test('a flat annotation is filed against the component it comes from', () => {
  /* The links arrive in one list rather than inside each component — the
   * schema is flattened to keep the compiled grammar small — so `from` is what
   * decides where each one lands. */
  const { document } = toArchitecture(wire({
    components: [
      wireComponent({ deps: ['db'] }),
      wireComponent({ id: 'worker', name: 'Worker', deps: ['db'] }),
      wireComponent({ id: 'db', name: 'Database' })
    ],
    links: [
      link({ from: 'worker', to: 'db', protocol: 'batch load' }),
      link({ from: 'nobody', to: 'db', protocol: 'from a component that does not exist' })
    ]
  }));
  assert.equal(document.components![0].links, undefined);
  assert.deepEqual(document.components![1].links, [{ to: 'db', protocol: 'batch load' }]);
});

test('"I do not know how it travels" is an empty kind, not an invented one', () => {
  const { document } = toArchitecture(wire({
    components: [wireComponent({ deps: ['db'] }), wireComponent({ id: 'db', name: 'Database' })],
    links: [link({ to: 'db', protocol: 'REST' })]
  }));
  assert.deepEqual(document.components![0].links, [{ to: 'db', protocol: 'REST' }]);
});

test('an icon outside the studio’s set is dropped rather than drawn', () => {
  const { document, repairs } = toArchitecture(wire({
    components: [wireComponent({ icon: 'rocket' })]
  }));
  assert.equal('icon' in document.components![0], false);
  assert.equal(repairs.filter(r => r.kind === 'icon').length, 1);
});

test('a flow whose every step points nowhere is dropped, not kept empty', () => {
  const { document, repairs } = toArchitecture(wire({
    components: [wireComponent()],
    flows: [{ id: 'f1', name: 'Ghost flow', sub: '', group: 'core', note: '' }],
    flowSteps: [{ flow: 'f1', component: 'nobody', title: 'Step', description: '' }]
  }));
  assert.equal(document.flows!.length, 0);
  assert.equal(repairs.filter(r => r.kind === 'flow-step').length, 1);
});

test('flat steps keep their order and land in the right flow', () => {
  const { document } = toArchitecture(wire({
    components: [wireComponent(), wireComponent({ id: 'db', name: 'Database' })],
    flows: [
      { id: 'buy', name: 'Purchase', sub: '', group: 'core', note: '' },
      { id: 'signup', name: 'Signup', sub: '', group: 'core', note: '' }
    ],
    flowSteps: [
      { flow: 'buy', component: 'api', title: 'One', description: '' },
      { flow: 'signup', component: 'api', title: 'Elsewhere', description: '' },
      { flow: 'buy', component: 'db', title: 'Two', description: '' }
    ]
  }));

  const buy = document.flows!.find(f => f.name === 'Purchase')!;
  assert.deepEqual(buy.steps.map(s => s.title), ['One', 'Two']);
  assert.deepEqual(buy.steps.map(s => s.component), ['api', 'db']);
  assert.equal(document.flows!.find(f => f.name === 'Signup')!.steps.length, 1);
});

test('a component cannot depend on itself', () => {
  const { document } = toArchitecture(wire({
    components: [wireComponent({ deps: ['api'] })]
  }));
  assert.deepEqual(document.components![0].deps, []);
});
