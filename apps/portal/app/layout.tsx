import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
const investorMode = process.env.NEXT_PUBLIC_INVESTOR_DEMO === 'true';

export const metadata: Metadata = investorMode
  ? {
      title: 'DecorFlavor · Investor Catalog Preview',
      description: 'Read-only structured catalog demonstration for DecorFlavor.',
      robots: { index: false, follow: false },
    }
  : { title: 'DecorFlavor Operations' };
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
