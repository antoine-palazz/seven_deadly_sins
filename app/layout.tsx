import type { Metadata, Viewport } from 'next';
import { Cinzel, Playfair_Display } from 'next/font/google';
import './globals.css';

const cinzel = Cinzel({
  subsets: ['latin'],
  variable: '--font-cinzel',
  display: 'swap',
  weight: ['400', '600', '700', '900'],
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Les Sept Péchés — L\'Épreuve d\'Antoine',
  description:
    'Sept épreuves. Sept péchés. Un seul jugement. Survivras-tu, Antoine ?',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#050505',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${cinzel.variable} ${playfair.variable}`}>
      <body
        className="min-h-dvh overflow-x-hidden bg-background text-foreground antialiased"
        style={{ fontFamily: 'var(--font-cinzel), var(--font-playfair), Georgia, serif' }}
      >
        <div className="noise-overlay" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
