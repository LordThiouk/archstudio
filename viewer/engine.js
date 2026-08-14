/* ============================================================================
 * Architecture Explorer — rendering engine
 * ----------------------------------------------------------------------------
 * You should not need to edit this file. Everything is driven by the object
 * exposed as `window.ARCHITECTURE` in data/architecture.js.
 * See schema/architecture.schema.json for the full contract.
 *
 * MIT licensed.
 * ========================================================================== */
(function () {
'use strict';

/* ---------------------------------------------------------------- helpers */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/* Inline markup allowed in prose fields: <b> <i> <code> <span class="mono"> */
const rich = s => String(s == null ? '' : s);
const uniq = a => [...new Set(a)];
const warn = m => console.warn('[architecture-explorer] ' + m);

/* --------------------------------------------------------------- fallback */
/* Categorical palette, validated for colour-vision deficiency on both
 * surfaces (OKLCH lightness band, chroma floor, adjacent-pair CVD ΔE ≥ 8,
 * contrast ≥ 3:1). Override per group with `color` / `colorDark`.        */
const PALETTE       = ['#BE6E52', '#8A8C34', '#1F9B82', '#4F8AC6', '#A36FAF'];
const PALETTE_DARK  = ['#E4896A', '#A9AB4A', '#39BDA0', '#67AAED', '#C68BD3'];

/* -------------------------------------------------------------- i18n */
const LABELS = {
  en: {
    searchPlaceholder: 'Search a component, a technology…',
    allScopes: 'All scopes', overview: 'Overview', architecture: 'Architecture',
    flows: 'Flows', stack: 'Tech stack', hintDiagram: 'Hover = dependencies · Click = detail sheet',
    role: 'Role', technologies: 'Technologies', responsibilities: 'Responsibilities',
    notes: 'Notes', dependsOn: 'Depends on', usedBy: 'Used by', outgoing: 'outgoing',
    incoming: 'incoming', components: 'Components', distribution: 'Component distribution',
    endpoints: 'Endpoints', prev: 'Previous', next: 'Next', play: 'Play', pause: 'Pause',
    involved: 'Components involved', allCategories: 'All categories', results: 'result',
    resultsPlural: 'results', empty: 'Nothing matches this filter.',
    infraNote: 'The bottom layer is not wired with arrows: it supports every component above it.',
    exploreScope: 'Explore this scope', dimension: 'Dimension', builtWith: 'Built with',
    layers: 'layers', technologiesN: 'Technologies', groupsN: 'Scopes'
  },
  fr: {
    searchPlaceholder: 'Rechercher un composant, une techno…',
    allScopes: 'Tous les périmètres', overview: "Vue d’ensemble", architecture: 'Architecture',
    flows: 'Flux métier', stack: 'Stack technique', hintDiagram: 'Survol = dépendances · Clic = fiche détaillée',
    role: 'Rôle', technologies: 'Technologies', responsibilities: 'Responsabilités',
    notes: 'Chantiers identifiés', dependsOn: 'Dépend de', usedBy: 'Sollicité par',
    outgoing: 'sortant', incoming: 'entrant', components: 'Composants',
    distribution: 'Répartition des composants', endpoints: 'Domaines & endpoints',
    prev: 'Précédent', next: 'Suivant', play: 'Lecture', pause: 'Pause',
    involved: 'Composants mobilisés', allCategories: 'Toutes les catégories',
    results: 'résultat', resultsPlural: 'résultats', empty: 'Aucun résultat pour ce filtre.',
    infraNote: "La dernière couche n’est pas reliée par des flèches : elle supporte l’ensemble des composants au-dessus.",
    exploreScope: 'Explorer ce périmètre', dimension: 'Dimension', builtWith: 'Propulsé par',
    layers: 'couches', technologiesN: 'Technologies', groupsN: 'Périmètres'
  }
};

/* -------------------------------------------------------------- icon set */
const ICON = {
  mobile:'<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  web:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3.5 9h17M3.5 15h17M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18"/>',
  scan:'<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M4 12h16"/>',
  server:'<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>',
  hub:'<circle cx="12" cy="12" r="3"/><path d="M12 2v7M12 15v7M2 12h7M15 12h7"/>',
  plug:'<path d="M9 2v6M15 2v6"/><path d="M6 8h12v3a6 6 0 0 1-12 0z"/><path d="M12 17v5"/>',
  users:'<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M17.5 20a6 6 0 0 0-2-4.5"/>',
  folder:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  chat:'<path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.2A8 8 0 1 1 21 12z"/><path d="M9 11h.01M12 11h.01M15 11h.01"/>',
  db:'<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  bolt:'<path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12z"/>',
  box:'<path d="M12 2.5 21 7v10l-9 4.5L3 17V7z"/><path d="M3 7l9 4.5L21 7M12 11.5V21"/>',
  chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  card:'<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6 15h4"/>',
  sms:'<path d="M4 5h16v11H9l-5 4z"/><path d="M8 10h8"/>',
  mail:'<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="m3 6.5 9 6 9-6"/>',
  bell:'<path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6"/><path d="M10.3 20a2 2 0 0 0 3.4 0"/>',
  map:'<path d="m9 4-6 2.5v14L9 18l6 2.5 6-2.5v-14L15 6.5z"/><path d="M9 4v14M15 6.5v14"/>',
  bug:'<rect x="8" y="7" width="8" height="12" rx="4"/><path d="M8 11H4M20 11h-4M8 16H4.5M20 16h-3.5M9.5 7 8 4.5M14.5 7 16 4.5"/>',
  docker:'<rect x="3" y="11" width="18" height="6" rx="1.5"/><path d="M7 11V8h3v3M13 11V8h3v3M10 8V5h3v3"/>',
  shield:'<path d="M12 2.5 20 6v6c0 5-3.4 8.4-8 9.5C7.4 20.4 4 17 4 12V6z"/><path d="m9 12 2 2 4-4"/>',
  cloud:'<path d="M6.5 18a4.5 4.5 0 0 1-.4-9A6 6 0 0 1 18 9.5a4.2 4.2 0 0 1-.5 8.5z"/>',
  cloudup:'<path d="M6.5 18a4.5 4.5 0 0 1-.4-9A6 6 0 0 1 18 9.5a4.2 4.2 0 0 1-.5 8.5z"/><path d="M12 21v-8M9 15l3-3 3 3"/>',
  git:'<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="12" r="2.5"/><path d="M6 8.5v7M8.5 6h4a3 3 0 0 1 3 3v.8"/>',
  eye:'<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  save:'<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h8V3M8 21v-6h8v6"/>',
  lock:'<rect x="4.5" y="10" width="15" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  route:'<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.5 6H15a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h6.5"/>',
  cube:'<path d="M3 8.5 12 4l9 4.5v7L12 20l-9-4.5z"/><path d="M3 8.5 12 13l9-4.5M12 13v7"/>',
  cog:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5.5l3.5 2"/>',
  flag:'<path d="M5 21V4h13l-2.5 4L18 12H5"/>',
  alert:'<path d="M12 3 2.5 20h19z"/><path d="M12 9.5v4.5M12 17h.01"/>',
  key:'<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9 2 2-2 2 2 2-3 3-2-2-2 2"/>',
  layers:'<path d="m12 3 9 4.5-9 4.5-9-4.5z"/><path d="m3 12 9 4.5L21 12M3 16.5 12 21l9-4.5"/>',
  terminal:'<rect x="2.5" y="4" width="19" height="16" rx="2"/><path d="m7 9 3 3-3 3M13 15h4"/>',
  ai:'<path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><rect x="7" y="7" width="10" height="10" rx="3"/><path d="M11 11h2v2h-2z"/>'
};
const svgIcon = k => {
  if (!k) return `<svg viewBox="0 0 24 24">${ICON.box}</svg>`;
  if (String(k).trim().startsWith('<')) return `<svg viewBox="0 0 24 24">${k}</svg>`;
  return `<svg viewBox="0 0 24 24">${ICON[k] || ICON.box}</svg>`;
};

/* ======================================================================== *
 * NORMALISATION
 * ======================================================================== */
function normalize(raw) {
  const d = JSON.parse(JSON.stringify(raw || {}));
  d.meta = d.meta || {};
  d.theme = d.theme || {};
  d.ui = d.ui || {};
  d.groups = d.groups || [];
  d.layers = d.layers || [];
  d.components = d.components || [];
  d.technologies = d.technologies || [];
  d.flows = d.flows || [];
  d.sections = d.sections || [];

  if (!d.groups.length) d.groups = [{ id: 'default', name: 'Components', short: 'Components' }];
  if (!d.layers.length) d.layers = uniq(d.components.map(c => c.layer || 'all'))
    .map(id => ({ id, name: id }));

  d.groups.forEach((g, i) => {
    g.short = g.short || g.name;
    g.color = g.color || PALETTE[i % PALETTE.length];
    g.colorDark = g.colorDark || PALETTE_DARK[i % PALETTE_DARK.length];
    g.var = '--p' + (i + 1);
  });

  const gById = Object.fromEntries(d.groups.map(g => [g.id, g]));
  const lById = Object.fromEntries(d.layers.map(l => [l.id, l]));

  d.components.forEach(c => {
    if (!gById[c.group]) { warn(`component "${c.id}": unknown group "${c.group}" → falling back to "${d.groups[0].id}"`); c.group = d.groups[0].id; }
    if (!lById[c.layer]) { warn(`component "${c.id}": unknown layer "${c.layer}" → falling back to "${d.layers[0].id}"`); c.layer = d.layers[0].id; }
    c.tech = c.tech || [];
    c.features = c.features || [];
    c.notes = c.notes || [];
    c.deps = c.deps || [];
  });

  const cById = Object.fromEntries(d.components.map(c => [c.id, c]));
  d.components.forEach(c => {
    c.deps = c.deps.filter(x => {
      if (!cById[x]) { warn(`component "${c.id}": dependency "${x}" does not exist — dropped`); return false; }
      return true;
    });
  });

  d.flows.forEach(f => {
    f.steps = (f.steps || []).filter(s => {
      if (!cById[s.component]) { warn(`flow "${f.id}": step references unknown component "${s.component}" — dropped`); return false; }
      return true;
    });
    if (!f.group || !gById[f.group]) f.group = f.steps.length ? cById[f.steps[0].component].group : d.groups[0].id;
  });

  d.lang = d.meta.lang || 'en';
  return { d, gById, lById, cById };
}

/* ======================================================================== *
 * BOOT
 * ======================================================================== */
const RAW = window.ARCHITECTURE;
if (!RAW) {
  document.body.innerHTML = `<div class="fatal"><h2>No data found</h2>
    <p>The engine could not find <code>window.ARCHITECTURE</code>.</p>
    <p>Check that <code>data/architecture.js</code> exists and starts with
    <code>window.ARCHITECTURE = { … }</code>.</p></div>`;
  throw new Error('window.ARCHITECTURE is undefined');
}

const { d: DATA, gById: G, lById: L, cById: C } = normalize(RAW);
const T = Object.assign({}, LABELS.en, LABELS[DATA.lang] || {}, DATA.i18n || {});
const gvar = id => `var(${(G[id] || DATA.groups[0]).var})`;

/* edges */
const EDGES = [];
DATA.components.forEach(c => c.deps.forEach(x => EDGES.push([c.id, x])));
const INBOUND = {};
EDGES.forEach(([a, b]) => { (INBOUND[b] = INBOUND[b] || []).push(a); });

/* The bottom layer is treated as "support" and drawn without edges — but only
 * when there are enough layers for that to be a sensible reading. On a 2- or
 * 3-layer diagram the bottom row is the data tier, and suppressing its edges
 * would hide the most important arrows on the page. */
const SUPPORT_LAYER =
  DATA.ui.supportLayer === false ? null
  : DATA.ui.supportLayer ? DATA.ui.supportLayer
  : DATA.layers.length >= 4 ? DATA.layers[DATA.layers.length - 1].id
  : null;

const LAYER_INDEX = Object.fromEntries(DATA.layers.map((l, i) => [l.id, i]));

/* ------------------------------------------------------------------ theme */
function injectTheme() {
  const t = DATA.theme;
  const light = DATA.groups.map(g => `${g.var}:${g.color}`).join(';');
  const dark  = DATA.groups.map(g => `${g.var}:${g.colorDark}`).join(';');
  const brand = t.brand || DATA.groups[0].color;
  const brandDark = t.brandDark || DATA.groups[0].colorDark;
  const el = document.createElement('style');
  el.textContent =
    `:root{${light};--brand:${brand};--brand-deep:${t.brandDeep || brand};` +
    `--brand-soft:color-mix(in srgb,${brand} 12%,#fff)}` +
    `html[data-theme="dark"]{${dark};--brand:${brandDark};--brand-deep:${t.brandDeepDark || brandDark};` +
    `--brand-soft:color-mix(in srgb,${brandDark} 18%,#000)}`;
  document.head.appendChild(el);

  document.documentElement.lang = DATA.lang;
  document.documentElement.dataset.theme = DATA.ui.defaultTheme === 'dark' ? 'dark' : 'light';
  document.title = (DATA.meta.name ? DATA.meta.name + ' — ' : '') + (DATA.meta.tagline || 'Architecture Explorer');
  $('#logo').innerHTML = svgIcon(t.logo || 'cube');
  $('#brandName').textContent = DATA.meta.name || 'Architecture';
  $('#brandSub').textContent = [DATA.meta.tagline || 'Architecture Explorer', DATA.meta.version]
    .filter(Boolean).join(' — ');
  $('#q').placeholder = T.searchPlaceholder;
}

/* ======================================================================== *
 * TABS
 * ======================================================================== */
function buildTabs() {
  const builtin = { overview: T.overview, architecture: T.architecture, flows: T.flows, stack: T.stack };
  const available = [];
  if (DATA.ui.views?.overview !== false) available.push('overview');
  if (DATA.ui.views?.architecture !== false && DATA.components.length) available.push('architecture');
  DATA.sections.forEach(s => available.push(s.id));
  if (DATA.flows.length && DATA.ui.views?.flows !== false) available.push('flows');
  if (DATA.technologies.length && DATA.ui.views?.stack !== false) available.push('stack');

  /* ui.tabs lets you reorder / hide; anything not listed keeps its natural place at the end */
  const order = DATA.ui.tabs && DATA.ui.tabs.length
    ? uniq(DATA.ui.tabs.filter(id => available.includes(id)))
    : available;

  return order.map(id => ({
    id,
    label: builtin[id] || (DATA.sections.find(s => s.id === id)?.tab)
        || (DATA.sections.find(s => s.id === id)?.title) || id
  }));
}

const TABS = buildTabs();
let state = { tab: TABS[0]?.id, group: 'all', q: '', flow: DATA.flows[0]?.id, step: 0, playing: null, cat: 'all' };

/* ======================================================================== *
 * VIEW: OVERVIEW
 * ======================================================================== */
function renderOverview() {
  const m = DATA.meta;
  const counts = {}; DATA.groups.forEach(g => counts[g.id] = DATA.components.filter(c => c.group === g.id).length);

  const autoTiles = [
    { value: DATA.components.length, label: T.components, hint: `${DATA.layers.length} ${T.layers}` },
    { value: DATA.groups.length, label: T.groupsN, hint: DATA.groups.map(g => g.short).join(' · ') }
  ];
  if (DATA.technologies.length)
    autoTiles.push({ value: DATA.technologies.length, label: T.technologiesN,
      hint: uniq(DATA.technologies.map(t => t.category)).filter(Boolean).join(', ') });
  const tiles = (m.tiles && m.tiles.length) ? m.tiles : autoTiles;

  const endpoints = DATA.components.filter(c => c.url);
  const bar = DATA.groups.filter(g => counts[g.id]).map(g =>
    `<div style="flex:${counts[g.id]};background:${gvar(g.id)}" title="${esc(g.name)} — ${counts[g.id]}">${counts[g.id]}</div>`).join('');

  const hero = `
  <div class="hero">
    ${m.kicker ? `<div class="kicker">${esc(m.kicker)}</div>` : ''}
    <h1>${esc(m.title || m.name || 'Architecture')}</h1>
    ${m.intro ? `<p>${rich(m.intro)}</p>` : ''}
    ${(m.facts || []).length ? `<div class="meta">${m.facts.map(f =>
      `<div><span>${esc(f.label)}</span><b>${esc(f.value)}</b></div>`).join('')}</div>` : ''}
  </div>`;

  const distribution = `
    <div class="card pad">
      <div class="sec-title"><h2>${T.distribution}</h2></div>
      ${m.distributionNote ? `<p class="sec-sub" style="margin-bottom:6px">${rich(m.distributionNote)}</p>` : ''}
      <div class="groupbar">${bar}</div>
      <div class="legend">${DATA.groups.filter(g => counts[g.id]).map(g =>
        `<span><i style="background:${gvar(g.id)}"></i>${esc(g.name)} — <b>${counts[g.id]}</b></span>`).join('')}</div>
      ${m.principle ? `<div class="divider"></div><div class="note">${rich(m.principle)}</div>` : ''}
    </div>`;

  const endpointsCard = endpoints.length ? `
    <div class="card pad">
      <div class="sec-title"><h2>${T.endpoints}</h2></div>
      <div style="height:12px"></div>
      <table class="cmp"><tbody>${endpoints.map(c =>
        `<tr><td class="mono" style="font-size:12px"><span class="dot" style="background:${gvar(c.group)}"></span>${esc(c.url)}</td>
             <td style="color:var(--ink-2)">${esc(c.name)}</td></tr>`).join('')}</tbody></table>
    </div>` : '';

  const groupCards = DATA.groups.map(g => {
    const list = DATA.components.filter(c => c.group === g.id).slice(0, 8);
    if (!list.length) return '';
    return `<div class="card pad" style="--c:${gvar(g.id)}">
      <h3 style="font-size:15px;display:flex;align-items:center;gap:9px;margin-bottom:6px">
        <span class="dot" style="background:${gvar(g.id)};width:10px;height:10px"></span>${esc(g.name)}</h3>
      ${g.description ? `<p style="font-size:12.5px;color:var(--ink-2);margin:0 0 10px">${rich(g.description)}</p>` : ''}
      <ul class="bullets">${list.map(c => `<li>${esc(c.name)}${c.tech.length
        ? ` <span style="color:var(--ink-3)">· ${esc(c.tech.slice(0, 2).join(', '))}</span>` : ''}</li>`).join('')}</ul>
      <div style="margin-top:12px"><button class="btn" data-goto="${esc(g.id)}">${T.exploreScope}</button></div>
    </div>`;
  }).join('');

  return hero
    + `<div class="tiles">${tiles.map(t =>
        `<div class="tile"><div class="lbl">${esc(t.label)}</div><div class="val">${esc(t.value)}</div>
         ${t.hint ? `<div class="hint">${esc(t.hint)}</div>` : ''}</div>`).join('')}</div>`
    + `<div class="grid" style="grid-template-columns:${endpointsCard ? '1.25fr 1fr' : '1fr'};align-items:start">
         ${distribution}${endpointsCard}</div>`
    + (groupCards ? `<div style="height:20px"></div><div class="cols3">${groupCards}</div>` : '');
}

/* ======================================================================== *
 * VIEW: ARCHITECTURE
 * ======================================================================== */
function renderArchitecture() {
  /* a group with no component is a leftover in the data file, not a filter */
  const used = DATA.groups.filter(g => DATA.components.some(c => c.group === g.id)).map(g => g.id);
  const chips = (used.length > 1 ? ['all', ...used] : used).map(id => {
    const isAll = id === 'all';
    return `<button class="chip ${isAll ? '' : 'pole'}" ${isAll ? '' : `style="--c:${gvar(id)}"`}
      data-group="${esc(id)}" aria-pressed="${state.group === id}">
      ${isAll ? '' : `<i style="background:${gvar(id)}"></i>`}${esc(isAll ? T.allScopes : G[id].name)}</button>`;
  }).join('');

  const layers = DATA.layers.map(l => {
    const nodes = DATA.components.filter(c => c.layer === l.id);
    if (!nodes.length) return '';
    return `<div class="layer" data-layer="${esc(l.id)}">
      <div class="layer-head"><b>${esc(l.name)}</b>${l.desc ? `<em>${esc(l.desc)}</em>` : ''}</div>
      <div class="nodes">${nodes.map(nodeHTML).join('')}</div></div>`;
  }).join('');

  const s = DATA.ui.architecture || {};
  return `
    <div class="sec-title"><h2>${esc(s.title || T.architecture)}</h2></div>
    ${s.subtitle ? `<p class="sec-sub">${rich(s.subtitle)}</p>` : ''}
    <div class="filters">${chips}<span class="hintline">${T.hintDiagram}</span></div>
    <div class="diagram" id="diagram"><svg id="edges"></svg>${layers}</div>
    ${SUPPORT_LAYER ? `<div style="height:14px"></div><div class="note">${T.infraNote}</div>` : ''}`;
}

function nodeHTML(c) {
  return `<button class="node" id="n-${esc(c.id)}" data-id="${esc(c.id)}" style="--c:${gvar(c.group)}">
    ${c.badge ? `<span class="badge">${esc(c.badge)}</span>` : ''}
    <div class="nh"><span class="ic">${svgIcon(c.icon)}</span><span class="nm">${esc(c.name)}</span></div>
    ${c.tech.length ? `<div class="tech">${c.tech.slice(0, 3).map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
    ${c.url ? `<div class="url mono">${esc(c.url)}</div>` : ''}
  </button>`;
}

function bindArchitecture() {
  $$('#v-architecture .chip').forEach(b => b.onclick = () => {
    state.group = b.dataset.group;
    $$('#v-architecture .chip').forEach(x => x.setAttribute('aria-pressed', x.dataset.group === state.group));
    applyFilter();
  });
  $$('#v-architecture .node').forEach(n => {
    n.onclick = () => openDrawer(n.dataset.id);
    n.onmouseenter = () => setFocus(n.dataset.id);
    n.onmouseleave = () => setFocus(null);
  });
}

function matches(c) {
  if (state.group !== 'all' && c.group !== state.group) return false;
  const q = state.q.trim().toLowerCase();
  if (!q) return true;
  return [c.name, c.url, c.tech.join(' '), c.role, c.features.join(' ')]
    .join(' ').toLowerCase().includes(q);
}

function applyFilter() {
  DATA.components.forEach(c => {
    const el = $('#n-' + CSS.escape(c.id));
    if (el) el.classList.toggle('dim', !matches(c));
  });
  drawEdges();
}

let focused = null;
function setFocus(id) {
  focused = id;
  const rel = new Set();
  if (id) { rel.add(id); C[id].deps.forEach(x => rel.add(x)); (INBOUND[id] || []).forEach(x => rel.add(x)); }
  $$('#v-architecture .node').forEach(n => {
    const on = !id || rel.has(n.dataset.id);
    n.classList.toggle('hit', !!id && rel.has(n.dataset.id));
    if (!n.classList.contains('sel')) n.style.opacity = matches(C[n.dataset.id]) ? (on ? '' : '.22') : '';
  });
  /* The whole edge fades, not just its stroke: the endpoint discs carry the
   * direction, so they have to dim with the line they belong to. */
  $$('#edges g.edge').forEach(g => {
    const active = id && (g.dataset.a === id || g.dataset.b === id);
    g.setAttribute('opacity', id ? (active ? 1 : .07) : .3);
    g.querySelector('path').setAttribute('stroke-width', active ? 2 : 1.2);
  });
}

function drawEdges() {
  const svg = $('#edges'), dia = $('#diagram');
  if (!svg || !dia) return;
  const box = dia.getBoundingClientRect();
  svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
  svg.style.height = box.height + 'px';
  const css = getComputedStyle(document.documentElement);
  const col = {}; DATA.groups.forEach(g => col[g.id] = css.getPropertyValue(g.var).trim());
  let out = '';
  EDGES.forEach(([a, b]) => {
    if (SUPPORT_LAYER && (C[a].layer === SUPPORT_LAYER || C[b].layer === SUPPORT_LAYER)) return;
    const ea = $('#n-' + CSS.escape(a)), eb = $('#n-' + CSS.escape(b));
    if (!ea || !eb || ea.classList.contains('dim') || eb.classList.contains('dim')) return;
    const ra = ea.getBoundingClientRect(), rb = eb.getBoundingClientRect();
    const x1 = ra.left - box.left + ra.width / 2;
    const x2 = rb.left - box.left + rb.width / 2;
    const la = LAYER_INDEX[C[a].layer], lb = LAYER_INDEX[C[b].layer];

    /* Three geometries: down the layers (the common case), back up, and
     * sideways within one layer — which needs an arc under the row, otherwise
     * the curve loops back on itself and reads as a knot. */
    let y1, y2, k1, k2;
    if (la === lb) {
      y1 = ra.bottom - box.top; y2 = rb.bottom - box.top;
      k1 = 30; k2 = 30;
    } else {
      const up = la > lb;
      y1 = (up ? ra.top : ra.bottom) - box.top;
      y2 = (up ? rb.bottom : rb.top) - box.top;
      const k = (up ? -1 : 1) * Math.max(24, Math.abs(y2 - y1) * .5);
      k1 = k; k2 = -k;
    }
    /* A filled disc where the caller is, an open circle where the callee
     * answers — the mark's own grammar, so direction reads without an
     * arrowhead. Grouped so the fade in applyFilter takes the endpoints with
     * the line, and so the open circle's paper fill still punches through. */
    const colour = col[C[a].group];
    out += `<g class="edge" opacity=".3" data-a="${esc(a)}" data-b="${esc(b)}">`
         + `<path d="M${x1.toFixed(1)},${y1.toFixed(1)} C${x1.toFixed(1)},${(y1 + k1).toFixed(1)} `
         + `${x2.toFixed(1)},${(y2 + k2).toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}" fill="none" `
         + `stroke="${colour}" stroke-width="1.2" stroke-linecap="round"></path>`
         + `<circle cx="${x1.toFixed(1)}" cy="${y1.toFixed(1)}" r="3.5" fill="${colour}"></circle>`
         + `<circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="3" style="fill:var(--panel)" `
         + `stroke="${colour}" stroke-width="1.5"></circle>`
         + `</g>`;
  });
  svg.innerHTML = out;
  if (focused) setFocus(focused);
}

/* ======================================================================== *
 * VIEW: FLOWS
 * ======================================================================== */
function renderFlows() {
  const f = DATA.flows.find(x => x.id === state.flow) || DATA.flows[0];
  if (!f) return `<div class="card empty">${T.empty}</div>`;
  state.flow = f.id;

  const picks = DATA.flows.map(x => `<button class="chip pole" style="--c:${gvar(x.group)}"
    data-flow="${esc(x.id)}" aria-pressed="${x.id === state.flow}"><i style="background:${gvar(x.group)}"></i>${esc(x.name)}</button>`).join('');

  const steps = f.steps.map((s, i) => {
    const c = C[s.component];
    return `<div class="step" style="--c:${gvar(c.group)}" data-i="${i}">
      <div class="n">${i + 1}</div>
      <div class="tx"><b>${esc(s.title)}</b><p>${rich(s.description || '')}</p>
        <span class="who">${svgIcon(c.icon)}${esc(c.name)}</span></div></div>`;
  }).join('');

  const involved = uniq(f.steps.map(s => s.component)).map(id => {
    const c = C[id];
    return `<button class="rel-item" data-open="${esc(id)}" style="--c:${gvar(c.group)};display:flex;align-items:center;gap:9px;width:100%;text-align:left;background:var(--panel-2);border:1px solid var(--line);border-radius:9px;padding:8px 11px;cursor:pointer;font:inherit;font-size:12.5px;color:var(--ink);margin-bottom:6px">
      <span class="ic" style="width:22px;height:22px;border-radius:6px;background:color-mix(in srgb,${gvar(c.group)} 15%,transparent);display:grid;place-items:center;flex:none">${svgIcon(c.icon)}</span>
      ${esc(c.name)}</button>`;
  }).join('');

  const s = DATA.ui.flows || {};
  return `
    <div class="sec-title"><h2>${esc(s.title || T.flows)}</h2></div>
    ${s.subtitle ? `<p class="sec-sub">${rich(s.subtitle)}</p>` : ''}
    <div class="flowpick">${picks}</div>
    <div class="flowgrid">
      <div class="card pad" style="--c:${gvar(f.group)}">
        <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap">
          <h3 style="font-size:17px">${esc(f.name)}</h3>
          ${f.sub ? `<span class="mono" style="font-size:11.5px;color:var(--ink-3)">${esc(f.sub)}</span>` : ''}</div>
        <div style="height:14px"></div>
        <div class="steps">${steps}</div>
        ${f.steps.length ? `<div class="playbar">
          <button class="btn" id="prev"><svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"/></svg>${T.prev}</button>
          <button class="btn primary" id="next">${T.next}<svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg></button>
          <button class="btn" id="play"></button>
          <div class="progress"><i></i></div>
          <span id="stepcount" style="font-size:12px;color:var(--ink-3);font-variant-numeric:tabular-nums"></span>
        </div>` : `<div class="empty" style="padding:24px 12px">${T.empty}</div>`}
      </div>
      <div class="card pad" style="--c:${gvar(f.group)}">
        <h3 style="font-size:14px;margin-bottom:10px">${T.involved}</h3>
        ${involved}
        ${f.note ? `<div class="divider"></div><div class="note" style="font-size:12.5px">${rich(f.note)}</div>` : ''}
      </div>
    </div>`;
}

const PLAY_ICO  = () => `<svg viewBox="0 0 24 24"><path d="M7 4v16l13-8z"/></svg>${T.play}`;
const PAUSE_ICO = () => `<svg viewBox="0 0 24 24"><path d="M7 5h3v14H7zM14 5h3v14h-3z"/></svg>${T.pause}`;

function bindFlows() {
  const f = DATA.flows.find(x => x.id === state.flow);
  if (!f) return;
  $$('#v-flows [data-flow]').forEach(b => b.onclick = () => { stopPlay(); state.flow = b.dataset.flow; state.step = 0; mount('flows'); });
  $$('#v-flows [data-open]').forEach(b => b.onclick = () => openDrawer(b.dataset.open));
  $$('#v-flows .step').forEach(s => s.onclick = () => { stopPlay(); state.step = +s.dataset.i; updateFlow(); });
  /* A flow being authored may have no step yet, and then there is no playbar. */
  if (!f.steps.length) return;
  $('#prev').onclick = () => { stopPlay(); state.step = Math.max(0, state.step - 1); updateFlow(); };
  $('#next').onclick = () => { stopPlay(); state.step = Math.min(f.steps.length - 1, state.step + 1); updateFlow(); };
  $('#play').onclick = () => togglePlay(f.steps.length);
  updateFlow();
}
function updateFlow() {
  const f = DATA.flows.find(x => x.id === state.flow); if (!f || !f.steps.length) return;
  $$('#v-flows .step').forEach((s, i) => s.classList.toggle('on', i <= state.step));
  const bar = $('#v-flows .progress i'); if (bar) bar.style.width = ((state.step + 1) / f.steps.length * 100).toFixed(1) + '%';
  const cnt = $('#stepcount'); if (cnt) cnt.textContent = `${state.step + 1}/${f.steps.length}`;
  const pb = $('#play'); if (pb) pb.innerHTML = state.playing ? PAUSE_ICO() : PLAY_ICO();
}
function togglePlay(n) {
  if (state.playing) { stopPlay(); updateFlow(); return; }
  state.step = 0;
  state.playing = setInterval(() => {
    if (state.step >= n - 1) { stopPlay(); updateFlow(); return; }
    state.step++; updateFlow();
  }, DATA.ui.flowSpeedMs || 1500);
  updateFlow();
}
function stopPlay() { if (state.playing) { clearInterval(state.playing); state.playing = null; } }

/* ======================================================================== *
 * VIEW: STACK
 * ======================================================================== */
function renderStack() {
  const cats = ['all', ...uniq(DATA.technologies.map(t => t.category).filter(Boolean))];
  const chips = cats.map(c => `<button class="chip" data-cat="${esc(c)}" aria-pressed="${state.cat === c}">
    ${esc(c === 'all' ? T.allCategories : c)}</button>`).join('');
  const q = state.q.trim().toLowerCase();
  const list = DATA.technologies.filter(t =>
    (state.cat === 'all' || t.category === state.cat) &&
    (state.group === 'all' || (t.groups || []).includes(state.group)) &&
    (!q || `${t.name} ${t.description || ''} ${t.category || ''}`.toLowerCase().includes(q)));

  const s = DATA.ui.stack || {};
  return `
    <div class="sec-title"><h2>${esc(s.title || T.stack)}</h2></div>
    ${s.subtitle ? `<p class="sec-sub">${rich(s.subtitle)}</p>` : ''}
    <div class="filters">${chips}<span class="hintline">${list.length} ${list.length > 1 ? T.resultsPlural : T.results}</span></div>
    ${list.length ? `<div class="stackgrid">${list.map(t => `
      <div class="tcard">
        <div class="tn"><b>${esc(t.name)}</b>${t.category ? `<span class="cat">${esc(t.category)}</span>` : ''}</div>
        ${t.description ? `<p>${rich(t.description)}</p>` : ''}
        ${(t.groups || []).length ? `<div class="usedby">${t.groups.filter(g => G[g]).map(g =>
          `<span class="ub"><i style="background:${gvar(g)}"></i>${esc(G[g].short)}</span>`).join('')}</div>` : ''}
      </div>`).join('')}</div>` : `<div class="card empty">${T.empty}</div>`}`;
}
function bindStack() {
  $$('#v-stack [data-cat]').forEach(b => b.onclick = () => { state.cat = b.dataset.cat; mount('stack'); });
}

/* ======================================================================== *
 * VIEW: CUSTOM SECTIONS
 * ======================================================================== */
function renderSection(sec) {
  const head = `<div class="sec-title"><h2>${esc(sec.title)}</h2></div>`
    + (sec.subtitle ? `<p class="sec-sub">${rich(sec.subtitle)}</p>` : '');
  const body = ({
    cards: renderCards, timeline: renderTimeline, table: renderTable,
    compare: renderCompare, text: renderText
  }[sec.type] || (() => `<div class="card empty">Unknown section type "${esc(sec.type)}"</div>`))(sec);
  return head + body + (sec.note ? `<div style="height:18px"></div><div class="note">${rich(sec.note)}</div>` : '');
}

function renderCards(sec) {
  return `<div class="cols3">${(sec.items || []).map(i => `
    <div class="card pad icard" style="--c:${gvar(i.group || DATA.groups[0].id)}">
      <h3><span class="ic">${svgIcon(i.icon)}</span>${esc(i.title)}</h3>
      ${i.body ? `<div class="textblock"><p>${rich(i.body)}</p></div>` : ''}
      ${(i.bullets || []).length ? `<ul>${i.bullets.map(b => `<li>${rich(b)}</li>`).join('')}</ul>` : ''}
    </div>`).join('')}</div>`;
}

function renderTimeline(sec) {
  const side = (sec.aside || []).map(a => `
    <div class="card pad icard" style="--c:${gvar(a.group || DATA.groups[0].id)}">
      <h3><span class="ic">${svgIcon(a.icon)}</span>${esc(a.title)}</h3>
      <ul>${(a.bullets || []).map(b => `<li>${rich(b)}</li>`).join('')}</ul></div>`).join('');
  const line = `<div class="card pad">
    ${sec.lineTitle ? `<h3 style="font-size:15px;margin-bottom:16px">${esc(sec.lineTitle)}</h3>` : ''}
    ${(sec.items || []).map(p => `<div class="phase" style="--c:${gvar(p.group || DATA.groups[0].id)}">
      ${p.period ? `<div class="w">${esc(p.period)}</div>` : ''}
      <h4>${esc(p.title)}</h4>
      <ul class="bullets">${(p.bullets || []).map(b => `<li>${rich(b)}</li>`).join('')}</ul></div>`).join('')}
  </div>`;
  return side
    ? `<div class="grid" style="grid-template-columns:1.15fr 1fr;align-items:start">${line}<div style="display:grid;gap:16px">${side}</div></div>`
    : line;
}

function renderTable(sec) {
  const cols = sec.columns || [];
  return `<div class="card pad" style="padding-top:14px">
    <table class="cmp">
      ${cols.length ? `<thead><tr>${cols.map(c =>
        `<th${c.width ? ` style="width:${esc(c.width)}"` : ''}>${c.group ? `<span class="dot" style="background:${gvar(c.group)}"></span>` : ''}${esc(c.label != null ? c.label : c)}</th>`).join('')}</tr></thead>` : ''}
      <tbody>${(sec.rows || []).map(r =>
        `<tr>${r.map((cell, i) => `<td${i ? ' style="color:var(--ink-2)"' : ''}>${rich(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>`;
}

function renderText(sec) {
  return `<div class="cols3">${(sec.blocks || []).map(b => `
    <div class="card pad" style="--c:${gvar(b.group || DATA.groups[0].id)}">
      ${b.title ? `<h3 style="font-size:15px;margin-bottom:8px">${esc(b.title)}</h3>` : ''}
      <div class="textblock">${(Array.isArray(b.body) ? b.body : [b.body]).map(p => `<p>${rich(p)}</p>`).join('')}</div>
    </div>`).join('')}</div>`;
}

function renderCompare(sec) {
  const cards = (sec.columns || []).map(col => `
    <div class="pole-card" style="--c:${gvar(col.group)}">
      <div class="top">
        ${col.kicker ? `<div class="k">${esc(col.kicker)}</div>` : ''}
        <h3>${esc(col.title)}</h3>
        ${col.pitch ? `<p>${rich(col.pitch)}</p>` : ''}</div>
      <div class="body">
        ${(col.rows || []).length ? `<dl class="kv">${col.rows.map(r =>
          `<dt>${esc(r[0])}</dt><dd>${rich(r[1])}</dd>`).join('')}</dl>` : ''}
        ${(col.bullets || []).length ? `<div class="divider"></div>
          <ul class="bullets">${col.bullets.map(b => `<li>${rich(b)}</li>`).join('')}</ul>` : ''}
      </div></div>`).join('');

  const tbl = sec.table ? `
    <div style="height:22px"></div>
    <div class="card pad">
      ${sec.table.title ? `<div class="sec-title"><h2>${esc(sec.table.title)}</h2></div>` : ''}
      ${sec.table.subtitle ? `<p class="sec-sub" style="margin-bottom:14px">${rich(sec.table.subtitle)}</p>` : '<div style="height:8px"></div>'}
      <table class="cmp">
        <thead><tr><th style="width:180px">${esc(sec.table.firstColumn || T.dimension)}</th>
        ${(sec.columns || []).map(c => `<th><span class="dot" style="background:${gvar(c.group)}"></span>${esc(c.short || c.title)}</th>`).join('')}</tr></thead>
        <tbody>${(sec.table.rows || []).map(r =>
          `<tr>${r.map((cell, i) => `<td${i ? ' style="color:var(--ink-2)"' : ''}>${rich(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
      </table></div>` : '';

  const extra = (sec.cards || []).length ? `
    <div style="height:22px"></div>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(340px,1fr))">
      ${sec.cards.map(c => `<div class="card pad" style="--c:${gvar(c.group || DATA.groups[0].id)}">
        <div class="sec-title"><h2>${esc(c.title)}</h2></div>
        ${c.subtitle ? `<p class="sec-sub" style="margin-bottom:12px">${rich(c.subtitle)}</p>` : ''}
        ${(c.bullets || []).length ? `<ul class="bullets">${c.bullets.map(b => `<li>${rich(b)}</li>`).join('')}</ul>` : ''}
        ${c.note ? `<div style="height:14px"></div><div class="note">${rich(c.note)}</div>` : ''}
      </div>`).join('')}</div>` : '';

  return `<div class="poles">${cards}</div>${tbl}${extra}`;
}

/* ======================================================================== *
 * DRAWER
 * ======================================================================== */
function openDrawer(id) {
  const c = C[id]; if (!c) return;
  const col = gvar(c.group);
  const outs = c.deps.map(x => C[x]).filter(Boolean);
  const ins = (INBOUND[id] || []).map(x => C[x]).filter(Boolean);
  const layer = L[c.layer];

  $('#dh').style.setProperty('--c', col);
  $('#dh').innerHTML = `
    <button class="iconbtn dclose" id="dclose" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    <span class="pill"><i style="width:7px;height:7px;border-radius:50%;background:${col};display:inline-block"></i>${esc(G[c.group].name)}</span>
    <h3>${esc(c.name)}</h3>
    <div class="sub">${esc(layer ? layer.name : '')}${c.url ? ` · <span class="mono">${esc(c.url)}</span>` : ''}</div>`;

  const relBtns = (arr, dir) => arr.map(x =>
    `<button data-open="${esc(x.id)}"><i style="background:${gvar(x.group)}"></i>${esc(x.name)}<em>${dir}</em></button>`).join('');

  $('#db').style.setProperty('--c', col);
  $('#db').innerHTML = `
    ${c.role ? `<h4>${T.role}</h4><p>${rich(c.role)}</p>` : ''}
    ${c.tech.length ? `<h4>${T.technologies}</h4><div class="taglist">${c.tech.map(t => `<span class="tag k">${esc(t)}</span>`).join('')}</div>` : ''}
    ${c.features.length ? `<h4>${T.responsibilities}</h4><ul>${c.features.map(f => `<li>${rich(f)}</li>`).join('')}</ul>` : ''}
    ${c.notes.length ? `<h4>${T.notes}</h4><ul>${c.notes.map(f => `<li>${rich(f)}</li>`).join('')}</ul>` : ''}
    ${outs.length ? `<h4>${T.dependsOn}</h4><div class="rel">${relBtns(outs, T.outgoing)}</div>` : ''}
    ${ins.length ? `<h4>${T.usedBy}</h4><div class="rel">${relBtns(ins, T.incoming)}</div>` : ''}`;

  $('#drawer').classList.add('on'); $('#scrim').classList.add('on');
  $('#dclose').onclick = closeDrawer;
  $$('#db [data-open]').forEach(b => b.onclick = () => openDrawer(b.dataset.open));
  $$('.node').forEach(n => n.classList.toggle('sel', n.dataset.id === id));
  location.hash = 'c/' + encodeURIComponent(id);
}
function closeDrawer() {
  $('#drawer').classList.remove('on'); $('#scrim').classList.remove('on');
  $$('.node').forEach(n => n.classList.remove('sel'));
  if (location.hash.startsWith('#c/')) history.replaceState(null, '', location.pathname + location.search);
}

/* ======================================================================== *
 * MOUNT / ROUTER
 * ======================================================================== */
function viewHTML(id) {
  if (id === 'overview') return renderOverview();
  if (id === 'architecture') return renderArchitecture();
  if (id === 'flows') return renderFlows();
  if (id === 'stack') return renderStack();
  const sec = DATA.sections.find(s => s.id === id);
  return sec ? renderSection(sec) : `<div class="card empty">${T.empty}</div>`;
}

function mount(id) {
  const host = $('#v-' + id);
  if (!host) return;
  host.innerHTML = viewHTML(id);
  if (id === 'overview') $$('#v-overview [data-goto]').forEach(b => b.onclick = () => {
    state.group = b.dataset.goto; setTab('architecture'); mount('architecture'); bindArchitecture(); applyFilter();
  });
  if (id === 'architecture') { bindArchitecture(); applyFilter(); requestAnimationFrame(drawEdges); }
  if (id === 'flows') bindFlows();
  if (id === 'stack') bindStack();
}

function setTab(id) {
  state.tab = id;
  $$('#tabs .tab').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === id));
  $$('.view').forEach(v => v.classList.toggle('active', v.id === 'v-' + id));
  if (id === 'architecture') requestAnimationFrame(() => requestAnimationFrame(drawEdges));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function boot() {
  injectTheme();

  $('#tabs').innerHTML = TABS.map(t =>
    `<button class="tab" role="tab" data-tab="${esc(t.id)}" aria-selected="${t.id === state.tab}">${esc(t.label)}</button>`).join('');
  $$('#tabs .tab').forEach(b => b.onclick = () => setTab(b.dataset.tab));

  $('#main').innerHTML = TABS.map(t =>
    `<section class="view${t.id === state.tab ? ' active' : ''}" id="v-${esc(t.id)}"></section>`).join('')
    + `<div class="footer">
        <span>${esc(DATA.meta.footer || '')}</span>
        <span style="margin-left:auto">${T.builtWith}
        <a href="https://github.com/${esc(DATA.meta.repo || 'your-org/architecture-explorer')}" target="_blank" rel="noopener">Architecture Explorer</a></span>
       </div>`;

  TABS.forEach(t => mount(t.id));

  $('#scrim').onclick = closeDrawer;
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeDrawer();
    if (e.key === '/' && document.activeElement !== $('#q')) { e.preventDefault(); $('#q').focus(); }
  });

  let qt;
  $('#q').addEventListener('input', e => {
    state.q = e.target.value;
    clearTimeout(qt);
    qt = setTimeout(() => { applyFilter(); if ($('#v-stack')) mount('stack'); }, 140);
  });

  const MOON = '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>';
  const SUN  = '<circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"/>';
  const syncThemeIcon = () => { $('#themeIcon').innerHTML = document.documentElement.dataset.theme === 'dark' ? SUN : MOON; };
  syncThemeIcon();
  $('#themeBtn').onclick = () => {
    document.documentElement.dataset.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    syncThemeIcon();
    requestAnimationFrame(drawEdges);
  };
  $('#printBtn').onclick = () => window.print();

  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(drawEdges, 120); });
  window.addEventListener('load', () => requestAnimationFrame(drawEdges));
  setTimeout(drawEdges, 200);

  /* deep link: #c/<component-id> */
  if (location.hash.startsWith('#c/')) {
    const id = decodeURIComponent(location.hash.slice(3));
    if (C[id]) { setTab('architecture'); setTimeout(() => openDrawer(id), 260); }
  }
}

boot();
})();
