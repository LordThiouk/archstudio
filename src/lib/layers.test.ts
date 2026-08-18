import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { LAYER_TINTS, layerTintEnabled, layerTintVar } from './layers';

test('the ramp maps a band index onto a token, one per band', () => {
  assert.equal(layerTintVar(0), 'var(--lt1)');
  assert.equal(layerTintVar(5), 'var(--lt6)');
});

test('a seventh band restarts the ramp rather than asking for a token that does not exist', () => {
  /* `var(--lt7)` resolves to nothing and the rule falls back to the neutral —
   * so a seventh layer would silently lose its tint instead of cycling. */
  assert.equal(layerTintVar(6), 'var(--lt1)');
  assert.equal(layerTintVar(13), 'var(--lt2)');
});

test('a negative index cannot produce var(--lt0) or a fractional token', () => {
  /* JavaScript's % keeps the sign of the dividend, so a plain modulo would emit
   * `var(--lt-1)` here — valid CSS syntax, resolving to nothing. */
  assert.equal(layerTintVar(-1), 'var(--lt6)');
  assert.equal(layerTintVar(-7), 'var(--lt6)');
  for (let i = -20; i < 40; i++) {
    assert.match(layerTintVar(i), /^var\(--lt[1-6]\)$/, `index ${i} produced ${layerTintVar(i)}`);
  }
});

test('tints are on unless the document says otherwise', () => {
  assert.equal(layerTintEnabled(undefined), true);
  assert.equal(layerTintEnabled({}), true);
  assert.equal(layerTintEnabled({ layerTint: true }), true);
  assert.equal(layerTintEnabled({ layerTint: false }), false);
});

test('all three stylesheets declare the whole ramp, in both themes', () => {
  /* The renderers emit only an index; a stylesheet missing `--lt5` would drop
   * the fifth band's tint on that surface alone — the kind of gap that only
   * shows on a document with five layers, printed. */
  const sheets = [
    'viewer/style.css',
    'src/app/globals.css',
    'src/app/projects/[id]/document/document.css'
  ];
  for (const sheet of sheets) {
    const text = readFileSync(join(import.meta.dirname, '..', '..', sheet), 'utf8');
    for (let i = 1; i <= LAYER_TINTS; i++) {
      const declarations = text.match(new RegExp(`--lt${i}\\s*:`, 'g')) ?? [];
      /* Two: the light block and the dark one. The printed sheet has no dark
       * theme, so one is right there. */
      const expected = sheet.includes('document.css') ? 1 : 2;
      assert.equal(declarations.length, expected,
        `${sheet} declares --lt${i} ${declarations.length} time(s), expected ${expected}`);
    }
  }
});
