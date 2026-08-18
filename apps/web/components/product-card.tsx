import Link from 'next/link';
import type { PublicProduct } from '../lib/api';

export function ProductCard({
  product,
  storefront,
}: {
  product: PublicProduct;
  storefront?: string;
}) {
  const href = storefront
    ? `/dealers/${storefront}/products/${product.slug}`
    : `/products/${product.slug}`;
  const image = product.media[0]?.sourceUrl;

  return (
    <article className="df-product-card">
      <Link href={href} className="df-product-card-image">
        {image ? (
          <img src={image} alt={product.media[0]?.altText ?? product.title} />
        ) : (
          <span className="df-image-placeholder">{product.category.name}</span>
        )}
        <span className="df-product-card-status">
          {product.inventory?.status === 'AVAILABLE' ? 'Available' : 'View details'}
        </span>
      </Link>
      <div className="df-product-card-copy">
        <p>
          {product.maker ?? product.organization.name} <span>·</span> {product.category.name}
        </p>
        <h2>
          <Link href={href}>{product.title}</Link>
        </h2>
        <div>
          <strong>
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: product.currency,
            }).format(Number(product.priceMinor) / 100)}
          </strong>
          <span>{product.condition.replaceAll('_', ' ')}</span>
        </div>
      </div>
    </article>
  );
}
