import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  anchoredScroll, clampZoom, fitLadder, zoomStyle, ZOOM_MAX, ZOOM_MIN, ZOOM_STEP
} from './viewport';

test('a factor is held between the two ends of the range', () => {
  assert.equal(clampZoom(5), ZOOM_MAX);
  assert.equal(clampZoom(0.01), ZOOM_MIN);
  assert.equal(clampZoom(1), 1);
});

test('stepping does not drift off whole percents', () => {
  /* 0.7 + 0.1 is 0.7999999999999999 in binary floating point, which would print
   * as 80 % and still compare unequal to 0.8 — so the button would go dead. */
  let z = 1;
  for (let i = 0; i < 6; i++) z = clampZoom(z - ZOOM_STEP);
  assert.equal(z, 0.4);
  for (let i = 0; i < 6; i++) z = clampZoom(z + ZOOM_STEP);
  assert.equal(z, 1);
});

test('a broken factor falls back to 100 % rather than to a blank sheet', () => {
  assert.equal(clampZoom(NaN), 1);
  assert.equal(clampZoom(Infinity), 1);
});

test('100 % emits no style at all, so an unzoomed canvas is untouched', () => {
  assert.deepEqual(zoomStyle(1, true), {});
  assert.deepEqual(zoomStyle(1, false), {});
});

test('below 100 % scales the layout, above it magnifies the paint', () => {
  assert.deepEqual(zoomStyle(0.7, true), { zoom: '0.7' });
  assert.deepEqual(zoomStyle(1.5, true), { transform: 'scale(1.5)', transformOrigin: 'top left' });
});

test('without the zoom property the transform does both directions', () => {
  assert.deepEqual(zoomStyle(0.7, false), { transform: 'scale(0.7)', transformOrigin: 'top left' });
});

test('Fit walks down from 100 % and stops at the floor', () => {
  const ladder = fitLadder();
  assert.equal(ladder[0], 1);
  assert.equal(ladder[ladder.length - 1], ZOOM_MIN);
  for (let i = 1; i < ladder.length; i++) assert.ok(ladder[i] < ladder[i - 1]);
});

test('zooming about a point leaves that point where it was', () => {
  /* The pixel under the cursor is at sheet coordinate (0 + 100)/1 = 100. At 2×
   * it sits at 200, so the frame has to scroll to 100 to keep it under the
   * cursor at offset 100. */
  const next = anchoredScroll(1, 2, { left: 0, top: 0 }, { x: 100, y: 50 });
  assert.deepEqual(next, { left: 100, top: 50 });
});

test('zooming out never asks the frame to scroll to a negative offset', () => {
  const next = anchoredScroll(1, 0.5, { left: 0, top: 0 }, { x: 100, y: 100 });
  assert.deepEqual(next, { left: 0, top: 0 });
});

test('the editor and the viewer agree on the range and the step', () => {
  /* Two surfaces scaling the same sheet. A viewer at 40 % and an editor at 25 %
   * would make "what it looks like at Fit" a different drawing in each. */
  const engine = readFileSync(join(import.meta.dirname, '..', '..', 'viewer', 'engine.js'), 'utf8');
  const line = engine.match(/const ZMIN\s*=\s*([\d.]+),\s*ZMAX\s*=\s*([\d.]+),\s*ZSTEP\s*=\s*([\d.]+)/);
  assert.ok(line, 'viewer/engine.js no longer declares ZMIN/ZMAX/ZSTEP on one line');
  assert.equal(Number(line[1]), ZOOM_MIN);
  assert.equal(Number(line[2]), ZOOM_MAX);
  assert.equal(Number(line[3]), ZOOM_STEP);
});
