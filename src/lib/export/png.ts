/* Putting the diagram back inside its own picture.
 *
 * A PNG of an architecture is the format everyone actually forwards — it goes in
 * the slide, in the ticket, in the chat — and it is also the format where the
 * drawing dies: the next person to need a change gets an image and redraws it by
 * hand. draw.io solved this years ago by hiding the source in the file. A PNG is
 * a signature followed by a chain of length-prefixed chunks, decoders skip the
 * ones they do not recognise, and a `tEXt` chunk is exactly a keyword and a
 * string. So the whole `<mxfile>` rides along in one, under the keyword
 * `mxfile`, URI-encoded — which is the form draw.io's own reader expects, and
 * the reason it can reopen an image as an editable diagram.
 *
 * The result stays a perfectly ordinary PNG. Every viewer that has ever existed
 * ignores the chunk; draw.io opens it and finds the drawing.
 *
 * ------------------------------------------------------------------- why here
 *
 * The bytes are assembled in the browser — the canvas that rasterises the SVG is
 * the only rasteriser this codebase has — but none of *this* is browser work. It
 * is a CRC and some offset arithmetic, which is the half worth testing, so it
 * lives here as plain functions over `Uint8Array` and the component keeps the
 * canvas.
 */

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** draw.io's keyword. Its reader checks for `mxfile\0` at the head of a text
 *  chunk's data and hands what follows to `decodeURIComponent`. */
export const DRAWIO_KEYWORD = 'mxfile';

/** The XML as a text chunk's payload.
 *
 *  `tEXt` is a Latin-1 field and an `<mxfile>` holds component names in whatever
 *  the author typed, so the encoding is not decoration — it is what makes an
 *  architecture with "Données" in it survive the trip. It is also pure ASCII
 *  afterwards, which is what keeps the chunk inside the spec. */
export const drawioChunkText = (xml: string): string => encodeURIComponent(xml);

/* ------------------------------------------------------------------- the crc */

let table: Uint32Array | null = null;

/** The PNG CRC-32 (reflected, polynomial 0xEDB88320), built once on first use.
 *
 *  Every chunk carries one over its type and its data, and a decoder that finds
 *  a bad one is entitled to reject the file — so an appended chunk with a
 *  plausible-looking wrong CRC is worse than no chunk at all. */
export function crc32(bytes: Uint8Array): number {
  if (!table) {
    table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = table[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/* ---------------------------------------------------------------- the chunks */

export const isPng = (bytes: Uint8Array): boolean =>
  bytes.length > 8 && SIGNATURE.every((b, i) => bytes[i] === b);

/** One `tEXt` chunk: `[length][type][keyword\0text][crc]`, big-endian.
 *
 *  Both halves are Latin-1 by the spec. The keyword is ours and the text is
 *  URI-encoded, so both are ASCII in practice; anything outside the range is a
 *  caller error rather than something to silently mangle. */
export function textChunk(keyword: string, text: string): Uint8Array {
  if (!keyword.length || keyword.length > 79) {
    throw new Error(`a PNG text keyword is 1 to 79 characters, got ${keyword.length}`);
  }
  const key = latin1(keyword, 'keyword');
  const body = latin1(text, 'text');
  const data = new Uint8Array(key.length + 1 + body.length);
  data.set(key, 0);
  data[key.length] = 0;
  data.set(body, key.length + 1);

  const type = latin1('tEXt', 'type');
  const chunk = new Uint8Array(12 + data.length);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, data.length);
  chunk.set(type, 4);
  chunk.set(data, 8);
  const crcOver = new Uint8Array(4 + data.length);
  crcOver.set(type, 0);
  crcOver.set(data, 4);
  view.setUint32(8 + data.length, crc32(crcOver));
  return chunk;
}

/** The same PNG with one more text chunk, placed just before `IEND`.
 *
 *  Walked rather than assumed: `IEND` is the last chunk in every well-formed
 *  file, but "the last twelve bytes" is a guess about a format that explicitly
 *  allows chunks a reader does not know, and this function exists precisely
 *  because such chunks are allowed. Throws on anything that is not a PNG — a
 *  silently unmodified image would be a download that quietly lost its diagram.
 *
 *  The return type names its buffer, which is not pedantry: a bare `Uint8Array`
 *  widens to `ArrayBufferLike`, and `Blob` — the only consumer these bytes ever
 *  have — will not take one. Saying it here removes a cast from every caller. */
export function withTextChunk(
  png: Uint8Array, keyword: string, text: string
): Uint8Array<ArrayBuffer> {
  if (!isPng(png)) throw new Error('not a PNG');
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);

  let at = 8;
  let end = -1;
  while (at + 8 <= png.length) {
    const length = view.getUint32(at);
    const type = String.fromCharCode(png[at + 4], png[at + 5], png[at + 6], png[at + 7]);
    if (type === 'IEND') { end = at; break; }
    at += 12 + length;
  }
  if (end < 0) throw new Error('PNG has no IEND chunk');

  const chunk = textChunk(keyword, text);
  const out = new Uint8Array(png.length + chunk.length);
  out.set(png.subarray(0, end), 0);
  out.set(chunk, end);
  out.set(png.subarray(end), end + chunk.length);
  return out;
}

/** A PNG carrying its own draw.io source. */
export const withDrawioXml = (png: Uint8Array, xml: string): Uint8Array<ArrayBuffer> =>
  withTextChunk(png, DRAWIO_KEYWORD, drawioChunkText(xml));

/** Read back what `withTextChunk` wrote — the round trip the tests turn on, and
 *  the same walk draw.io does. Returns null when the keyword is not there. */
export function readTextChunk(png: Uint8Array, keyword: string): string | null {
  if (!isPng(png)) return null;
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  let at = 8;
  while (at + 8 <= png.length) {
    const length = view.getUint32(at);
    const type = String.fromCharCode(png[at + 4], png[at + 5], png[at + 6], png[at + 7]);
    if (type === 'IEND') return null;
    if (type === 'tEXt') {
      const data = png.subarray(at + 8, at + 8 + length);
      const nul = data.indexOf(0);
      if (nul > 0 && latin1String(data.subarray(0, nul)) === keyword) {
        return latin1String(data.subarray(nul + 1));
      }
    }
    at += 12 + length;
  }
  return null;
}

/** Bytes back to a string, a window at a time.
 *
 *  `String.fromCharCode(...bytes)` reads better and blows the argument limit on
 *  a real payload — an embedded architecture is tens of kilobytes, and the
 *  ceiling is somewhere around a hundred thousand arguments depending on the
 *  engine. A file that decodes on the machine that wrote it and throws on a
 *  bigger diagram is the worst kind of working. */
function latin1String(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    out += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return out;
}

function latin1(s: string, what: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code > 0xff) throw new Error(`a PNG ${what} is Latin-1; "${s[i]}" is not`);
    out[i] = code;
  }
  return out;
}
