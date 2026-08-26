import Link from 'next/link';
import type { ReactNode } from 'react';
import type { PublicProduct } from '../lib/api';
import { MarketplaceFooter, MarketplaceHeader } from './marketplace-chrome';
import { ProductGallery } from './product-gallery';

const formatPrice = (product: PublicProduct) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: product.currency,
    maximumFractionDigits: 0,
  }).format(Number(product.priceMinor) / 100);

const list = (values: string[]) => values.filter(Boolean).join(', ');

export function ProductDetail({
  product,
  backHref,
  backLabel,
  primaryAction,
}: {
  product: PublicProduct;
  backHref: string;
  backLabel: string;
  primaryAction?: ReactNode;
}) {
  const unit = product.dimensionUnit ?? 'in';
  const dimensions = [
    product.width ? `W ${product.width}` : '',
    product.height ? `H ${product.height}` : '',
    product.depth ? `D ${product.depth}` : '',
    product.diameter ? `Dia ${product.diameter}` : '',
    product.seatHeight ? `Seat H ${product.seatHeight}` : '',
  ]
    .filter(Boolean)
    .join(' × ');
  const images = product.media.flatMap((media) =>
    media.sourceUrl
      ? [{ sourceUrl: media.sourceUrl, altText: media.altText ?? product.title }]
      : [],
  );
  const details = [
    ['Era', product.era],
    ['Maker', product.maker],
    ['Category', product.category.name],
    ['Object type', product.productType],
    ['Materials', list(product.materials)],
    ['Colours', list(product.colors)],
    ['Styles', list(product.styles)],
    ['Dimensions', dimensions ? `${dimensions} ${unit}` : null],
    ['Condition', product.condition.replaceAll('_', ' ')],
    ['Reference', product.sku],
  ].filter((row): row is [string, string] => Boolean(row[1]));

  return (
    <div className="df-page-shell df-product-experience">
      <MarketplaceHeader active="catalog" />
      <main className="df-product-page">
        <nav aria-label="Breadcrumb" className="df-product-breadcrumb">
          <Link href="/">DecorFlavor</Link>
          <span>/</span>
          <Link href={backHref}>{backLabel}</Link>
          <span>/</span>
          <span aria-current="page">{product.category.name}</span>
        </nav>

        <section className="df-product-layout">
          <ProductGallery images={images} title={product.title} />
          <aside className="df-product-summary">
            <div className="df-product-eyebrow-row">
              <p className="df-kicker">{product.era ?? 'Collectible design'}</p>
              <span>{images.length} photos</span>
            </div>
            <h1>{product.title}</h1>
            <p className="df-product-byline">
              Presented by{' '}
              <Link href={`/dealers/${product.organization.slug}`}>
                {product.organization.name}
              </Link>
            </p>
            <div className="df-product-commerce">
              <p className="df-product-price">{formatPrice(product)}</p>
              <p
                className="df-availability"
                data-available={product.inventory?.status === 'AVAILABLE'}
              >
                {product.inventory?.status === 'AVAILABLE'
                  ? 'Available'
                  : 'Availability on request'}
              </p>
            </div>
            {dimensions ? (
              <p className="df-product-dimensions">
                {dimensions} {unit}
              </p>
            ) : null}
            <div className="df-product-actions">
              {primaryAction ?? (
                <a
                  className="df-button"
                  href={`mailto:design@decorflavor.com?subject=${encodeURIComponent(`Enquiry - ${product.title}`)}`}
                >
                  Request information
                </a>
              )}
              <a
                className="df-text-action"
                href={`mailto:design@decorflavor.com?subject=${encodeURIComponent(`Project sourcing - ${product.title}`)}`}
              >
                Add to a project
              </a>
            </div>
            <div className="df-product-service-points">
              <div>
                <strong>Professional seller</strong>
                <span>Presented with source evidence</span>
              </div>
              <div>
                <strong>Delivery coordination</strong>
                <span>Quote confirmed before purchase</span>
              </div>
              <div>
                <strong>Condition disclosed</strong>
                <span>Review details before enquiring</span>
              </div>
            </div>
            <details open>
              <summary>Object details</summary>
              <dl className="df-product-specs">
                {details.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </details>
            <details>
              <summary>Delivery and returns</summary>
              <p>
                Final delivery options, insurance and timing are confirmed with the gallery before
                an order is accepted.
              </p>
            </details>
          </aside>
        </section>

        <section className="df-product-editorial">
          <article>
            <p className="df-kicker">About this piece</p>
            <h2>Details that make the object.</h2>
            <p>{product.description ?? 'The seller has not supplied a full description yet.'}</p>
          </article>
          <aside>
            <p className="df-kicker">Condition & provenance</p>
            <p>
              {product.conditionDescription ??
                `Condition recorded as ${product.condition.replaceAll('_', ' ').toLowerCase()}.`}
            </p>
            {product.provenance ? <p>{product.provenance}</p> : null}
            {product.restorationNotes ? <p>{product.restorationNotes}</p> : null}
            {product.attributes.map((attribute) => (
              <p key={attribute.name}>
                <strong>{attribute.name}:</strong> {attribute.value}
              </p>
            ))}
          </aside>
        </section>

        <section className="df-dealer-panel">
          <div>
            <p className="df-kicker">The seller</p>
            <h2>{product.organization.name}</h2>
            <p>
              Explore the gallery's complete DecorFlavor storefront, compare related pieces and
              contact the seller through one consistent product record.
            </p>
          </div>
          <div>
            <Link className="df-button" href={`/dealers/${product.organization.slug}`}>
              Visit the storefront
            </Link>
            {product.sourceUrl ? (
              <a
                className="df-text-action"
                href={product.sourceUrl}
                rel="noreferrer"
                target="_blank"
              >
                View source listing
              </a>
            ) : null}
          </div>
        </section>
      </main>
      <MarketplaceFooter />
    </div>
  );
}
