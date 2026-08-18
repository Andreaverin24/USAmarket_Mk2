import { MarketplaceHome } from '../components/marketplace-home';
import { api, type PublicProduct } from '../lib/api';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'DecorFlavor — curated furniture and decor',
  description: 'Discover verified furniture, lighting, art and decor from professional sellers.',
};

type HomeFacets = { colors: string[]; eras: string[] };

export default async function HomePage() {
  let products: PublicProduct[] = [];
  let facets: HomeFacets = { colors: [], eras: [] };
  let catalogAvailable = true;

  try {
    const [catalog, catalogFacets] = await Promise.all([
      api<PublicProduct[]>('/catalog/spotlight?limit=24'),
      api<HomeFacets>('/catalog/facets'),
    ]);
    products = catalog;
    facets = catalogFacets;
  } catch {
    catalogAvailable = false;
  }

  return (
    <MarketplaceHome catalogAvailable={catalogAvailable} facets={facets} products={products} />
  );
}
