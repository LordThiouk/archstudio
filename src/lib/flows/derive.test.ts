import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { toFlowPattern } from './derive';
import { matchSteps } from './match';
import { insertFlow } from './apply';
import { blankArchitecture } from '../defaults';
import { LIBRARY_MAX_DESC, LIBRARY_MAX_STEPS } from './types';
import type { Architecture, Component, Flow } from '../types';

/* The first test is the one that justifies this module existing at all: if a
 * derived pattern did not round-trip inside its own project, storing the raw
 * `Flow` would be the better design and all of this would be ceremony. */

const comp = (id: string, name: string, rest: Partial<Component> = {}): Component =>
  ({ id, name, group: 'core', layer: 'services', ...rest });

const SOURCE: Component[] = [
  comp('shop-web', 'Shop web app', { layer: 'clients', icon: 'web', tech: ['Next.js'] }),
  comp('order-api', 'Order API', { tech: ['Node.js'] }),
  comp('pricing', 'Pricing engine'),
  comp('stripe', 'Stripe', { group: 'vendor', icon: 'card' }),
  comp('orders-db', 'Orders database', { layer: 'data', icon: 'db', tech: ['PostgreSQL'] })
];

const FLOW: Flow = {
  id: 'b2c-order', name: 'B2C order', sub: 'Consumer · under a minute',
  steps: [
    { component: 'shop-web', title: 'Basket confirmed', description: 'The customer checks out.' },
    { component: 'order-api', title: 'Order received' },
    { component: 'pricing', title: 'Total computed' },
    { component: 'stripe', title: 'Card charged' },
    { component: 'orders-db', title: 'Order stored' }
  ]
};

function docWith(components: Component[], flows: Flow[] = []): Architecture {
  const d = blankArchitecture('Shop');
  d.components = components;
  d.flows = flows;
  return d;
}

const pattern = () =>
  ({ ...toFlowPattern(docWith(SOURCE, [FLOW]), FLOW, { from: 'Shop' }), id: 'p', savedAt: 'now' });

test('a derived pattern rebinds exactly in the project it came from', () => {
  const p = pattern();
  const target = docWith(SOURCE);
  const bindings = matchSteps(p.steps, target.components).map(b => b.component);
  assert.deepEqual(bindings, FLOW.steps.map(s => s.component));

  insertFlow(target, { pattern: p, bindings });
  assert.deepEqual(target.flows[0].steps, FLOW.steps);
});

test('prose is carried across, the component id is not', () => {
  const p = pattern();
  assert.equal(p.name, 'B2C order');
  assert.equal(p.tagline, 'Consumer · under a minute');
  assert.equal(p.from, 'Shop');
  assert.deepEqual(p.steps.map(s => s.title), FLOW.steps.map(s => s.title));
  assert.equal(p.steps[0].description, 'The customer checks out.');
  assert.equal(JSON.stringify(p).includes('"component"'), false);
});

test('the hint describes the component by name, id, stack, layer and icon', () => {
  const [first] = pattern().steps;
  assert.deepEqual(first.hint.name, ['shop', 'web', 'app']);
  assert.deepEqual(first.hint.tech, ['next']);
  assert.deepEqual(first.hint.layers, ['clients']);
  assert.deepEqual(first.hint.icons, ['web']);
});

test('a pattern still binds most of a project that only names things similarly', () => {
  /* Different ids everywhere, similar vocabulary — the case the review modal
   * exists for. Anything under a majority would make the library pointless. */
  const other = [
    comp('front', 'Web storefront', { layer: 'clients', icon: 'web' }),
    comp('svc-order', 'Order service'),
    comp('svc-pricing', 'Pricing service'),
    comp('psp', 'Stripe payments', { group: 'vendor' }),
    comp('pg', 'Orders store', { layer: 'data', icon: 'db', tech: ['PostgreSQL'] })
  ];
  const bound = matchSteps(pattern().steps, other).filter(b => b.component).length;
  assert.ok(bound >= 4, `expected at least 4 of 5 steps bound, got ${bound}`);
});

test('a step whose component was deleted is left out rather than saved as a dud', () => {
  const thin = docWith(SOURCE.filter(c => c.id !== 'pricing'), [FLOW]);
  const p = toFlowPattern(thin, FLOW);
  assert.equal(p.steps.length, 4);
  assert.equal(p.steps.some(s => s.title === 'Total computed'), false);
});

test('a flow with no subtitle gets a step count as its tagline', () => {
  const p = toFlowPattern(docWith(SOURCE), { ...FLOW, sub: undefined });
  assert.equal(p.tagline, '5 steps');
  assert.equal(p.sub, undefined);
});

test('length caps are applied before anything reaches the database', () => {
  const long: Flow = {
    id: 'long', name: 'Long',
    steps: Array.from({ length: 30 }, (_, i) => ({
      component: SOURCE[i % SOURCE.length].id,
      title: `Step ${i}`,
      description: 'x'.repeat(900)
    }))
  };
  const p = toFlowPattern(docWith(SOURCE), long);
  assert.equal(p.steps.length, LIBRARY_MAX_STEPS);
  assert.equal(p.steps[0].description?.length, LIBRARY_MAX_DESC);
});
