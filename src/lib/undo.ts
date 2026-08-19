/* The stack that sits in front of History.
 *
 * Nothing in the editor has a Save button — an edit lands 700 ms after you stop
 * typing — and History writes a snapshot at most once every five minutes. Between
 * those two facts, the way back from a misdrop or a scope deleted by accident was
 * a snapshot that could be five minutes old. This is the step in between.
 *
 * One rule decides both of the things an undo stack has to get right. A push
 * merges into the previous one only when the document's *shape* is unchanged and
 * the last one was recent: renaming a component keeps the shape, so a run of
 * keystrokes collapses into a single step that closes when you pause; moving that
 * component to another layer changes the shape and takes its own step however
 * fast it followed. Time alone would have merged a drop into the rename before
 * it, and shape alone would have made every letter undoable.
 *
 * The stack is in memory and per-session on purpose. What survives a reload is
 * History, which is the other half of the same answer and already durable. */

import type { Architecture } from './types';

/** Deep enough to cover a working session, short enough that the retained
 *  documents stay a few megabytes rather than a few hundred. */
export const UNDO_LIMIT = 60;

/** How long a run of keystrokes may pause before it becomes its own step. Half
 *  the autosave delay, so a merged run is still one write. */
export const COALESCE_MS = 700;

export interface UndoStack {
  past: readonly Architecture[];
  present: Architecture;
  future: readonly Architecture[];
  /** `present`'s shape, kept so a push does not recompute the old one. */
  shape: string;
  /** When `present` was written, in ms. */
  stamp: number;
}

/* Everything a structural edit changes and nothing a text edit does. Names,
 * roles, protocols and colours are absent on purpose: those are the edits that
 * arrive one keystroke at a time, and they are exactly what should merge.
 *
 * Order is part of the shape — reordering the layers or dropping a card in front
 * of another one is a move, and a move is undoable on its own. */
export function docShape(doc: Architecture): string {
  return [
    doc.layers.map(l => l.id).join(','),
    doc.groups.map(g => g.id).join(','),
    (doc.zones ?? []).map(z => `${z.id}>${z.parent ?? ''}${z.stack ? '^' : ''}`).join(','),
    doc.components
      .map(c => `${c.id}@${c.layer}/${c.group}/${c.zone ?? ''}:${(c.deps ?? []).join('+')}`)
      .join(','),
    doc.sections.map(s => s.id).join(','),
    doc.flows.map(f => f.id).join(',')
  ].join('|');
}

export function initUndo(present: Architecture): UndoStack {
  return { past: [], present, future: [], shape: docShape(present), stamp: -Infinity };
}

/** Adopt `next` as the present. Merges into the current step when the shape is
 *  unchanged and the last write was under `COALESCE_MS` ago. */
export function record(stack: UndoStack, next: Architecture, now: number): UndoStack {
  const shape = docShape(next);
  if (shape === stack.shape && now - stack.stamp < COALESCE_MS) {
    return { ...stack, present: next, future: [], stamp: now };
  }
  return {
    past: [...stack.past, stack.present].slice(-UNDO_LIMIT),
    present: next,
    future: [],
    shape,
    stamp: now
  };
}

export const canUndo = (stack: UndoStack) => stack.past.length > 0;
export const canRedo = (stack: UndoStack) => stack.future.length > 0;

/** Say what just happened. The step back is offered unless `undoable` is false,
 *  which is how a refusal ("keep at least one layer") says its piece without
 *  putting an Undo next to an edit that never landed. */
export type Notify = (text: string, undoable?: boolean) => void;

/* Both moves stamp `-Infinity` rather than the clock: the first edit after a
 * step through the stack must never merge into the state it just restored, or
 * undoing a rename and typing again would silently swallow the undo. */

export function undo(stack: UndoStack): UndoStack {
  if (!stack.past.length) return stack;
  const present = stack.past[stack.past.length - 1];
  return {
    past: stack.past.slice(0, -1),
    present,
    future: [stack.present, ...stack.future].slice(0, UNDO_LIMIT),
    shape: docShape(present),
    stamp: -Infinity
  };
}

export function redo(stack: UndoStack): UndoStack {
  if (!stack.future.length) return stack;
  const [present, ...rest] = stack.future;
  return {
    past: [...stack.past, stack.present].slice(-UNDO_LIMIT),
    present,
    future: rest,
    shape: docShape(present),
    stamp: -Infinity
  };
}

/* Whether a keystroke belongs to the document or to the field it was typed in.
 *
 * A text input has its own undo and the browser's is better than ours inside it
 * — it restores the caret. The canvas shortcut has to stand back for that, and
 * the check is by element rather than by focus ring because a `contenteditable`
 * is not an input and still owns its own history. */
export function typingInField(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.closest !== 'function') return false;
  return !!el.closest('input, textarea, select, [contenteditable="true"]');
}
