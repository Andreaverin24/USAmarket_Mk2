import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const siteUrl = configuredSiteUrl
  ? configuredSiteUrl.startsWith('http://') || configuredSiteUrl.startsWith('https://')
    ? configuredSiteUrl
    : `https://${configuredSiteUrl}`
  : 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'The Guild | Crafted for the discerning collector',
  description: 'Extraordinary furniture, art and design from the world’s leading dealers.',
};
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
