import { api, type PaginatedProducts } from '../../lib/api';
import { ProductCard } from '../../components/product-card';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Catalog — Atlas Marketplace',
  description: 'Vintage, antique and contemporary furniture from professional sellers.',
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
    <main className="catalog-page">
      <header className="page-header">
        <p className="eyebrow">Marketplace</p>
        <h1>Curated catalog</h1>
      </header>
      <form className="filters">
        <input
          name="q"
          defaultValue={typeof params.q === 'string' ? params.q : ''}
          placeholder="Search maker, material, object…"
        />
        <select
          name="condition"
          defaultValue={typeof params.condition === 'string' ? params.condition : ''}
        >
          <option value="">All conditions</option>
          <option>EXCELLENT</option>
          <option>GOOD</option>
          <option>RESTORED</option>
          <option>NEW</option>
        </select>
        <select
          name="material"
          defaultValue={typeof params.material === 'string' ? params.material : ''}
        >
          <option value="">All materials</option>
          {facets.materials.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <select name="style" defaultValue={typeof params.style === 'string' ? params.style : ''}>
          <option value="">All styles</option>
          {facets.styles.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <select name="color" defaultValue={typeof params.color === 'string' ? params.color : ''}>
          <option value="">All colors</option>
          {facets.colors.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <select name="sort" defaultValue={typeof params.sort === 'string' ? params.sort : 'newest'}>
          <option value="newest">Newest</option>
          <option value="price_asc">Price low to high</option>
          <option value="price_desc">Price high to low</option>
          <option value="featured">Featured</option>
        </select>
        <button>Apply</button>
      </form>
      {error ? (
        <p className="state">Catalog is temporarily unavailable.</p>
      ) : result.items.length ? (
        <>
          <p className="count">{result.total} objects</p>
          <section className="product-grid">
            {result.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </section>
          <nav className="pagination" aria-label="Catalog pages">
            {result.page > 1 ? (
              <a
                href={`?${new URLSearchParams({ ...Object.fromEntries(query), page: String(result.page - 1) })}`}
              >
                Previous
              </a>
            ) : (
              <span />
            )}
            <span>
              Page {result.page} of {result.totalPages}
            </span>
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
        <p className="state">No objects match these filters.</p>
      )}
    </main>
  );
}
