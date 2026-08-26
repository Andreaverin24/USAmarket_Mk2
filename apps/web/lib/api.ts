export const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export async function api<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`DecorFlavor API ${response.status}`);
  return response.json() as Promise<T>;
}

export interface PublicProduct {
  id: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  priceMinor: string;
  currency: string;
  condition: string;
  materials: string[];
  colors: string[];
  styles: string[];
  era: string | null;
  maker: string | null;
  provenance: string | null;
  restorationNotes: string | null;
  sku?: string | null;
  productType?: string | null;
  sourceUrl?: string | null;
  conditionDescription?: string | null;
  dimensionUnit?: string | null;
  diameter?: string | null;
  seatHeight?: string | null;
  width: string | null;
  height: string | null;
  depth: string | null;
  category: { name: string; slug: string };
  organization: { name: string; slug: string };
  inventory: { quantityAvailable: number; status: string } | null;
  attributes: Array<{ name: string; value: string }>;
  media: Array<{
    sourceUrl: string | null;
    storageKey: string | null;
    altText: string | null;
    processingStatus: string;
    mediaVariants: Array<{
      kind: string;
      format: string;
      storageKey: string;
      width: number;
      height: number;
    }>;
  }>;
}

export type DiscoveryProduct = PublicProduct;

export interface PaginatedProducts {
  items: PublicProduct[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
