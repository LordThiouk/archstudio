import fs from 'node:fs';
import path from 'node:path';
import type { Architecture } from './types';

/* The viewer is the original standalone engine, kept verbatim in /viewer.
 * The studio never re-implements rendering: what you preview in an iframe is
 * byte-for-byte what you download and what you would host. One renderer, one
 * behaviour, no drift. */

const VIEWER_DIR = path.join(process.cwd(), 'viewer');
const FONT_DIR = path.join(process.cwd(), 'public', 'fonts');

/* Archivo and Space Mono, inlined. "No external requests" has to include the
 * typography or the identity is the first thing to fall off the page when the
 * file is opened on a machine that does not have the faces installed — which
 * is every machine. Six subsets, base64, about 140 KB: the price of the export
 * looking like the studio wherever it lands.
 *
 * The unicode-ranges are Google's own; latin covers French and the Western
 * European accents, latin-ext the Central European ones. Both are shipped, so
 * a document does not switch typeface mid-word. */
const FONT_FACES: { file: string; family: string; weight: string; subset: 'latin' | 'latin-ext' }[] = [
  { file: 'archivo-latin.woff2', family: 'Archivo', weight: '400 800', subset: 'latin' },
  { file: 'archivo-latin-ext.woff2', family: 'Archivo', weight: '400 800', subset: 'latin-ext' },
  { file: 'space-mono-400-latin.woff2', family: 'Space Mono', weight: '400', subset: 'latin' },
  { file: 'space-mono-400-latin-ext.woff2', family: 'Space Mono', weight: '400', subset: 'latin-ext' },
  { file: 'space-mono-700-latin.woff2', family: 'Space Mono', weight: '700', subset: 'latin' },
  { file: 'space-mono-700-latin-ext.woff2', family: 'Space Mono', weight: '700', subset: 'latin-ext' }
];

const UNICODE_RANGE = {
  latin:
    'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, ' +
    'U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
  'latin-ext':
    'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, ' +
    'U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, ' +
    'U+2C60-2C7F, U+A720-A7FF'
} as const;

let fontCache: { css: string; mtime: number } | null = null;

/** The `@font-face` rules with every face inlined as a data URI.
 *
 *  Exported because the HTML is no longer the only export that has to carry its
 *  own typography: an SVG is read by whatever opens it, and a PNG is rasterised
 *  from that SVG inside an `<img>`, where an external font request is not merely
 *  slow — it is blocked. Same faces, same reason, one place. */
export function inlineFontCss(): string {
  const mtime = Math.max(...FONT_FACES.map(f => fs.statSync(path.join(FONT_DIR, f.file)).mtimeMs));
  if (!fontCache || fontCache.mtime !== mtime) {
    fontCache = { css: fontCss(), mtime };
  }
  return fontCache.css;
}

function fontCss(): string {
  return FONT_FACES.map(f => {
    const b64 = fs.readFileSync(path.join(FONT_DIR, f.file)).toString('base64');
    return `@font-face{font-family:'${f.family}';font-style:normal;font-weight:${f.weight};`
      + `font-display:swap;src:url(data:font/woff2;base64,${b64}) format('woff2');`
      + `unicode-range:${UNICODE_RANGE[f.subset]}}`;
  }).join('\n');
}

let cache: { css: string; js: string; mtime: number } | null = null;

function viewerAssets() {
  const cssPath = path.join(VIEWER_DIR, 'style.css');
  const jsPath = path.join(VIEWER_DIR, 'engine.js');
  const fontMtimes = FONT_FACES.map(f => fs.statSync(path.join(FONT_DIR, f.file)).mtimeMs);
  const mtime = Math.max(fs.statSync(cssPath).mtimeMs, fs.statSync(jsPath).mtimeMs, ...fontMtimes);
  if (!cache || cache.mtime !== mtime) {
    cache = {
      css: `${fontCss()}\n\n${fs.readFileSync(cssPath, 'utf8')}`,
      js: fs.readFileSync(jsPath, 'utf8'),
      mtime
    };
  }
  return cache;
}

/* The mark, as a favicon: the same three shapes, with the open circle filled
 * flat instead of stroked. At 16 px a 4-unit ring closes up into a smudge, so
 * what survives is the contrast between full and empty — which is the whole
 * point of the sign. Kept in sync by hand with src/components/Brand.tsx. */
const FAVICON =
  "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'>"
  + "<rect width='192' height='192' fill='%230B1B2B'/>"
  + "<path d='M32 96H160' stroke='%23FFFFFF' stroke-width='12'/>"
  + "<circle cx='48' cy='96' r='30' fill='%2300E5FF'/>"
  + "<circle cx='146' cy='96' r='26' fill='%23FFFFFF'/></svg>";

/** `</script>` inside the JSON payload would close the tag early. */
const safeJson = (doc: Architecture) =>
  JSON.stringify(doc, null, 2).replace(/<\/(script)/gi, '<\\/$1');

export function buildStandaloneHtml(doc: Architecture): string {
  const { css, js } = viewerAssets();
  const lang = doc.meta?.lang === 'fr' ? 'fr' : 'en';
  const theme = doc.ui?.defaultTheme === 'dark' ? 'dark' : 'light';
  const title = [doc.meta?.name, doc.meta?.tagline || 'Architecture Explorer']
    .filter(Boolean).join(' — ');

  return `<!DOCTYPE html>
<html lang="${lang}" data-theme="${theme}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="generator" content="Architecture Studio">
<link rel="icon" href="${FAVICON}">
<style>
${css}
</style>
</head>
<body>

<header>
  <div class="hwrap">
    <div class="brand">
      <div class="logo" id="logo"></div>
      <div><b id="brandName">…</b><span id="brandSub"></span></div>
    </div>
    <div class="spacer"></div>
    <div class="search">
      <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <input id="q" type="search" autocomplete="off">
    </div>
    <button class="iconbtn" id="themeBtn" aria-label="Theme">
      <svg id="themeIcon" viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
    </button>
    <button class="iconbtn" id="printBtn" aria-label="Print">
      <svg viewBox="0 0 24 24"><path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 15h12v6H6z"/></svg>
    </button>
  </div>
  <nav class="tabs" id="tabs" role="tablist"></nav>
</header>

<main id="main"></main>

<div class="scrim" id="scrim"></div>
<aside class="drawer" id="drawer" role="dialog" aria-modal="true">
  <div class="dh" id="dh"></div>
  <div class="db" id="db"></div>
</aside>

<script>
window.ARCHITECTURE = ${safeJson(doc)};
</script>
<script>
${js}
</script>
</body>
</html>
`;
}

/** The same document as a drop-in data file for the standalone viewer repo. */
export function buildDataFile(doc: Architecture): string {
  return `/* Generated by Architecture Studio — ${new Date().toISOString().slice(0, 10)} */\n\n`
    + `window.ARCHITECTURE = ${safeJson(doc)};\n`;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function safeFilename(name: string, ext: string) {
  const base = (name || 'architecture')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9-_ ]/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'architecture';
  return `${base}.${ext}`;
}
