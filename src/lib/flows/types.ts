/* Flow patterns — the shapes shared by the shipped catalogue and the personal
 * library.
 *
 * A flow step points at a component *by id*, and ids are local to a document.
 * So a reusable flow cannot carry its bindings: it carries a description of the
 * component each step is looking for, and the binding is decided again at
 * insertion time against whatever the target document actually contains. That
 * one constraint is why this file exists at all, and why `FlowHint` is the
 * central type rather than an afterthought.
 *
 * This module is client-safe on purpose — the mirror of `templates/types.ts`.
 * The catalogue bodies live in `catalog.ts` and never reach the browser; what
 * crosses the wire is `FlowPattern`, already resolved to one language.
 */

import type { L10n } from '../templates/types';

/* -------------------------------------------------------------------- hints */

/**
 * How a template step recognises the component that should carry it.
 *
 * Every field is a *signal*, not a rule. The scorer adds them up and the user
 * reviews the result before anything is written, so an over-eager hint costs a
 * click and never a wrong document. That asymmetry is what justifies `name`
 * being the only strong weight: layer vocabularies vary from one project to the
 * next — a document built from the `rag` template has no layer called
 * "services" — so a hint leaning on them would be confidently wrong more often
 * than it would be right.
 */
export interface FlowHint {
  /** Words expected in the component's name or id. The decisive signal. */
  name?: string[];
  /** Words expected in tech, role, badge or features. Wider, weaker. */
  tech?: string[];
  /** Layer ids that usually host this role. Tiebreak only — see above. */
  layers?: string[];
  /** Icon keys that usually carry this role. Tiebreak only. */
  icons?: string[];
  /** Disqualifiers: a component matching one of these is never proposed. */
  avoid?: string[];
}

/* ---------------------------------------------------- authoring (server-side) */

export interface FlowTemplateStep {
  /** Stable within the pattern. React keys and tests lean on it. */
  key: string;
  title: L10n;
  description?: L10n;
  hint: FlowHint;
}

export interface FlowTemplate {
  id: string;
  icon: string;
  name: L10n;
  /** One line, shown on the card. */
  tagline: L10n;
  /** Carried onto the created flow verbatim. */
  sub?: L10n;
  note?: L10n;
  steps: FlowTemplateStep[];
}

/* ------------------------------------------------------- wire (single language) */

export interface FlowPatternStep {
  key: string;
  title: string;
  description?: string;
  hint: FlowHint;
}

/**
 * What the picker renders and what the insertion consumes. Catalogue entries
 * and library entries land on this same shape deliberately: one modal, one
 * scorer, one insertion path, and `source` is read only to decide whether the
 * card gets a delete button.
 */
export interface FlowPattern {
  id: string;
  source: 'catalog' | 'library';
  icon: string;
  name: string;
  tagline: string;
  sub?: string;
  note?: string;
  steps: FlowPatternStep[];
}

/** A pattern the user saved, plus where it came from. */
export interface LibraryPattern extends FlowPattern {
  source: 'library';
  /** ISO timestamp. The picker lists newest first. */
  savedAt: string;
  /** The project it was saved from — shown as "· Acme delivery" on the card. */
  from?: string;
}

/* ------------------------------------------------------------------- limits */

/* The library shares one `settings` row with everything else in that table, so
 * it is capped on three axes rather than trusted. The numbers are generous for
 * a human and small for a database. */
export const LIBRARY_MAX_ENTRIES = 40;
export const LIBRARY_MAX_BYTES = 32_000;
export const LIBRARY_MAX_STEPS = 24;
export const LIBRARY_MAX_DESC = 400;
