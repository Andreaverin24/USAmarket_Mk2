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
    <article className="product-card">
      <Link href={href} className="product-image">
        {image ? (
          <img src={image} alt={product.media[0]?.altText ?? product.title} />
        ) : (
          <span>{product.category.name}</span>
        )}
      </Link>
      <p className="product-meta">
        {product.maker ?? product.organization.name} · {product.condition.replaceAll('_', ' ')}
      </p>
      <h2>
        <Link href={href}>{product.title}</Link>
      </h2>
      <p className="price">
        {new Intl.NumberFormat('en-US', { style: 'currency', currency: product.currency }).format(
          Number(product.priceMinor) / 100,
        )}
      </p>
    </article>
  );
}
