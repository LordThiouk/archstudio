/* The icon set is shared with the viewer engine so that what you pick in the
 * editor is exactly what renders in the export. Keep the two in sync: the
 * source of truth is the ICON map in viewer/engine.js. */

export const ICONS: Record<string, string> = {
  cube: '<path d="M3 8.5 12 4l9 4.5v7L12 20l-9-4.5z"/><path d="M3 8.5 12 13l9-4.5M12 13v7"/>',
  mobile: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3.5 9h17M3.5 15h17M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18"/>',
  scan: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M4 12h16"/>',
  server: '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>',
  hub: '<circle cx="12" cy="12" r="3"/><path d="M12 2v7M12 15v7M2 12h7M15 12h7"/>',
  plug: '<path d="M9 2v6M15 2v6"/><path d="M6 8h12v3a6 6 0 0 1-12 0z"/><path d="M12 17v5"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M17.5 20a6 6 0 0 0-2-4.5"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.2A8 8 0 1 1 21 12z"/><path d="M9 11h.01M12 11h.01M15 11h.01"/>',
  db: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  bolt: '<path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12z"/>',
  box: '<path d="M12 2.5 21 7v10l-9 4.5L3 17V7z"/><path d="M3 7l9 4.5L21 7M12 11.5V21"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  card: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6 15h4"/>',
  sms: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 10h8"/>',
  mail: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="m3 6.5 9 6 9-6"/>',
  bell: '<path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6"/><path d="M10.3 20a2 2 0 0 0 3.4 0"/>',
  map: '<path d="m9 4-6 2.5v14L9 18l6 2.5 6-2.5v-14L15 6.5z"/><path d="M9 4v14M15 6.5v14"/>',
  bug: '<rect x="8" y="7" width="8" height="12" rx="4"/><path d="M8 11H4M20 11h-4M8 16H4.5M20 16h-3.5M9.5 7 8 4.5M14.5 7 16 4.5"/>',
  docker: '<rect x="3" y="11" width="18" height="6" rx="1.5"/><path d="M7 11V8h3v3M13 11V8h3v3M10 8V5h3v3"/>',
  shield: '<path d="M12 2.5 20 6v6c0 5-3.4 8.4-8 9.5C7.4 20.4 4 17 4 12V6z"/><path d="m9 12 2 2 4-4"/>',
  cloud: '<path d="M6.5 18a4.5 4.5 0 0 1-.4-9A6 6 0 0 1 18 9.5a4.2 4.2 0 0 1-.5 8.5z"/>',
  cloudup: '<path d="M6.5 18a4.5 4.5 0 0 1-.4-9A6 6 0 0 1 18 9.5a4.2 4.2 0 0 1-.5 8.5z"/><path d="M12 21v-8M9 15l3-3 3 3"/>',
  git: '<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="12" r="2.5"/><path d="M6 8.5v7M8.5 6h4a3 3 0 0 1 3 3v.8"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h8V3M8 21v-6h8v6"/>',
  lock: '<rect x="4.5" y="10" width="15" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  route: '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.5 6H15a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h6.5"/>',
  cog: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.5l3.5 2"/>',
  flag: '<path d="M5 21V4h13l-2.5 4L18 12H5"/>',
  alert: '<path d="M12 3 2.5 20h19z"/><path d="M12 9.5v4.5M12 17h.01"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9 2 2-2 2 2 2-3 3-2-2-2 2"/>',
  layers: '<path d="m12 3 9 4.5-9 4.5-9-4.5z"/><path d="m3 12 9 4.5L21 12M3 16.5 12 21l9-4.5"/>',
  terminal: '<rect x="2.5" y="4" width="19" height="16" rx="2"/><path d="m7 9 3 3-3 3M13 15h4"/>',
  ai: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><rect x="7" y="7" width="10" height="10" rx="3"/><path d="M11 11h2v2h-2z"/>',

  /* studio-only glyphs */
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  dots: '<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  download: '<path d="M12 3v12M8 11l4 4 4-4"/><path d="M4 21h16"/>',
  upload: '<path d="M12 21V9M8 13l4-4 4 4"/><path d="M4 3h16"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"/>',
  folderPlus: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 11v5M9.5 13.5h5"/>',
  external: '<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  link: '<path d="M9.5 14.5a4 4 0 0 1 0-5.7l2.8-2.8a4 4 0 0 1 5.7 5.7l-1.4 1.4"/><path d="M14.5 9.5a4 4 0 0 1 0 5.7l-2.8 2.8a4 4 0 0 1-5.7-5.7l1.4-1.4"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>'
};

export function Icon({ name, size = 16, className, style }: {
  name: string; size?: number; className?: string; style?: React.CSSProperties;
}) {
  const path = ICONS[name] || ICONS.box;
  return (
    <svg
      viewBox="0 0 24 24" width={size} height={size} className={className} style={style}
      fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: path }}
    />
  );
}
