import { MarketplaceHome } from '../components/marketplace-home';
import { api, type DiscoveryProduct } from '../lib/api';
import { establishedLinesSnapshot, snapshotFacets } from '../lib/established-lines-snapshot';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'DecorFlavor — curated furniture and decor',
  description: 'Discover verified furniture, lighting, art and decor from professional sellers.',
};

type HomeFacets = { colors: string[]; eras: string[] };

export default async function HomePage() {
  let products: DiscoveryProduct[] = [];
  let facets: HomeFacets = { colors: [], eras: [] };
  let catalogAvailable = true;
  let catalogMode: 'live' | 'snapshot' = 'live';

  try {
    const [catalog, catalogFacets] = await Promise.all([
      api<DiscoveryProduct[]>('/catalog/spotlight?limit=24'),
      api<HomeFacets>('/catalog/facets'),
    ]);
    products = catalog;
    facets = catalogFacets;
  } catch {
    products = establishedLinesSnapshot();
    facets = snapshotFacets(products);
    catalogAvailable = products.length > 0;
    catalogMode = 'snapshot';
  }

  return (
    <MarketplaceHome
      catalogAvailable={catalogAvailable}
      catalogMode={catalogMode}
      facets={facets}
      products={products}
    />
  );
}
