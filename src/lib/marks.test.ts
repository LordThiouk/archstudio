import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { blankArchitecture, ICON_KEYS, normalizeArchitecture } from './defaults';
import { diffArchitecture } from './diff';
import {
  describeMarks, isSecurityMark, MARK_ICON, MARK_LABELS, marksInUse, normalizeMarks,
  SECURITY_MARKS, type SecurityMark
} from './marks';
import type { Architecture, Component } from './types';

const comp = (id: string, over: Partial<Component> = {}): Component => ({
  id, name: id, group: 'core', layer: 'services', icon: 'box',
  tech: [], features: [], notes: [], deps: [], ...over
});

const withComponents = (components: Component[]): Architecture =>
  normalizeArchitecture({ ...blankArchitecture('Test'), components });

const found = (doc: Architecture, id: string) => doc.components.find(c => c.id === id)!;

/* -------------------------------------------------------------- the table */

test('every mark has an icon that exists in the shared set, and both languages', () => {
  /* A mark whose icon key is not in ICON_KEYS renders as an empty box in three
   * places at once, and only on a document that happens to use that mark. */
  for (const m of SECURITY_MARKS) {
    assert.ok((ICON_KEYS as readonly string[]).includes(MARK_ICON[m]),
      `${m} points at "${MARK_ICON[m]}", which is not an icon`);
    assert.ok(MARK_LABELS[m].en.length, `${m} has no English label`);
    assert.ok(MARK_LABELS[m].fr.length, `${m} has no French label`);
  }
});

test('the set is closed, and anything else is not a mark', () => {
  assert.equal(isSecurityMark('sso'), true);
  assert.equal(isSecurityMark('mtls'), false);
  assert.equal(isSecurityMark(''), false);
  assert.equal(isSecurityMark(undefined), false);
  assert.equal(isSecurityMark(3), false);
});

/* ---------------------------------------------------------- normalisation */

test('a component with no marks has no key at all, rather than an empty array', () => {
  assert.equal(normalizeMarks(undefined), undefined);
  assert.equal(normalizeMarks([]), undefined);
  assert.equal(normalizeMarks('sso'), undefined);
  assert.equal(found(withComponents([comp('api')]), 'api').marks, undefined);
});

test('invented marks are dropped and the rest survive', () => {
  assert.deepEqual(normalizeMarks(['sso', 'mtls', 'pii']), ['sso', 'pii']);
  assert.equal(normalizeMarks(['mtls', 'oauth']), undefined);
});

test('marks come back in declaration order, whatever order they were written', () => {
  /* Weakest protection first, so a card's glyphs and the key read the same way
   * round on every sheet — and so a diff never reports a reorder as an edit. */
  assert.deepEqual(normalizeMarks(['pii', 'sso', 'public']), ['public', 'sso', 'pii']);
  assert.deepEqual(normalizeMarks(['secured', 'public']), ['public', 'secured']);
});

test('a mark written twice is kept once', () => {
  assert.deepEqual(normalizeMarks(['sso', 'sso', 'pii']), ['sso', 'pii']);
});

test('reordering the marks in the source is not an edit', () => {
  const before = withComponents([comp('api', { name: 'API', marks: ['sso', 'pii'] })]);
  const after = withComponents([comp('api', { name: 'API', marks: ['pii', 'sso'] })]);
  assert.deepEqual(diffArchitecture(before, after).changes, []);
});

/* -------------------------------------------------------------- the key */

test('the key lists only the marks in use, in declaration order', () => {
  const doc = withComponents([
    comp('api', { marks: ['pii'] }),
    comp('web', { marks: ['public', 'pii'] })
  ]);
  assert.deepEqual(marksInUse(doc.components), ['public', 'pii']);
  assert.deepEqual(marksInUse([comp('x')]), []);
});

test('the marks are spelled out for the surfaces that have room for words', () => {
  assert.equal(describeMarks(['sso', 'pii']), 'SSO protected · holds personal data');
  assert.equal(describeMarks(['sso'], 'fr'), 'protégé par SSO');
  assert.equal(describeMarks([]), null);
  assert.equal(describeMarks(undefined), null);
});

/* ------------------------------------------------------------- history */

test('adding a security mark lands in the history under its own name', () => {
  const before = withComponents([comp('api', { name: 'API' })]);
  const after = withComponents([comp('api', { name: 'API', marks: ['public'] })]);
  assert.deepEqual(diffArchitecture(before, after).changes, [
    { kind: 'changed', area: 'component', label: 'API', detail: 'security marks' }
  ]);
});

test('an invented mark reaching normalisation leaves the document unchanged', () => {
  const before = withComponents([comp('api', { name: 'API' })]);
  const after = withComponents([comp('api', { name: 'API', marks: ['mtls' as SecurityMark] })]);
  assert.deepEqual(diffArchitecture(before, after).changes, []);
});
