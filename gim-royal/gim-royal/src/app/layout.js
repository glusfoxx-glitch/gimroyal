import './globals.css';
import { Lilita_One, Nunito } from 'next/font/google';

const display = Lilita_One({ weight: '400', subsets: ['latin'], variable: '--font-display', display: 'swap' });
const body = Nunito({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

export const metadata = {
  title: 'GIM Royal',
  description: 'Le clash du Couloir du Lycée — jeu de cartes 3D multijoueur, jouable dans le navigateur.',
  appleWebApp: { capable: true, title: 'GIM Royal', statusBarStyle: 'black-translucent' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#1b1433',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
