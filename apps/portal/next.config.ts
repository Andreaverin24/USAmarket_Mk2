import type { NextConfig } from 'next';
const investorDemo =
  process.env.NEXT_PUBLIC_INVESTOR_DEMO ?? (process.env.VERCEL ? 'true' : 'false');
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), geolocation=(), microphone=(), payment=(), usb=()',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
  ...(process.env.NODE_ENV === 'production'
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }]
    : []),
];

const config: NextConfig = {
  transpilePackages: ['@atlas/ui'],
  env: { NEXT_PUBLIC_INVESTOR_DEMO: investorDemo },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};
export default config;
