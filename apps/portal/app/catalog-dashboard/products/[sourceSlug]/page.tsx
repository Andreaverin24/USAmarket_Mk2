'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './page.module.css';

interface Evidence {
  source: string;
  confidence: number;
}

interface ExtractedProduct {
  sourceUrl: string;
  externalId?: string;
  title?: string;
  description?: string;
  productType?: string;
  sku?: string;
  priceMinor?: string;
  currency?: string;
  condition?: string;
  conditionDescription?: string;
  width?: string;
  height?: string;
  depth?: string;
  diameter?: string;
  seatHeight?: string;
  dimensionUnit?: string;
  weight?: string;
  weightUnit?: string;
  pieceCount?: number;
  materials?: string[];
  colors?: string[];
  styles?: string[];
  era?: string;
  periods?: string[];
  maker?: string;
  designer?: string;
  manufacturer?: string;
  modelName?: string;
  medium?: string;
  countryOfOrigin?: string;
  estimatedYearFrom?: number;
  estimatedYearTo?: number;
  provenanceText?: string;
  restorationNotes?: string;
  authenticityNotes?: string;
  signedDetails?: string;
  editionDetails?: string;
  literature?: string;
  exhibitionHistory?: string;
  imageUrls?: string[];
  attributes?: Record<string, string | number | boolean | string[]>;
  provenance?: Record<string, Evidence>;
  captureMethod?: string;
  source?: {
    name?: string;
    key?: string;
    adapterKey?: string;
    adapterVersion?: string;
  };
  listing?: {
    canonicalUrl?: string;
    availability?: string;
    saleType?: string;
    priceMinor?: string;
    currency?: string;
    sourceSku?: string;
  };
}

interface PilotRow {
  id: string;
  rowNumber: number;
  status: string;
  payload: { candidate?: ExtractedProduct };
  normalizedPayload?: ExtractedProduct;
}

interface PilotFile {
  rows: PilotRow[];
  createdAt: string;
}

interface MirrorEntry {
  productId: string;
  total: number;
  ready: number;
  failed: number;
  stored: number;
  variants: number;
  originalBytes: number;
  variantBytes: number;
}

interface MirrorReport {
  generatedAt: string;
  products: Record<string, MirrorEntry>;
}

const money = (minor?: string, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(minor ?? 0) / 100);

const sourceSlug = (url?: string) => {
  if (!url) return '';
  try {
    return new URL(url).pathname.split('/').filter(Boolean).at(-1) ?? '';
  } catch {
    return '';
  }
};

const list = (values?: string[]) => (values?.length ? values.join(', ') : undefined);

