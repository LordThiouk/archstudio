import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { blankArchitecture, normalizeArchitecture } from './defaults';
import {
  canRedo, canUndo, COALESCE_MS, docShape, initUndo, record, redo, undo, typingInField, UNDO_LIMIT
} from './undo';
import type { Architecture, Component } from './types';

const comp = (id: string, over: Partial<Component> = {}): Component => ({
  id, name: id, group: 'core', layer: 'services', icon: 'box',
  tech: [], features: [], notes: [], deps: [], ...over
});

const build = (components: Component[] = []): Architecture =>
  normalizeArchitecture({
    ...blankArchitecture('Test'),
    groups: [{ id: 'core', name: 'Core' }],
    layers: [{ id: 'services', name: 'Services' }],
    components
  });

/** The same document with one component renamed — a text edit, no shape change. */
const renamed = (doc: Architecture, id: string, name: string): Architecture => {
  const next = structuredClone(doc);
  next.components.find(c => c.id === id)!.name = name;
  return next;
};

/* ------------------------------------------------------------------- shape */

test('renaming a component does not change the shape', () => {
  const doc = build([comp('api')]);
  assert.equal(docShape(doc), docShape(renamed(doc, 'api', 'Gateway')));
});

test('the shape ignores every field a keystroke can reach', () => {
  const doc = build([comp('api')]);
  const edited = structuredClone(doc);
  const c = edited.components[0];
  c.role = 'Answers the front end';
  c.tech = ['Node'];
  c.notes = ['todo'];
  c.badge = 'B2B';
  edited.meta.intro = 'Rewritten';
  edited.groups[0].color = '#123456';
  assert.equal(docShape(doc), docShape(edited));
});

test('moving a component between layers changes the shape', () => {
  const doc = build([comp('api')]);
  const moved = structuredClone(doc);
  moved.components[0].layer = 'edge';
  assert.notEqual(docShape(doc), docShape(moved));
});

test('gaining or losing a dependency changes the shape', () => {
  const doc = build([comp('api'), comp('db')]);
  const linked = structuredClone(doc);
  linked.components[0].deps = ['db'];
  assert.notEqual(docShape(doc), docShape(linked));
});

test('reordering two components changes the shape — a drop in front of another is a move', () => {
  const doc = build([comp('api'), comp('db')]);
  const swapped = structuredClone(doc);
  swapped.components.reverse();
  assert.notEqual(docShape(doc), docShape(swapped));
});

test('changing a zone parent changes the shape, so re-nesting is its own step', () => {
  const doc = normalizeArchitecture({
    ...blankArchitecture('Test'),
    zones: [{ id: 'net', name: 'Internal' }, { id: 'ocp', name: 'OpenShift' }]
  });
  const nested = structuredClone(doc);
  nested.zones[1].parent = 'net';
  assert.notEqual(docShape(doc), docShape(nested));
});

/* ------------------------------------------------------------------ record */

test('a fresh stack has nothing to undo and nothing to redo', () => {
  const stack = initUndo(build([comp('api')]));
  assert.equal(canUndo(stack), false);
  assert.equal(canRedo(stack), false);
});

test('the first edit is always its own step, however soon it arrives', () => {
  /* `initUndo` stamps -Infinity precisely so that a document opened and
   * immediately typed into still leaves a state to come back to. */
  const doc = build([comp('api')]);
  const stack = record(initUndo(doc), renamed(doc, 'api', 'A'), 0);
  assert.equal(stack.past.length, 1);
  assert.equal(stack.past[0].components[0].name, 'api');
});

test('a run of keystrokes collapses into one step', () => {
  const doc = build([comp('api')]);
  let stack = initUndo(doc);
  stack = record(stack, renamed(doc, 'api', 'G'), 1000);
  stack = record(stack, renamed(doc, 'api', 'Ga'), 1100);
  stack = record(stack, renamed(doc, 'api', 'Gat'), 1200);
  stack = record(stack, renamed(doc, 'api', 'Gate'), 1300);
  assert.equal(stack.past.length, 1);
  assert.equal(stack.present.components[0].name, 'Gate');
  assert.equal(undo(stack).present.components[0].name, 'api');
});

test('a pause longer than the window closes the step', () => {
  const doc = build([comp('api')]);
  let stack = initUndo(doc);
  stack = record(stack, renamed(doc, 'api', 'G'), 1000);
  stack = record(stack, renamed(doc, 'api', 'Gateway'), 1000 + COALESCE_MS + 1);
  assert.equal(stack.past.length, 2);
  assert.equal(undo(stack).present.components[0].name, 'G');
});

