import type { Metadata } from 'next';
import { MarketplaceFooter, MarketplaceHeader } from '../../../components/marketplace-chrome';
import { ProductCard } from '../../../components/product-card';
import { api, type PaginatedProducts } from '../../../lib/api';

export const dynamic = 'force-dynamic';
interface Category {
  name: string;
  slug: string;
  description: string | null;
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const category = await api<Category>(`/catalog/categories/${slug}`);
    return {
      title: `${category.name} | DecorFlavor`,
      description: category.description ?? `Shop curated ${category.name.toLowerCase()}.`,
      alternates: { canonical: `/categories/${category.slug}` },
    };
  } catch {
    return { title: 'Category | DecorFlavor' };
  }
}
export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; sort?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  try {
    const [category, products] = await Promise.all([
      api<Category>(`/catalog/categories/${slug}`),
      api<PaginatedProducts>(
        `/catalog/products?category=${encodeURIComponent(slug)}&page=${encodeURIComponent(query.page ?? '1')}&sort=${encodeURIComponent(query.sort ?? 'newest')}`,
      ),
    ]);
    return (
      <div className="df-page-shell">
        <MarketplaceHeader active="catalog" />
        <main className="df-catalog-page">
          <header className="df-page-hero df-category-hero">
            <p className="df-kicker">
              Category <span>·</span> {products.total} objects
            </p>
            <h1>{category.name}</h1>
            <p>
              {category.description ??
                `A considered edit of ${category.name.toLowerCase()} chosen for enduring form and material.`}
            </p>
            <a className="df-text-action" href="/catalog">
              Browse all objects
            </a>
          </header>
          {products.items.length ? (
            <section className="df-product-grid">
              {products.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </section>
          ) : (
            <p className="df-state">
              This edit is being refreshed. Explore the full collection in the meantime.
            </p>
          )}
        </main>
        <MarketplaceFooter />
      </div>
    );
  } catch {
    return (
      <div className="df-page-shell">
        <MarketplaceHeader active="catalog" />
        <main className="df-state">Category not found.</main>
        <MarketplaceFooter />
      </div>
    );
  }
}
