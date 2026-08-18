import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketplaceFooter, MarketplaceHeader } from '../../../components/marketplace-chrome';
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
    title: `${sellerSlug.replace(/-/g, ' ')} | DecorFlavor`,
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
      <div className="df-page-shell">
        <MarketplaceHeader active="designers" />
        <main className="df-catalog-page">
          <header className="df-page-hero df-category-hero">
            <p className="df-kicker">
              Professional seller <span>·</span> {products.total} objects
            </p>
            <h1>{sellerName}</h1>
            <p>Explore a considered inventory selected and presented by this specialist seller.</p>
            <Link className="df-button" href={`/dealers/${sellerSlug}`}>
              Visit storefront
            </Link>
          </header>
          <section className="df-product-grid">
            {products.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </section>
        </main>
        <MarketplaceFooter />
      </div>
    );
  } catch {
    return <main className="df-state">Seller not found.</main>;
  }
}
