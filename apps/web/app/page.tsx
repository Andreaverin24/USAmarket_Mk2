import { MarketplaceHome } from '../components/marketplace-home';
import { loadMarketplaceCatalog } from '../lib/marketplace-catalog';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'DecorFlavor — curated furniture and decor',
  description: 'Discover verified furniture, lighting, art and decor from professional sellers.',
};

export default async function HomePage() {
  const catalog = await loadMarketplaceCatalog();

  return (
    <MarketplaceHome
      catalogAvailable={catalog.products.length > 0}
      catalogMode={catalog.mode}
      experience="home"
      facets={catalog.facets}
      products={catalog.products}
    />
  );
}
