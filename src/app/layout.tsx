import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Architecture Studio',
  description: 'Author, organise and share interactive software-architecture documentation.',
  icons: { icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><text y='19' font-size='20'>\u25C6</text></svg>" }
};

/* Applies the stored theme before first paint so there is no flash. */
const THEME_BOOT = `try{var t=localStorage.getItem('studio-theme');if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} /></head>
      <body>{children}</body>
    </html>
  );
}
