import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { blankArchitecture, normalizeArchitecture } from './defaults';
import { diffArchitecture } from './diff';
import {
  edgeDroppedInTarget, edgeOpacity, edgeStroke, droppedInTarget, isLifecycle, isTransition,
  statesInUse, stateSign, stateTick, type Lifecycle
} from './lifecycle';
import { edgePlateText, protocolConvention } from './links';
import type { Architecture, Component } from './types';

const comp = (id: string, over: Partial<Component> = {}): Component => ({
  id, name: id, group: 'core', layer: 'services', icon: 'box',
  tech: [], features: [], notes: [], deps: [], ...over
});

const withComponents = (components: Component[]): Architecture =>
  normalizeArchitecture({ ...blankArchitecture('Test'), components });

const found = (doc: Architecture, id: string) => doc.components.find(c => c.id === id)!;

/* --------------------------------------------------------- normalisation */

test('an unmarked document keeps every state absent, so nothing about it changes', () => {
  const doc = withComponents([comp('api', { deps: ['db'] }), comp('db', { layer: 'data' })]);
  assert.equal(found(doc, 'api').state, undefined);
  assert.equal(statesInUse(doc.components).length, 0);
  assert.equal(isTransition(doc.components), false);
});

test('an invented mark is dropped rather than drawn as a fourth state', () => {
  const doc = withComponents([comp('api', { state: 'retired' as Lifecycle })]);
  assert.equal(found(doc, 'api').state, undefined);
  assert.equal(isLifecycle('retired'), false);
  assert.equal(isLifecycle('removed'), true);
});

test('an edge annotated with nothing but a mark survives normalisation', () => {
  /* `linkIsEmpty` has to count a transition mark as something worth saying, or
   * marking a call for removal and touching nothing else would be discarded on
   * the next autosave. */
  const doc = withComponents([
    comp('api', { deps: ['db'], links: [{ to: 'db', state: 'removed' }] }),
    comp('db', { layer: 'data' })
  ]);
  assert.deepEqual(found(doc, 'api').links, [{ to: 'db', state: 'removed' }]);
});

test('an invented mark on an edge is dropped, and takes the empty link with it', () => {
  const doc = withComponents([
    comp('api', { deps: ['db'], links: [{ to: 'db', state: 'retired' as Lifecycle }] }),
    comp('db', { layer: 'data' })
  ]);
  assert.equal(found(doc, 'api').links, undefined);
});

test('statesInUse reads components and edges together, in declaration order', () => {
  const doc = withComponents([
    comp('api', { state: 'removed', deps: ['db'], links: [{ to: 'db', state: 'new' }] }),
    comp('db', { layer: 'data' })
  ]);
  assert.deepEqual(statesInUse(doc.components), ['new', 'removed']);
  assert.equal(isTransition(doc.components), true);
});

/* ------------------------------------------------------------ the marks */

test('the marks are three letters on a card and one character on a line', () => {
  assert.equal(stateTick('new'), 'NEW');
  assert.equal(stateTick(undefined), null);
  assert.equal(stateSign('removed'), '-');
  assert.equal(stateSign(undefined), null);
});

test('a plate carries the sign with no protocol convention declared at all', () => {
  /* The transition must not wait on `defaultProtocol`: a landscape can describe
   * a delta without ever naming a protocol. */
  const off = protocolConvention(undefined);
  assert.equal(off.mode, 'off');
  assert.equal(edgePlateText({ to: 'db', state: 'new' }, off), '+');
  assert.equal(edgePlateText({ to: 'db', state: 'new', protocol: 'JDBC' }, off), '+');
});

