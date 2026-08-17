import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { flowLinkReflections, orphanDiagramLinks, shortJourneyFlow } from './reflection';
import type { Component, Flow } from '../types';

const components: Component[] = [
  {
    id: 'web', name: 'Web', group: 'product', layer: 'clients',
    deps: ['auth', 'db'],
    links: [
      { to: 'auth', protocol: 'OIDC', kind: 'sync' },
      { to: 'db', protocol: 'SQL', kind: 'async' }
    ]
  },
  { id: 'auth', name: 'Identity', group: 'product', layer: 'edge' },
  { id: 'worker', name: 'Worker', group: 'product', layer: 'services' },
  { id: 'db', name: 'Database', group: 'product', layer: 'data' }
];

test('flow reflection exposes consecutive chips and non-adjacent soft hints without mutation', () => {
  const flow: Flow = {
    id: 'login', name: 'Login', steps: [
      { component: 'web', title: 'Open' },
      { component: 'auth', title: 'Sign in' },
      { component: 'worker', title: 'Work' },
      { component: 'db', title: 'Store' }
    ]
  };
  const before = structuredClone({ components, flow });
  const reflection = flowLinkReflections(components, flow);

  assert.deepEqual(reflection.consecutive, [{
    afterStep: 0,
    from: 'web',
    to: 'auth',
    link: { to: 'auth', protocol: 'OIDC', kind: 'sync' }
  }]);
  assert.deepEqual(reflection.nonAdjacent, [{
    from: 'web',
    to: 'db',
    link: { to: 'db', protocol: 'SQL', kind: 'async' }
  }]);
  assert.deepEqual({ components, flow }, before);
});

test('flow reflection uses deps even when links annotation is missing', () => {
  const bare: Component[] = [
    { id: 'web', name: 'Web', group: 'product', layer: 'clients', deps: ['auth'] },
    { id: 'auth', name: 'Identity', group: 'product', layer: 'edge' }
  ];
  const flow: Flow = {
    id: 'login', name: 'Login',
    steps: [{ component: 'web', title: 'Open' }, { component: 'auth', title: 'Sign in' }]
  };
  const reflection = flowLinkReflections(bare, flow);
  assert.deepEqual(reflection.consecutive, [{
    afterStep: 0, from: 'web', to: 'auth', link: { to: 'auth' }
  }]);
});

test('orphan diagram links become a short journey when requested', () => {
  const orphans = orphanDiagramLinks(components, []);
  assert.equal(orphans.some(edge => edge.from === 'web' && edge.to === 'auth'), true);
  const journey = shortJourneyFlow(components, orphans[0], []);
  assert.equal(journey.steps.length, 2);
  assert.equal(journey.sub, 'Consumer · under an hour');
  assert.ok(journey.note);
  assert.ok(journey.steps.every(step => step.description));
  assert.deepEqual(journey.steps.map(step => step.component), [orphans[0].from, orphans[0].to]);
  assert.equal(orphanDiagramLinks(components, [journey]).some(edge =>
    edge.from === orphans[0].from && edge.to === orphans[0].to
  ), false);
});
