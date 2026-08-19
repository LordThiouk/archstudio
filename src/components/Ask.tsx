'use client';

/* The two questions the browser answers badly.
 *
 * `confirm()` and `prompt()` are not merely ugly. They block the page, they
 * cannot be styled or read in the document's own voice, they truncate anything
 * longer than a sentence, they are suppressible by the browser after a few
 * uses, and `prompt()` returns exactly one unvalidated string — which is why
 * every creation in this app used to arrive half-built and need a second visit
 * to a rail to finish. They also cannot say *which* answer is the dangerous one.
 *
 * This is the same two questions, asked in the studio's own frame. The hook
 * hands back a promise so a call site stays one line and keeps the shape it had:
 *
 *   if (!await ask.confirm({ title: 'Delete "Payments"?' })) return;
 *   const name = await ask.text({ title: 'New folder', label: 'Name' });
 *
 * A promise rather than a callback because that is what `confirm()` was: the
 * next statement is the "yes" branch. Nothing else about the surrounding code
 * has to move.
 *
 * When to reach for it: an action that leaves the document — deleting a project,
 * a folder, a version, a shared pattern. Anything that only edits the document
 * should not ask at all. The editor keeps an undo stack and a notice bar, and a
 * confirm there taxes every deliberate edit to insure against the rare mistaken
 * one. See `NoticeBar` in Editor.tsx. */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface ConfirmRequest {
  title: string;
  /** What the reader needs before answering. Prose, not a repeat of the title. */
  body?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Draws the confirming button as a deletion. Say so when it is one. */
  danger?: boolean;
}

export interface TextRequest {
  title: string;
  body?: React.ReactNode;
  label: string;
  value?: string;
  placeholder?: string;
  confirmLabel?: string;
  /** An empty answer is a real answer — clearing a version's name is how it
   *  becomes an ordinary snapshot again. Off by default: everywhere else an
   *  empty name is a cancel, not a thing called "". */
  allowEmpty?: boolean;
}

type Pending =
  | { kind: 'confirm'; req: ConfirmRequest }
  | { kind: 'text'; req: TextRequest };

export interface Ask {
  /** Render this anywhere inside the component that owns the hook — it portals
   *  itself to the body, so where it sits in the markup does not matter. */
  dialog: React.ReactNode;
  confirm: (req: ConfirmRequest) => Promise<boolean>;
  /** The answer, or null when cancelled — the same distinction `prompt()` made
   *  between "" and null, and the reason `allowEmpty` exists. */
  text: (req: TextRequest) => Promise<string | null>;
}

export function useAsk(): Ask {
  const [pending, setPending] = useState<Pending | null>(null);
  /* The resolver lives in a ref rather than beside the request in state: calling
   * it from inside a state updater would fire twice under StrictMode's double
   * invoke, and a settled promise swallowing the second call is luck, not
   * design. */
  const resolver = useRef<((value: never) => void) | null>(null);

  const open = useCallback(<T,>(next: Pending) => new Promise<T>(resolve => {
    /* A question still on screen is answered "cancelled" rather than left
     * hanging: an unresolved promise is a click that never finishes. */
    resolver.current?.(null as never);
    resolver.current = resolve as (value: never) => void;
    setPending(next);
  }), []);

  const settle = useCallback((value: boolean | string | null) => {
    const resolve = resolver.current;
    resolver.current = null;
    setPending(null);
    resolve?.(value as never);
  }, []);

  const confirm = useCallback(
    (req: ConfirmRequest) => open<boolean>({ kind: 'confirm', req }), [open]);
  const text = useCallback(
    (req: TextRequest) => open<string | null>({ kind: 'text', req }), [open]);

  /* Portalled to the body, and not as a nicety.
   *
   * A dialog is `position: fixed`, which sounds like it escapes its ancestors —
   * it does not. An ancestor with `opacity` below 1, a `transform`, or a `filter`
   * becomes the containing block *and* the compositing group for everything
   * inside it. The project card's ⋯ menu is `opacity: 0` until the card is
   * hovered, so a confirm rendered under it was painted at zero opacity the
   * moment the pointer left the card to reach the dialog: still there, still
   * clickable, completely invisible. The body has no such ancestor, and putting
   * every dialog there means no call site has to know which of its parents is
   * animated.
   *
   * `pending` is null on the first render, so there is no portal during SSR and
   * nothing to mismatch at hydration. */
  let dialog: React.ReactNode = null;
  if (pending && typeof document !== 'undefined') {
    dialog = createPortal(
      pending.kind === 'confirm'
        ? <ConfirmDialog req={pending.req} onSettle={settle} />
        : <TextDialog req={pending.req} onSettle={settle} />,
      document.body
    );
  }

  return { dialog, confirm, text };
}

/* ------------------------------------------------------------------- shells */

/** Escape and the scrim both cancel, on both dialogs — the two ways out anyone
 *  tries, and the two `confirm()` already had. */
function useDismiss(onCancel: () => void) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onCancel();
    };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onCancel]);
}

function ConfirmDialog({ req, onSettle }: {
  req: ConfirmRequest; onSettle: (v: boolean) => void;
}) {
  const go = useRef<HTMLButtonElement>(null);
  useDismiss(useCallback(() => onSettle(false), [onSettle]));
  /* Focus lands on the confirming button because that is the answer the reader
   * came for; Escape and the scrim are the other one, and both are one key or
   * one click away. */
  useEffect(() => { go.current?.focus(); }, []);

  return (
    /* Stopped rather than merely handled: a React portal still bubbles its
       events through the React tree, so without this a click on this scrim
       would also reach the panel that asked the question and close it. */
    <div className="modal-scrim" onPointerDown={e => e.stopPropagation()}
      onClick={e => { e.stopPropagation(); onSettle(false); }}>
      <div className="modal askmodal" role="alertdialog" aria-label={req.title}
        onClick={e => e.stopPropagation()}>
        <h2>{req.title}</h2>
        {req.body && <p className="lede">{req.body}</p>}
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={() => onSettle(false)}>
            {req.cancelLabel ?? 'Cancel'}
          </button>
          <button type="button" ref={go}
            className={`btn ${req.danger ? 'danger' : 'primary'}`}
            onClick={() => onSettle(true)}>
            {req.confirmLabel ?? (req.danger ? 'Delete' : 'Continue')}
          </button>
        </div>
      </div>
    </div>
  );
}

function TextDialog({ req, onSettle }: {
  req: TextRequest; onSettle: (v: string | null) => void;
}) {
  const [value, setValue] = useState(req.value ?? '');
  const field = useRef<HTMLInputElement>(null);
  useDismiss(useCallback(() => onSettle(null), [onSettle]));
  useEffect(() => { field.current?.select(); }, []);

  const ok = req.allowEmpty || !!value.trim();
  const submit = () => {
    if (!ok) { field.current?.focus(); return; }
    onSettle(value.trim());
  };

  return (
    <div className="modal-scrim" onPointerDown={e => e.stopPropagation()}
      onClick={e => { e.stopPropagation(); onSettle(null); }}>
      <div className="modal askmodal" role="dialog" aria-label={req.title}
        onClick={e => e.stopPropagation()}>
        <h2>{req.title}</h2>
        {req.body && <p className="lede">{req.body}</p>}
        <label className="field"><span>{req.label}</span>
          <input className="input" ref={field} value={value} placeholder={req.placeholder}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }} />
        </label>
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={() => onSettle(null)}>Cancel</button>
          <button type="button" className="btn primary" onClick={submit} disabled={!ok}>
            {req.confirmLabel ?? 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
