/* The editor's glyph. The paths themselves live in `@/lib/icons`, which the SVG
 * export also reads — a component module cannot be imported from a renderer that
 * runs without React. Re-exported here so the pickers keep their old import. */

import { ICONS, iconPath } from '@/lib/icons';

export { ICONS };

export function Icon({ name, size = 16, className, style }: {
  name: string; size?: number; className?: string; style?: React.CSSProperties;
}) {
  const path = iconPath(name);
  return (
    <svg
      viewBox="0 0 24 24" width={size} height={size} className={className} style={style}
      fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: path }}
    />
  );
}
