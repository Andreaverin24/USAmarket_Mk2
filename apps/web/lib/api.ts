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

/**
 * A product rendered on the discovery page may come from the checked-in
 * Established Lines snapshot while the local API is starting.  Live API
 * responses do not set this field; snapshot cards link to the verified
 * canonical source instead of pretending that a local order can be placed.
 */
export type DiscoveryProduct = PublicProduct & {
  sourceListingUrl?: string;
};

export interface PaginatedProducts {
  items: PublicProduct[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
