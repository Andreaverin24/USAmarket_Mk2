import type { NextConfig } from 'next';
const investorDemo =
  process.env.NEXT_PUBLIC_INVESTOR_DEMO ?? (process.env.VERCEL ? 'true' : 'false');

const config: NextConfig = {
  transpilePackages: ['@atlas/ui'],
  env: { NEXT_PUBLIC_INVESTOR_DEMO: investorDemo },
};
export default config;
