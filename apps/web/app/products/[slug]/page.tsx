import type { Metadata } from 'next';
import Link from 'next/link';
import { api, type PublicProduct } from '../../../lib/api';
import { productJsonLd } from '../../../lib/product-jsonld';
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
      title: `${product.title} — Atlas`,
      description: product.shortDescription ?? product.description?.slice(0, 160),
      alternates: { canonical: `/products/${product.slug}` },
    };
  } catch {
    return { title: 'Product — Atlas' };
  }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let product: PublicProduct;
  try {
    product = await api<PublicProduct>(`/catalog/products/${slug}`);
  } catch {
    return <main className="state">Product not found.</main>;
  }
  const canonical = `/products/${product.slug}`;
  const jsonLd = productJsonLd(product, canonical);
  return (
    <main className="product-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <Link href="/catalog">← Catalog</Link>
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
          {product.maker ?? product.organization.name} · {product.category.name}
        </p>
        <h1>{product.title}</h1>
        <p className="price">
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: product.currency }).format(
            Number(product.priceMinor) / 100,
          )}
        </p>
        <p>{product.description}</p>
        <p className="availability">
          {product.inventory?.status === 'AVAILABLE' ? 'Available' : 'Currently unavailable'}
        </p>
        <dl>
          <dt>Condition</dt>
          <dd>{product.condition}</dd>
          <dt>Materials</dt>
          <dd>{product.materials.join(', ') || '—'}</dd>
          <dt>Dimensions</dt>
          <dd>
            {[product.width, product.height, product.depth].filter(Boolean).join(' × ') ||
              'Available on request'}
          </dd>
          <dt>Provenance</dt>
          <dd>{product.provenance || 'Available on request'}</dd>
        </dl>
        <p className="seller-link">
          Presented by{' '}
          <Link href={`/dealers/${product.organization.slug}`}>{product.organization.name}</Link>
        </p>
      </article>
    </main>
  );
}
