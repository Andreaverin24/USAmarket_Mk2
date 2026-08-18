import Link from 'next/link';
import type { PublicProduct } from '../lib/api';
import { MarketplaceFooter, MarketplaceHeader } from './marketplace-chrome';

const formatPrice = (product: PublicProduct) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: product.currency }).format(
    Number(product.priceMinor) / 100,
  );

export function ProductDetail({
  product,
  backHref,
  backLabel,
}: {
  product: PublicProduct;
  backHref: string;
  backLabel: string;
}) {
  const dimensions = [product.width, product.height, product.depth].filter(Boolean).join(' × ');
  const images = product.media.filter((media) => media.sourceUrl).slice(0, 3);

  return (
    <div className="df-page-shell">
      <MarketplaceHeader active="catalog" />
      <main className="df-product-page">
        <Link className="df-back-link" href={backHref}>
          ← {backLabel}
        </Link>
        <section className="df-product-layout">
          <div className="df-product-gallery">
            {images.length ? (
              images.map((media, index) => (
                <figure
                  className={index === 0 ? 'is-primary' : ''}
                  key={media.storageKey ?? `${media.sourceUrl}-${index}`}
                >
                  <img
                    alt={media.altText ?? `${product.title} view ${index + 1}`}
                    src={media.sourceUrl ?? undefined}
                  />
                </figure>
              ))
            ) : (
              <div className="df-product-empty-image">{product.category.name}</div>
            )}
          </div>
          <article className="df-product-summary">
            <p className="df-kicker">
              {product.maker ?? product.organization.name} <span>·</span> {product.category.name}
            </p>
            <h1>{product.title}</h1>
            <p className="df-product-price">{formatPrice(product)}</p>
            <p
              className="df-availability"
              data-available={product.inventory?.status === 'AVAILABLE'}
            >
              {product.inventory?.status === 'AVAILABLE'
                ? 'Available to enquire'
                : 'Availability on request'}
            </p>
            {product.description ? (
              <p className="df-product-description">{product.description}</p>
            ) : null}
            <div className="df-product-actions">
              <a
                className="df-button"
                href={`mailto:design@decorflavor.com?subject=${encodeURIComponent(`Enquiry — ${product.title}`)}`}
              >
                Enquire about this piece
              </a>
              <a
                className="df-text-action"
                href={`mailto:design@decorflavor.com?subject=${encodeURIComponent(`Project sourcing — ${product.title}`)}`}
              >
                Add to a project
              </a>
            </div>
            <dl className="df-product-specs">
              <dt>Condition</dt>
              <dd>{product.condition.replaceAll('_', ' ')}</dd>
              <dt>Materials</dt>
              <dd>{product.materials.join(', ') || 'Available on request'}</dd>
              <dt>Dimensions</dt>
              <dd>{dimensions || 'Available on request'}</dd>
              <dt>Provenance</dt>
              <dd>{product.provenance || 'Available on request'}</dd>
              {product.restorationNotes ? (
                <>
                  <dt>Restoration</dt>
                  <dd>{product.restorationNotes}</dd>
                </>
              ) : null}
            </dl>
            <p className="df-presented-by">
              Presented by{' '}
              <Link href={`/dealers/${product.organization.slug}`}>
                {product.organization.name}
              </Link>
            </p>
          </article>
        </section>
      </main>
      <MarketplaceFooter />
    </div>
  );
}
