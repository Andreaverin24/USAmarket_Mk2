import type { Metadata } from 'next';
import { ProductDetail } from '../../../../../components/product-detail';
import { api, type PublicProduct } from '../../../../../lib/api';
import { productJsonLd } from '../../../../../lib/product-jsonld';
export const dynamic = 'force-dynamic';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ sellerSlug: string; productSlug: string }>;
}): Promise<Metadata> {
  const { sellerSlug, productSlug } = await params;
  try {
    const product = await api<PublicProduct>(`/storefronts/${sellerSlug}/products/${productSlug}`);
    return {
      title: `${product.title} | ${product.organization.name}`,
      description: product.shortDescription ?? undefined,
      alternates: { canonical: `/dealers/${sellerSlug}/products/${productSlug}` },
    };
  } catch {
    return { title: 'Product | DecorFlavor' };
  }
}
export default async function StorefrontProduct({
  params,
}: {
  params: Promise<{ sellerSlug: string; productSlug: string }>;
}) {
  const { sellerSlug, productSlug } = await params;
  try {
    const product = await api<PublicProduct>(`/storefronts/${sellerSlug}/products/${productSlug}`);
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              productJsonLd(product, `/dealers/${sellerSlug}/products/${productSlug}`),
            ).replace(/</g, '\\u003c'),
          }}
        />
        <ProductDetail
          product={product}
          backHref={`/dealers/${sellerSlug}`}
          backLabel={product.organization.name}
        />
      </>
    );
  } catch {
    return <main className="df-state">This object is no longer available.</main>;
  }
}
