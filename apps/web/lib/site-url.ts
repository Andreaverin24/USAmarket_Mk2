const localSiteUrl = 'http://localhost:3000';
const productionSiteUrl = 'https://decorflavor.com';

function normalizeSiteUrl(value: string) {
  const withProtocol =
    value.startsWith('http://') || value.startsWith('https://') ? value : `https://${value}`;

  return new URL(withProtocol).origin;
}

const fallbackSiteUrl = process.env.VERCEL ? productionSiteUrl : localSiteUrl;

export const siteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL ?? fallbackSiteUrl);
