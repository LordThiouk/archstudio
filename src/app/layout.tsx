import type { Metadata } from 'next';
import './globals.css';

/* The mark at favicon size: the open circle is filled flat rather than
 * stroked, because at 16 px a ring closes into a smudge and what has to
 * survive is the contrast between full and empty. Kept in sync by hand with
 * `Mark` in src/components/Brand.tsx and `FAVICON` in src/lib/exportHtml.ts. */
const FAVICON =
  "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'>"
  + "<rect width='192' height='192' fill='%230B1B2B'/>"
  + "<path d='M32 96H160' stroke='%23FFFFFF' stroke-width='12'/>"
  + "<circle cx='48' cy='96' r='30' fill='%2300E5FF'/>"
  + "<circle cx='146' cy='96' r='26' fill='%23FFFFFF'/></svg>";

export const metadata: Metadata = {
  title: 'ArchStudio',
  description: 'Draw the architecture once. Send the document.',
  icons: { icon: FAVICON }
};

/* Applies the stored theme before first paint so there is no flash. */
const THEME_BOOT = `try{var t=localStorage.getItem('studio-theme');if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} /></head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
