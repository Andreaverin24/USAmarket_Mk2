import type { MetadataRoute } from 'next';
import { api } from '../lib/api';

interface SitemapData {
  products: Array<{ slug: string; updatedAt: string; organization: { slug: string } }>;
  categories: Array<{ slug: string; updatedAt: string }>;
  sellers: Array<{ slug: string; updatedAt: string }>;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const data = await api<SitemapData>('/catalog/sitemap');
  return [
    { url: base, lastModified: new Date(), priority: 1 },
    { url: `${base}/catalog`, lastModified: new Date(), priority: 0.9 },
    ...data.categories.map((category) => ({
      url: `${base}/categories/${category.slug}`,
      lastModified: category.updatedAt,
      priority: 0.7,
    })),
    ...data.sellers.map((seller) => ({
      url: `${base}/sellers/${seller.slug}`,
      lastModified: seller.updatedAt,
      priority: 0.7,
    })),
    ...data.products.map((product) => ({
      url: `${base}/products/${product.slug}`,
      lastModified: product.updatedAt,
      priority: 0.8,
    })),
  ];
}
