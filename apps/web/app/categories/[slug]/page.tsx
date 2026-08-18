import type { Metadata } from 'next';
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
      title: `${category.name} — DecorFlavor`,
      description: category.description ?? `Shop curated ${category.name.toLowerCase()}.`,
      alternates: { canonical: `/categories/${category.slug}` },
    };
  } catch {
    return { title: 'Category — DecorFlavor' };
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
      <main className="catalog-page">
        <header className="page-header">
          <p className="eyebrow">Category · {products.total} objects</p>
          <h1>{category.name}</h1>
          {category.description ? <p>{category.description}</p> : null}
        </header>
        <section className="product-grid">
          {products.items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </section>
      </main>
    );
  } catch {
    return <main className="state">Category not found.</main>;
  }
}