test('the sign and the protocol share one plate when both have something to say', () => {
  const conv = protocolConvention({ defaultProtocol: 'REST' });
  assert.equal(edgePlateText({ to: 'db', state: 'new', protocol: 'JDBC' }, conv), '+ JDBC');
  /* The protocol is the default, so only the sign survives. */
  assert.equal(edgePlateText({ to: 'db', state: 'new', protocol: 'REST' }, conv), '+');
  assert.equal(edgePlateText({ to: 'db', protocol: 'JDBC' }, conv), 'JDBC');
  assert.equal(edgePlateText({ to: 'db', protocol: 'REST' }, conv), null);
  assert.equal(edgePlateText(undefined, conv), null);
});

/* ----------------------------------------------------------- the target */

test('a removal is a ghost of an ordinary edge, and a departure is heavier', () => {
  assert.equal(edgeStroke(undefined, 1.2), 1.2);
  assert.equal(edgeStroke('new', 1.2), 2);
  assert.equal(edgeStroke('changed', 1.2), 2);
  assert.equal(edgeStroke('removed', 1.2), 1.2);

  assert.equal(edgeOpacity(undefined, .3), .3);
  assert.equal(edgeOpacity('new', .3), .3);
  assert.ok(edgeOpacity('removed', .3) < .3);
  /* Each surface passes its own resting opacity — .3 on screen, .45 on paper. */
  assert.equal(edgeOpacity('removed', .45), .45 * 0.45);
});

test('with the toggle on, nothing is dropped', () => {
  const a = comp('api', { state: 'removed' });
  assert.equal(droppedInTarget(a, true), false);
  assert.equal(edgeDroppedInTarget(a, comp('db'), { to: 'db', state: 'removed' }, true), false);
});

test('the target state drops the removals, and only the removals', () => {
  assert.equal(droppedInTarget(comp('api', { state: 'removed' }), false), true);
  assert.equal(droppedInTarget(comp('api', { state: 'new' }), false), false);
  assert.equal(droppedInTarget(comp('api'), false), false);
});

test('an edge leaves the target state when it is retired, or when either end is', () => {
  const live = comp('api');
  const gone = comp('legacy', { state: 'removed' });

  /* The edge itself is retired though both ends survive — rewiring. */
  assert.equal(edgeDroppedInTarget(live, comp('db'), { to: 'db', state: 'removed' }, false), true);
  /* The callee is going, so no dependency on it survives whatever the edge says. */
  assert.equal(edgeDroppedInTarget(live, gone, undefined, false), true);
  /* And the caller. */
  assert.equal(edgeDroppedInTarget(gone, live, undefined, false), true);
  /* Everything alive and unannotated stays. */
  assert.equal(edgeDroppedInTarget(live, comp('db'), { to: 'db', state: 'new' }, false), false);
  assert.equal(edgeDroppedInTarget(live, comp('db'), undefined, false), false);
});

/* ------------------------------------------------------------- history */

test('History names which way a component moved through the transition', () => {
  const before = withComponents([comp('api', { name: 'API' })]);
  const after = withComponents([comp('api', { name: 'API', state: 'removed' })]);
  assert.deepEqual(diffArchitecture(before, after).changes, [
    { kind: 'changed', area: 'component', label: 'API', detail: 'transition: existing → removed' }
  ]);
});

test('unmarking a component reads as a move back to existing, not as a blank', () => {
  const before = withComponents([comp('api', { name: 'API', state: 'new' })]);
  const after = withComponents([comp('api', { name: 'API' })]);
  assert.equal(diffArchitecture(before, after).changes[0].detail,
    'transition: new → existing');
});

test("an edge's mark lands in the history alongside its protocol and kind", () => {
  const before = withComponents([
    comp('api', { name: 'API', deps: ['db'], links: [{ to: 'db', protocol: 'SQL' }] }),
    comp('db', { name: 'Postgres', layer: 'data' })
  ]);
  const after = withComponents([
    comp('api', { name: 'API', deps: ['db'], links: [{ to: 'db', protocol: 'SQL', state: 'removed' }] }),
    comp('db', { name: 'Postgres', layer: 'data' })
  ]);
  assert.equal(diffArchitecture(before, after).changes[0].detail, 'SQL → SQL · removed');
});