test('a structural change never merges, however fast it followed a keystroke', () => {
  /* The case time alone would get wrong: typing a name and immediately dragging
   * the card to another layer are two edits, and undoing the drop must not also
   * undo the name. */
  const doc = build([comp('api')]);
  let stack = record(initUndo(doc), renamed(doc, 'api', 'Gateway'), 1000);
  const moved = structuredClone(stack.present);
  moved.components[0].layer = 'edge';
  stack = record(stack, moved, 1050);

  assert.equal(stack.past.length, 2);
  const back = undo(stack);
  assert.equal(back.present.components[0].layer, 'services');
  assert.equal(back.present.components[0].name, 'Gateway');
});

test('two structural edits in the same millisecond are still two steps', () => {
  const doc = build([comp('api')]);
  let stack = initUndo(doc);
  const one = structuredClone(doc); one.components.push(comp('db'));
  stack = record(stack, one, 500);
  const two = structuredClone(one); two.components.push(comp('cache'));
  stack = record(stack, two, 500);
  assert.equal(stack.past.length, 2);
});

test('the stack is bounded, and it drops the oldest state rather than the newest', () => {
  const doc = build([comp('api')]);
  let stack = initUndo(doc);
  for (let i = 0; i < UNDO_LIMIT + 20; i++) {
    stack = record(stack, renamed(doc, 'api', `n${i}`), i * (COALESCE_MS + 1));
  }
  assert.equal(stack.past.length, UNDO_LIMIT);
  assert.equal(stack.past[stack.past.length - 1].components[0].name, `n${UNDO_LIMIT + 18}`);
});

/* -------------------------------------------------------------- undo, redo */

test('undo walks back and redo walks forward over the same states', () => {
  const doc = build([comp('api')]);
  let stack = initUndo(doc);
  stack = record(stack, renamed(doc, 'api', 'A'), 0);
  stack = record(stack, renamed(doc, 'api', 'B'), COALESCE_MS * 2);

  stack = undo(stack);
  assert.equal(stack.present.components[0].name, 'A');
  stack = undo(stack);
  assert.equal(stack.present.components[0].name, 'api');
  assert.equal(canUndo(stack), false);

  stack = redo(stack);
  assert.equal(stack.present.components[0].name, 'A');
  stack = redo(stack);
  assert.equal(stack.present.components[0].name, 'B');
  assert.equal(canRedo(stack), false);
});

test('undo at the bottom returns the very same stack, so nothing re-renders', () => {
  const stack = initUndo(build([comp('api')]));
  assert.equal(undo(stack), stack);
  assert.equal(redo(stack), stack);
});

test('a new edit after an undo drops the redo branch', () => {
  const doc = build([comp('api')]);
  let stack = record(initUndo(doc), renamed(doc, 'api', 'A'), 0);
  stack = undo(stack);
  assert.equal(canRedo(stack), true);
  stack = record(stack, renamed(doc, 'api', 'Z'), COALESCE_MS * 3);
  assert.equal(canRedo(stack), false);
});

test('the edit after an undo never merges into the state it just restored', () => {
  /* Same shape and the same instant: only the -Infinity stamp keeps the undone
   * step from being swallowed by the keystroke that follows it. */
  const doc = build([comp('api')]);
  let stack = record(initUndo(doc), renamed(doc, 'api', 'A'), 1000);
  stack = undo(stack);
  stack = record(stack, renamed(doc, 'api', 'B'), 1000);
  assert.equal(stack.past.length, 1);
  assert.equal(undo(stack).present.components[0].name, 'api');
});

test('undo restores the whole document, not just the part that changed', () => {
  const doc = build([comp('api'), comp('db')]);
  const wired = structuredClone(doc);
  wired.components[0].deps = ['db'];
  wired.components[0].links = [{ to: 'db', protocol: 'SQL' }];
  const stack = undo(record(initUndo(doc), wired, 0));
  assert.deepEqual(stack.present.components[0].deps, []);
  assert.equal(stack.present.components[0].links, undefined);
});

/* ------------------------------------------------------------------ fields */

test('a keystroke inside a text field belongs to the field, not to the canvas', () => {
  const fake = (selector: string | null) => ({ closest: (q: string) => (selector === q ? {} : null) });
  assert.equal(typingInField(fake('input, textarea, select, [contenteditable="true"]') as never), true);
  assert.equal(typingInField(fake(null) as never), false);
  assert.equal(typingInField(null), false);
});
