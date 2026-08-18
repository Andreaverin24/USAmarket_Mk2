import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { siteUrl } from '../lib/site-url';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'DecorFlavor | Curated furniture and decor',
  description: 'Extraordinary furniture, art and design from the world’s leading dealers.',
  icons: {
    icon: [{ url: '/brand/decorflavor-logo-stacked.svg', type: 'image/svg+xml' }],
  },
};
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
