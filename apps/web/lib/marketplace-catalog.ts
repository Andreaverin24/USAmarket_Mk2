import { api, type DiscoveryProduct, type PaginatedProducts } from './api';
import { establishedLinesSnapshot, snapshotFacets } from './established-lines-snapshot';

export type MarketplaceFacets = {
  materials: string[];
  colors: string[];
  styles: string[];
  eras: string[];
};

export type MarketplaceCatalog = {
  products: DiscoveryProduct[];
  facets: MarketplaceFacets;
  mode: 'live' | 'snapshot';
};

export async function loadMarketplaceCatalog(): Promise<MarketplaceCatalog> {
  try {
    const [firstPage, facets] = await Promise.all([
      api<PaginatedProducts>('/catalog/products?page=1&pageSize=100&sort=newest'),
      api<MarketplaceFacets>('/catalog/facets'),
    ]);
    const remainingPages = Array.from(
      { length: Math.min(Math.max(firstPage.totalPages - 1, 0), 4) },
      (_, index) => index + 2,
    );
    const remaining = await Promise.all(
      remainingPages.map((page) =>
        api<PaginatedProducts>(`/catalog/products?page=${page}&pageSize=100&sort=newest`),
      ),
    );
    return {
      products: [firstPage, ...remaining].flatMap((page) => page.items),
      facets,
      mode: 'live',
    };
  } catch {
    const products = establishedLinesSnapshot();
    const snapshot = snapshotFacets(products);
    return {
      products,
      facets: { ...snapshot, materials: [], styles: [] },
      mode: 'snapshot',
    };
  }
}
