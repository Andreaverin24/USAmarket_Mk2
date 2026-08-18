import type { MetadataRoute } from 'next';
import { api } from '../lib/api';
import { siteUrl } from '../lib/site-url';

interface SitemapData {
  products: Array<{ slug: string; updatedAt: string; organization: { slug: string } }>;
  categories: Array<{ slug: string; updatedAt: string }>;
  sellers: Array<{ slug: string; updatedAt: string }>;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await api<SitemapData>('/catalog/sitemap');
  return [
    { url: siteUrl, lastModified: new Date(), priority: 1 },
    { url: `${siteUrl}/catalog`, lastModified: new Date(), priority: 0.9 },
    ...data.categories.map((category) => ({
      url: `${siteUrl}/categories/${category.slug}`,
      lastModified: category.updatedAt,
      priority: 0.7,
    })),
    ...data.sellers.map((seller) => ({
      url: `${siteUrl}/sellers/${seller.slug}`,
      lastModified: seller.updatedAt,
      priority: 0.7,
    })),
    ...data.products.map((product) => ({
      url: `${siteUrl}/products/${product.slug}`,
      lastModified: product.updatedAt,
      priority: 0.8,
    })),
  ];
}
