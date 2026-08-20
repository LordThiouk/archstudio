import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { normalizeArchitecture } from '../defaults';
import { buildDrawioXml } from './drawio';
import {
  DRAWIO_KEYWORD, crc32, drawioChunkText, isPng, readTextChunk, textChunk,
  withDrawioXml, withTextChunk
} from './png';

/* The smallest legal PNG: signature, IHDR, one IDAT, IEND. Handmade rather than
 * fetched, because what is under test is the chunk arithmetic and a real image
 * would only make the fixture heavier. */
function tinyPng(): Uint8Array {
  const chunk = (type: string, data: number[]) => {
    const body = [...type].map(c => c.charCodeAt(0)).concat(data);
    const out = new Uint8Array(8 + data.length + 4);
    new DataView(out.buffer).setUint32(0, data.length);
    out.set(body, 4);
    new DataView(out.buffer).setUint32(8 + data.length, crc32(new Uint8Array(body)));
    return out;
  };
  const ihdr = chunk('IHDR', [0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0]);
  const idat = chunk('IDAT', [0x78, 0x9c, 0x63, 0x00, 0x01]);
  const iend = chunk('IEND', []);
  const out = new Uint8Array(8 + ihdr.length + idat.length + iend.length);
  out.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  out.set(ihdr, 8);
  out.set(idat, 8 + ihdr.length);
  out.set(iend, 8 + ihdr.length + idat.length);
  return out;
}

test('the CRC is the one every PNG decoder checks', () => {
  /* The two published check values for CRC-32/ISO-HDLC, which is what PNG uses.
   * A decoder that disagrees with this table rejects the file outright. */
  assert.equal(crc32(new Uint8Array([...'123456789'].map(c => c.charCodeAt(0)))), 0xcbf43926);
  assert.equal(crc32(new Uint8Array(0)), 0);
});

test('a text chunk is a length, a type, a keyword, a NUL and a CRC', () => {
  const chunk = textChunk('mxfile', 'abc');
  const view = new DataView(chunk.buffer);
  assert.equal(view.getUint32(0), 'mxfile'.length + 1 + 3);
  assert.equal(String.fromCharCode(...chunk.subarray(4, 8)), 'tEXt');
  assert.equal(chunk[8 + 'mxfile'.length], 0, 'the keyword is NUL-terminated');
  assert.equal(view.getUint32(chunk.length - 4), crc32(chunk.subarray(4, chunk.length - 4)));
});

test('a keyword outside the spec is refused rather than silently truncated', () => {
  assert.throws(() => textChunk('', 'x'), /1 to 79/);
  assert.throws(() => textChunk('k'.repeat(80), 'x'), /1 to 79/);
  /* "é" is legal — `tEXt` is Latin-1, not ASCII. What is not is anything above
   *  U+00FF, and the payload this module writes is URI-encoded precisely so no
   *  such character ever reaches here. */
  assert.doesNotThrow(() => textChunk('mxfile', 'données'));
  assert.throws(() => textChunk('mxfile', '日本'), /Latin-1/);
});

test('the chunk goes before IEND, and the image is otherwise byte-for-byte itself', () => {
  const png = tinyPng();
  const out = withTextChunk(png, 'mxfile', 'abc');

  assert.ok(isPng(out));
  assert.equal(out.length, png.length + textChunk('mxfile', 'abc').length);
  /* Everything up to IEND is untouched, and IEND is still last: a PNG whose
   * final chunk is not IEND is a file some decoders stop reading early. */
  const iendAt = out.length - 12;
  assert.equal(String.fromCharCode(...out.subarray(iendAt + 4, iendAt + 8)), 'IEND');
  assert.deepEqual([...out.subarray(0, png.length - 12)], [...png.subarray(0, png.length - 12)]);
});

test('what went in comes back out', () => {
  const out = withTextChunk(tinyPng(), 'mxfile', 'hello');
  assert.equal(readTextChunk(out, 'mxfile'), 'hello');
  assert.equal(readTextChunk(out, 'other'), null);
});

test('two chunks can coexist — the walk does not assume it is the only one', () => {
  const once = withTextChunk(tinyPng(), 'first', 'a');
  const twice = withTextChunk(once, 'second', 'b');
  assert.equal(readTextChunk(twice, 'first'), 'a');
  assert.equal(readTextChunk(twice, 'second'), 'b');
});

test('anything that is not a PNG is refused, never silently passed through', () => {
  assert.throws(() => withTextChunk(new Uint8Array([1, 2, 3]), 'k', 'v'), /not a PNG/);
  assert.equal(isPng(new Uint8Array([1, 2, 3])), false);
});

/* The round trip that is the whole point: a picture anyone can open, that
 * draw.io opens as a diagram. This mirrors draw.io's own reader — find the
 * `mxfile` text chunk, `decodeURIComponent` it, expect an `<mxfile>`. */
test('an architecture survives a trip through a PNG and back', () => {
  const xml = buildDrawioXml(normalizeArchitecture({
    meta: { name: 'Paiement Données', lang: 'fr' },
    layers: [{ id: 'services', name: 'Services' }],
    groups: [{ id: 'core', name: 'Cœur' }],
    components: [{ id: 'api', name: 'API « façade »', group: 'core', layer: 'services' }]
  }));

  const png = withDrawioXml(tinyPng(), xml);
  assert.ok(isPng(png), 'it still has to be an ordinary PNG');

  const carried = readTextChunk(png, DRAWIO_KEYWORD);
  assert.ok(carried);
  assert.ok(!/[^\x00-\x7F]/.test(carried!), 'the chunk payload has to be plain ASCII');
  assert.equal(decodeURIComponent(carried!), xml, 'the accents have to survive');
});

test('the payload is URI-encoded, which is what draw.io reads back', () => {
  assert.equal(drawioChunkText('<mxfile a="b"/>'), encodeURIComponent('<mxfile a="b"/>'));
});
