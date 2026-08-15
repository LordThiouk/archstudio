/* The limits that hold whatever the provider is.
 *
 * Everything vendor-specific — which model, which endpoint, which key, what a
 * token costs — is operator configuration and lives in the database, set from
 * the settings dialog. See `src/lib/settings.ts`. What stays here is what the
 * studio itself decides: how much file it will read, and how long an answer it
 * will wait for. */

/** Thinking plus the answer. A 60-component document runs to ~25k. */
export const AI_MAX_TOKENS = 48_000;

/** What the analysis accepts, and how each kind reaches the model. */
export const ACCEPTED_TYPES: { ext: string; mime: string; kind: 'pdf' | 'text' }[] = [
  { ext: '.pdf', mime: 'application/pdf', kind: 'pdf' },
  { ext: '.md', mime: 'text/markdown', kind: 'text' },
  { ext: '.markdown', mime: 'text/markdown', kind: 'text' },
  { ext: '.txt', mime: 'text/plain', kind: 'text' },
  { ext: '.adoc', mime: 'text/plain', kind: 'text' },
  { ext: '.rst', mime: 'text/plain', kind: 'text' }
];

/** The picker's filter, narrowed when the chosen provider cannot read a PDF. */
export const acceptAttr = (supportsPdf: boolean): string =>
  ACCEPTED_TYPES.filter(t => supportsPdf || t.kind !== 'pdf').map(t => t.ext).join(',');

/* Anthropic caps a request at 32 MB and a PDF at 600 pages; other providers
 * are stricter still. This sits under all of them: a design document that does
 * not fit in 12 MB is a scan, and a scan is a worse input than the text it was
 * made from. Enforced server-side — the browser check is a courtesy. */
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
