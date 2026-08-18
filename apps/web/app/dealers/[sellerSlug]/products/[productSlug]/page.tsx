import type { Metadata } from 'next';
import Link from 'next/link';
import { api, type PublicProduct } from '../../../../../lib/api';
import { ProductCard } from '../../../../../components/product-card';
import { productJsonLd } from '../../../../../lib/product-jsonld';
import {
  establishedLinesSnapshot,
  establishedLinesSnapshotProduct,
  isEstablishedLinesStorefront,
} from '../../../../../lib/established-lines-snapshot';
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
      title: `${product.title} — ${product.organization.name}`,
      description: product.shortDescription ?? undefined,
      alternates: { canonical: `/dealers/${sellerSlug}/products/${productSlug}` },
    };
  } catch {
    const fallback = isEstablishedLinesStorefront(sellerSlug)
      ? establishedLinesSnapshotProduct(productSlug)
      : null;
    if (fallback) {
      return {
        title: `${fallback.title} — Established Lines | DecorFlavor`,
        description: fallback.shortDescription ?? undefined,
        alternates: { canonical: `/dealers/${sellerSlug}/products/${productSlug}` },
      };
    }
    return { title: 'Product' };
  }
}
export default async function StorefrontProduct({
  params,
}: {
  params: Promise<{ sellerSlug: string; productSlug: string }>;
}) {
  const { sellerSlug, productSlug } = await params;
  let product: PublicProduct;
  let related: PublicProduct[] = [];
  try {
    const [item, home] = await Promise.all([
      api<PublicProduct>(`/storefronts/${sellerSlug}/products/${productSlug}`),
      api<{ products: PublicProduct[] }>(`/storefronts/${sellerSlug}`),
    ]);
    product = item;
    related = home.products.filter((candidate) => candidate.id !== item.id).slice(0, 3);
  } catch {
    const fallback = isEstablishedLinesStorefront(sellerSlug)
      ? establishedLinesSnapshotProduct(productSlug)
      : null;
    if (!fallback) return <main className="state">Product not found.</main>;
    product = fallback;
    related = establishedLinesSnapshot().filter((candidate) => candidate.id !== fallback.id).slice(0, 3);
  }
  const canonical = `/dealers/${sellerSlug}/products/${productSlug}`;
  return (
    <main>
      <section className="product-page">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(productJsonLd(product, canonical)).replace(/</g, '\\u003c'),
          }}
        />
        <Link href={`/dealers/${sellerSlug}`}>← {product.organization.name}</Link>
        <div className="gallery">
          <div className="product-image hero-image">
            {product.media[0]?.sourceUrl ? (
              <img src={product.media[0].sourceUrl} alt={product.title} />
            ) : (
              <span>{product.category.name}</span>
            )}
          </div>
        </div>
        <article className="product-detail">
          <p className="eyebrow">
            {product.maker} · {product.styles.join(', ')}
          </p>
          <h1>{product.title}</h1>
          <p className="price">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: product.currency,
            }).format(Number(product.priceMinor) / 100)}
          </p>
          <p>{product.description}</p>
          <p className="availability">
            {product.inventory?.status === 'AVAILABLE'
              ? 'Available · Gallery pickup by appointment'
              : 'Currently unavailable'}
          </p>
          <dl>
            <dt>Condition</dt>
            <dd>{product.condition}</dd>
            <dt>Era</dt>
            <dd>{product.era || 'Available on request'}</dd>
            <dt>Materials</dt>
            <dd>{product.materials.join(', ')}</dd>
            <dt>Origin</dt>
            <dd>{product.organization.name}</dd>
            <dt>Provenance</dt>
            <dd>{product.provenance || 'Available on request'}</dd>
            <dt>Restoration</dt>
            <dd>{product.restorationNotes || 'No restoration notes supplied'}</dd>
          </dl>
          <button className="button" disabled>
            Buy Now
          </button>
          <p id="purchase-note">Online purchasing is not yet available for this object.</p>
          <a
            className="button secondary"
            href={`mailto:design@establishedlines.local?subject=${encodeURIComponent(`Shipping estimate — ${product.title}`)}`}
          >
            Request Shipping Estimate
          </a>
          <a
            href={`mailto:design@establishedlines.local?subject=${encodeURIComponent(`Question — ${product.title}`)}`}
          >
            Ask a Question
          </a>
        </article>
      </section>
      {related.length ? (
        <section className="storefront-section">
          <header>
            <p className="eyebrow">Continue looking</p>
            <h2>Related objects</h2>
          </header>
          <div className="product-grid">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} storefront={sellerSlug} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
