import { MarketplaceHome } from '../../components/marketplace-home';
import { loadMarketplaceCatalog } from '../../lib/marketplace-catalog';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Catalog - DecorFlavor',
  description: 'Curated furniture, lighting, art and objects from professional sellers.',
};

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const catalog = await loadMarketplaceCatalog();
  return (
    <MarketplaceHome
      catalogAvailable={catalog.products.length > 0}
      catalogMode={catalog.mode}
      experience="catalog"
      facets={catalog.facets}
      initialQuery={q ?? ''}
      products={catalog.products}
    />
  );
}
