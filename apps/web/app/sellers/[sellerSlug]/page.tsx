import type { Metadata } from 'next';
import Link from 'next/link';
import { ProductCard } from '../../../components/product-card';
import { api, type PaginatedProducts } from '../../../lib/api';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sellerSlug: string }>;
}): Promise<Metadata> {
  const { sellerSlug } = await params;
  return {
    title: `${sellerSlug.replace(/-/g, ' ')} — DecorFlavor seller`,
    alternates: { canonical: `/sellers/${sellerSlug}` },
  };
}

export default async function SellerPage({ params }: { params: Promise<{ sellerSlug: string }> }) {
  const { sellerSlug } = await params;
  try {
    const products = await api<PaginatedProducts>(
      `/catalog/products?seller=${encodeURIComponent(sellerSlug)}`,
    );
    const sellerName = products.items[0]?.organization.name ?? sellerSlug.replace(/-/g, ' ');
    return (
      <main className="catalog-page">
        <header className="page-header">
          <p className="eyebrow">Professional seller · {products.total} objects</p>
          <h1>{sellerName}</h1>
          <Link className="button" href={`/dealers/${sellerSlug}`}>
            Visit seller storefront
          </Link>
        </header>
        <section className="product-grid">
          {products.items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </section>
      </main>
    );
  } catch {
    return <main className="state">Seller not found.</main>;
  }
}
