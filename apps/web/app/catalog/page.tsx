import { MarketplaceFooter, MarketplaceHeader } from '../../components/marketplace-chrome';
import { ProductCard } from '../../components/product-card';
import { api, type PaginatedProducts } from '../../lib/api';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Catalog | DecorFlavor',
  description: 'Curated furniture, lighting and objects from professional sellers.',
};

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const key of ['q', 'category', 'condition', 'sort', 'style', 'material', 'color', 'page']) {
    const value = params[key];
    if (typeof value === 'string' && value) query.set(key, value);
  }
  let result: PaginatedProducts = { items: [], page: 1, pageSize: 24, total: 0, totalPages: 1 };
  let facets: { materials: string[]; colors: string[]; styles: string[] } = {
    materials: [],
    colors: [],
    styles: [],
  };
  let error = false;
  try {
    [result, facets] = await Promise.all([
      api<PaginatedProducts>(`/catalog/products?${query}`),
      api<{ materials: string[]; colors: string[]; styles: string[] }>('/catalog/facets'),
    ]);
  } catch {
    error = true;
  }
  return (
    <div className="df-page-shell">
      <MarketplaceHeader active="catalog" />
      <main className="df-catalog-page">
        <header className="df-page-hero">
          <p className="df-kicker">The collection</p>
          <h1>Objects with a point of view.</h1>
          <p>
            Discover furniture, lighting and objects selected for material, proportion and lasting
            presence.
          </p>
        </header>
        <form className="df-catalog-toolbar">
          <label>
            <span>Search the collection</span>
            <input
              name="q"
              defaultValue={typeof params.q === 'string' ? params.q : ''}
              placeholder="Maker, material, object or era"
            />
          </label>
          <label>
            <span>Material</span>
            <select
              name="material"
              defaultValue={typeof params.material === 'string' ? params.material : ''}
            >
              <option value="">All materials</option>
              {facets.materials.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Style</span>
            <select
              name="style"
              defaultValue={typeof params.style === 'string' ? params.style : ''}
            >
              <option value="">All styles</option>
              {facets.styles.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Sort</span>
            <select
              name="sort"
              defaultValue={typeof params.sort === 'string' ? params.sort : 'newest'}
            >
              <option value="newest">New arrivals</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="featured">Curated edit</option>
            </select>
          </label>
          <button className="df-button">Refine</button>
        </form>
        {error ? (
          <p className="df-state">
            The collection is temporarily unavailable. Please try again shortly.
          </p>
        ) : result.items.length ? (
          <>
            <div className="df-results-meta">
              <span>{result.total} curated objects</span>
              <span>Selected from professional sellers</span>
            </div>
            <section className="df-product-grid">
              {result.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </section>
            <nav className="df-pagination" aria-label="Catalog pages">
              {result.page > 1 ? (
                <a
                  href={`?${new URLSearchParams({ ...Object.fromEntries(query), page: String(result.page - 1) })}`}
                >
                  Previous
                </a>
              ) : (
                <span />
              )}
              {result.totalPages > 1 ? (
                <span>
                  Page {result.page} of {result.totalPages}
                </span>
              ) : null}
              {result.page < result.totalPages ? (
                <a
                  href={`?${new URLSearchParams({ ...Object.fromEntries(query), page: String(result.page + 1) })}`}
                >
                  Next
                </a>
              ) : (
                <span />
              )}
            </nav>
          </>
        ) : (
          <p className="df-state">No objects match these filters. Try a broader search.</p>
        )}
      </main>
      <MarketplaceFooter />
    </div>
  );
}
