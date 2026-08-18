import type { Metadata } from 'next';
import { ProductDetail } from '../../../components/product-detail';
import { api, type PublicProduct } from '../../../lib/api';
import { productJsonLd } from '../../../lib/product-jsonld';
import { ReserveItemButton } from '../../../components/reserve-item-button';
export const dynamic = 'force-dynamic';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await api<PublicProduct>(`/catalog/products/${slug}`);
    return {
      title: `${product.title} — DecorFlavor`,
      description: product.shortDescription ?? product.description?.slice(0, 160),
      alternates: { canonical: `/products/${product.slug}` },
    };
  } catch {
    return { title: 'Product — DecorFlavor' };
  }
}
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const product = await api<PublicProduct>(`/catalog/products/${slug}`);
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(productJsonLd(product, `/products/${product.slug}`)).replace(
              /</g,
              '\\u003c',
            ),
          }}
        />
        <ProductDetail
          product={product}
          backHref="/catalog"
          backLabel="Back to collection"
          primaryAction={
            product.inventory?.status === 'AVAILABLE' && product.inventory.quantityAvailable > 0 ? (
              <ReserveItemButton productId={product.id} slug={product.slug} />
            ) : undefined
          }
        />
      </>
    );
  } catch {
    return <main className="df-state">This object is no longer available.</main>;
  }
}