export default function CatalogProductDetailPage() {
  const params = useParams<{ sourceSlug: string }>();
  const [pilot, setPilot] = useState<PilotFile>();
  const [mirror, setMirror] = useState<MirrorReport>();
  const [selectedImage, setSelectedImage] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const [pilotResponse, mirrorResponse] = await Promise.all([
          fetch('/pilots/established-lines-30.json'),
          fetch('/pilots/established-lines-media-status.json'),
        ]);
        if (!pilotResponse.ok) throw new Error('Pilot catalog is unavailable');
        setPilot((await pilotResponse.json()) as PilotFile);
        if (mirrorResponse.ok) setMirror((await mirrorResponse.json()) as MirrorReport);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Unable to load product');
      }
    })();
  }, []);

  const row = useMemo(
    () =>
      pilot?.rows.find((candidate) => {
        const item = candidate.normalizedPayload ?? candidate.payload.candidate;
        return sourceSlug(item?.sourceUrl) === params.sourceSlug;
      }),
    [params.sourceSlug, pilot],
  );
  const product = row?.normalizedPayload ?? row?.payload.candidate;
  const mediaStatus = mirror?.products[params.sourceSlug];
  const images = product?.imageUrls ?? [];
  const rowIndex = pilot?.rows.findIndex((candidate) => candidate.id === row?.id) ?? -1;
  const slugAt = (index: number) => {
    const candidate = pilot?.rows[index];
    const item = candidate?.normalizedPayload ?? candidate?.payload.candidate;
    return sourceSlug(item?.sourceUrl);
  };
  const previousSlug = rowIndex > 0 ? slugAt(rowIndex - 1) : '';
  const nextSlug =
    rowIndex >= 0 && rowIndex < (pilot?.rows.length ?? 0) - 1 ? slugAt(rowIndex + 1) : '';

  const showPreviousImage = useCallback(() => {
    if (!images.length) return;
    setSelectedImage((current) => (current - 1 + images.length) % images.length);
  }, [images.length]);

  const showNextImage = useCallback(() => {
    if (!images.length) return;
    setSelectedImage((current) => (current + 1) % images.length);
  }, [images.length]);

  useEffect(() => setSelectedImage(0), [params.sourceSlug]);

  if (error)
    return (
      <main className={styles.state}>
        <h1>Product unavailable</h1>
        <p>{error}</p>
        <Link href="/catalog-dashboard">Back to dashboard</Link>
      </main>
    );

  if (!pilot)
    return (
      <main className={styles.state} aria-live="polite">
        <span className={styles.loader} aria-hidden="true" />
        <p>Loading product details…</p>
      </main>
    );

  if (!product)
    return (
      <main className={styles.state}>
        <h1>Product not found</h1>
        <p>The requested product is not part of the 30-card pilot snapshot.</p>
        <Link href="/catalog-dashboard">Back to dashboard</Link>
      </main>
    );

  const dimensions = [
    product.width ? `W ${product.width}` : '',
    product.height ? `H ${product.height}` : '',
    product.depth ? `D ${product.depth}` : '',
    product.diameter ? `Ø ${product.diameter}` : '',
    product.seatHeight ? `Seat ${product.seatHeight}` : '',
  ]
    .filter(Boolean)
    .join(' × ');
  const specificationRows = [
    ['SKU', product.sku],
    ['Product type', product.productType],
    ['Condition', product.condition],
    ['Dimensions', dimensions ? `${dimensions} ${product.dimensionUnit ?? 'in'}` : undefined],
    ['Weight', product.weight ? `${product.weight} ${product.weightUnit ?? 'lb'}` : undefined],
    ['Pieces', product.pieceCount?.toString()],
    ['Materials', list(product.materials)],
    ['Colors', list(product.colors)],
    ['Styles', list(product.styles)],
    ['Era', product.era],
    ['Periods', list(product.periods)],
    ['Maker', product.maker],
    ['Designer', product.designer],
    ['Manufacturer', product.manufacturer],
    ['Model', product.modelName],
    ['Medium', product.medium],
    ['Country of origin', product.countryOfOrigin],
    [
      'Estimated year',
      product.estimatedYearFrom
        ? `${product.estimatedYearFrom}${product.estimatedYearTo ? `–${product.estimatedYearTo}` : ''}`
        : undefined,
    ],
  ];
  const narrativeRows = [
    ['Condition notes', product.conditionDescription],
    ['Provenance', product.provenanceText],
    ['Restoration', product.restorationNotes],
    ['Authenticity', product.authenticityNotes],
    ['Signed details', product.signedDetails],
    ['Edition', product.editionDetails],
    ['Literature', product.literature],
    ['Exhibition history', product.exhibitionHistory],
  ].flatMap(([label, value]) => (value ? ([[label, value]] as Array<[string, string]>) : []));
  const evidence = Object.entries(product.provenance ?? {}).sort(([left], [right]) =>
    left.localeCompare(right),
  );

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/catalog-dashboard" className={styles.backLink}>
          <span aria-hidden="true">←</span> All 30 products
        </Link>
        <nav aria-label="Product navigation">
          {previousSlug ? (
            <Link href={`/catalog-dashboard/products/${encodeURIComponent(previousSlug)}`}>
              ← Previous
            </Link>
          ) : (
            <span aria-disabled="true">← Previous</span>
          )}
          <strong>
            {row?.rowNumber ?? '—'} / {pilot.rows.length}
          </strong>
          {nextSlug ? (
            <Link href={`/catalog-dashboard/products/${encodeURIComponent(nextSlug)}`}>Next →</Link>
          ) : (
            <span aria-disabled="true">Next →</span>
          )}
        </nav>
        <div className={styles.statuses}>
          <span>DRAFT</span>
          <span data-availability={product.listing?.availability ?? row?.status ?? 'UNKNOWN'}>
            {product.listing?.availability ?? row?.status ?? 'UNKNOWN'}
          </span>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.gallery}>
          <div
            className={styles.mainImage}
            tabIndex={0}
            aria-label="Product gallery. Use left and right arrow keys to change image."
            onKeyDown={(event) => {
              if (event.key === 'ArrowLeft') showPreviousImage();
              if (event.key === 'ArrowRight') showNextImage();
            }}
          >
            {images[selectedImage] ? (
              <a href={images[selectedImage]} target="_blank" rel="noreferrer">
                <img src={images[selectedImage]} alt={product.title ?? 'Product'} />
              </a>
            ) : (
              <div>No image supplied</div>
            )}
            <button
              type="button"
              className={styles.previousImage}
              onClick={showPreviousImage}
              disabled={images.length < 2}
              aria-label="Show previous image"
            >
              ←
            </button>
            <button
              type="button"
              className={styles.nextImage}
              onClick={showNextImage}
              disabled={images.length < 2}
              aria-label="Show next image"
            >
              →
            </button>
            <div className={styles.imageCounter} aria-live="polite">
              <strong>
                {images.length ? `${selectedImage + 1} / ${images.length}` : '0 images'}
              </strong>
              <span>Use arrow keys</span>
            </div>
          </div>
          <div className={styles.thumbnails} aria-label="Product image gallery">
            {images.map((image, index) => (
              <button
                key={image}
                type="button"
                aria-label={`Show image ${index + 1}`}
                aria-pressed={selectedImage === index}
                title={`Image ${index + 1} of ${images.length}`}
                onClick={() => setSelectedImage(index)}
              >
                <img src={image} alt="" />
              </button>
            ))}
          </div>
        </div>

        <aside className={styles.summary}>
          <p className={styles.kicker}>{product.source?.name ?? 'Established Lines'}</p>
          <h1>{product.title ?? 'Untitled product'}</h1>
          <strong>{money(product.priceMinor, product.currency)}</strong>
          <div className={styles.quickFacts}>
            <span>{product.condition ?? 'Condition unknown'}</span>
            <span>{images.length} photos</span>
            <span>{product.productType ?? 'Collectible'}</span>
          </div>
          <p>{product.description ?? 'No description supplied by the source.'}</p>
          <dl>
            <div>
              <dt>Availability</dt>
              <dd>{product.listing?.availability ?? 'Not provided'}</dd>
            </div>
            <div>
              <dt>Sale type</dt>
              <dd>{product.listing?.saleType ?? 'Not provided'}</dd>
            </div>
            <div>
              <dt>Images discovered</dt>
              <dd>{images.length}</dd>
            </div>
            <div>
              <dt>Storage mirror</dt>
              <dd>
                {mediaStatus ? `${mediaStatus.ready}/${mediaStatus.total} ready` : 'Status pending'}
              </dd>
            </div>
          </dl>
          {mediaStatus ? (
            <div className={styles.archiveStatus}>
              <div>
                <span>Media archive</span>
                <strong>
                  {mediaStatus.ready === mediaStatus.total ? 'Complete' : 'Processing'}
                </strong>
              </div>
              <progress max={mediaStatus.total || 1} value={mediaStatus.ready}>
                {mediaStatus.ready} of {mediaStatus.total}
              </progress>
            </div>
          ) : null}
          <a
            href={product.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className={styles.sourceLink}
          >
            Open original listing ↗
          </a>
        </aside>
      </section>

      <section className={styles.contentGrid}>
        <article className={styles.panel}>
          <p className={styles.kicker}>Canonical fields</p>
          <h2>Specifications</h2>
          <dl className={styles.specifications}>
            {specificationRows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value || 'Not provided'}</dd>
              </div>
            ))}
          </dl>
        </article>

        <article className={styles.panel}>
          <p className={styles.kicker}>Media custody</p>
          <h2>Independent copies</h2>
          {mediaStatus ? (
            <div className={styles.mediaMetrics}>
              <div>
                <strong>{mediaStatus.stored}</strong>
                <span>originals stored</span>
              </div>
              <div>
                <strong>{mediaStatus.variants}</strong>
                <span>generated variants</span>
              </div>
              <div>
                <strong>{mediaStatus.failed}</strong>
                <span>failed</span>
              </div>
              <div>
                <strong>
                  {((mediaStatus.originalBytes + mediaStatus.variantBytes) / 1024 / 1024).toFixed(
                    1,
                  )}{' '}
                  MB
                </strong>
                <span>stored bytes</span>
              </div>
            </div>
          ) : (
            <p>Media mirror status will appear after the worker exports its verification report.</p>
          )}
          <p className={styles.note}>
            The gallery uses source URLs for this local pilot. The mirror preserves validated
            originals and optimized variants under deterministic product/media keys.
          </p>
        </article>
      </section>

      {narrativeRows.length ? (
        <section className={styles.panel}>
          <p className={styles.kicker}>Catalog narrative</p>
          <h2>Condition, provenance and references</h2>
          <div className={styles.narratives}>
            {narrativeRows.map(([label, value]) => (
              <article key={label}>
                <h3>{label}</h3>
                <p>{value}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className={styles.panel}>
        <p className={styles.kicker}>Extraction evidence</p>
        <h2>Where each field came from</h2>
        <div className={styles.evidenceTable}>
          <div className={styles.evidenceHeader}>
            <span>Field</span>
            <span>Source path</span>
            <span>Confidence</span>
          </div>
          {evidence.map(([field, entry]) => (
            <div key={field}>
              <code>{field}</code>
              <span>{entry.source}</span>
              <strong data-low={entry.confidence < 0.7}>
                {Math.round(entry.confidence * 100)}%
              </strong>
            </div>
          ))}
        </div>
        <details className={styles.rawData}>
          <summary>Normalized JSON and technical trace</summary>
          <pre>{JSON.stringify(product, null, 2)}</pre>
        </details>
      </section>
    </main>
  );
}
