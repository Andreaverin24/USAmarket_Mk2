'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { request } from '../../lib/api';
import styles from './page.module.css';

interface Organization {
  id: string;
  slug: string;
  name: string;
}

interface Me {
  memberships: Array<{ organization: Organization }>;
}

interface Listing {
  id: string;
  canonicalUrl?: string | null;
  availability: string;
  saleType: string;
  priceMinor?: string | null;
  currency?: string | null;
  lastSeenAt: string;
  source: { name: string; key: string; adapterKey: string };
  _count: { snapshots: number };
}

interface Product {
  id: string;
  title: string;
  status: string;
  condition: string;
  conditionDescription?: string | null;
  productType: string;
  era?: string | null;
  inventorySku: string;
  priceMinor: string;
  currency: string;
  pieceCount: number;
  width?: string | null;
  height?: string | null;
  depth?: string | null;
  dimensionUnit: string;
  sourceRefreshLocked: boolean;
  updatedAt: string;
  inventory?: { quantityAvailable: number; status: string } | null;
  media: Array<{
    id: string;
    sourceUrl?: string | null;
    processingStatus: string;
    isPrimary: boolean;
  }>;
  externalListings: Listing[];
}

interface ExtractedProduct {
  source?: {
    name?: string;
    key?: string;
    baseUrl?: string;
    adapterKey?: string;
  };
  sourceUrl: string;
  title?: string;
  productType?: string;
  era?: string;
  priceMinor?: string;
  currency?: string;
  sku?: string;
  condition?: string;
  conditionDescription?: string;
  width?: string;
  height?: string;
  depth?: string;
  seatHeight?: string;
  dimensionUnit?: string;
  pieceCount?: number;
  imageUrls?: string[];
  listing?: { availability?: string; saleType?: string };
}

type ConnectionMode = 'CHECKING' | 'CONNECTED' | 'SNAPSHOT' | 'ERROR';

interface ImportRow {
  id: string;
  rowNumber: number;
  status: string;
  payload: {
    sourceUrl?: string;
    finalUrl?: string;
    captureMethod?: string;
    candidate?: ExtractedProduct;
  };
  normalizedPayload?: ExtractedProduct;
  errors?: string[];
}

interface ImportJob {
  id: string;
  source: string;
  status: string;
  totalRows: number;
  validRows: number;
  importedRows: number;
  failedRows: number;
  createdAt: string;
  completedAt?: string | null;
  lastError?: string | null;
  rows?: ImportRow[];
  _count?: { rows: number };
}

const money = (minor: string | number | null | undefined, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(minor ?? 0) / 100);

const dateTime = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(value))
    : '—';

const sourceSlug = (url?: string | null) => {
  if (!url) return '';
  try {
    return new URL(url).pathname.split('/').filter(Boolean).at(-1) ?? '';
  } catch {
    return '';
  }
};

const readableSourceName = (value?: string | null) => {
  const normalized = value
    ?.trim()
    .replace(/^www\./i, '')
    .replace(/\.(com|net|org|co|io)(\/.*)?$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ');
  if (!normalized) return 'Partner catalog';
  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const INVESTOR_MODE = process.env.NEXT_PUBLIC_INVESTOR_DEMO === 'true';

export default function CatalogDashboardPage() {
  const [organization, setOrganization] = useState<Organization>();
  const [products, setProducts] = useState<Product[]>([]);
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [preview, setPreview] = useState<ImportJob>();
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('CHECKING');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('Loading catalog dashboard…');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [availability, setAvailability] = useState('ALL');
  const [siteUrl, setSiteUrl] = useState('https://www.establishedlines.com/');
  const [categoryUrlsText, setCategoryUrlsText] = useState(
    'https://www.establishedlines.com/collections/all',
  );
  const [maxProducts, setMaxProducts] = useState(30);
  const [maxCategoryPages, setMaxCategoryPages] = useState(5);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);

  async function refresh(selected = organization) {
    if (!selected) return;
    const [catalog, imports] = await Promise.all([
      request<Product[]>(`/organizations/${selected.id}/catalog/products`),
      request<ImportJob[]>(`/organizations/${selected.id}/imports`),
    ]);
    setProducts(catalog);
    setJobs(imports);
  }

  useEffect(() => {
    void (async () => {
      if (INVESTOR_MODE) {
        try {
          const response = await fetch('/pilots/established-lines-30.json');
          if (!response.ok) throw new Error('Investor catalog snapshot is unavailable');
          const localPilot = (await response.json()) as ImportJob;
          setPreview(localPilot);
          setConnectionMode('SNAPSHOT');
          setNotice('');
        } catch (error) {
          setConnectionMode('ERROR');
          setNotice(error instanceof Error ? error.message : 'Unable to load investor preview');
        }
        return;
      }

      try {
        const me = await request<Me>('/auth/me');
        const selected =
          me.memberships.find((entry) => entry.organization.slug === 'established-lines')
            ?.organization ?? me.memberships[0]?.organization;
        if (!selected) throw new Error('No seller organization is available');
        setOrganization(selected);
        await refresh(selected);
        setConnectionMode('CONNECTED');
        setNotice('');
      } catch (error) {
        try {
          const response = await fetch('/pilots/established-lines-30.json');
          if (!response.ok) throw new Error('Local pilot preview is unavailable');
          const localPilot = (await response.json()) as ImportJob;
          setPreview(localPilot);
          setConnectionMode('SNAPSHOT');
          setNotice(
            `Local pilot view: ${localPilot.validRows}/${localPilot.totalRows} valid cards. Sign in to manage the persisted DRAFT catalog.`,
          );
        } catch {
          setConnectionMode('ERROR');
          setNotice(error instanceof Error ? error.message : 'Unable to load catalog dashboard');
        }
      }
    })();
  }, []);

  const filteredProducts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((product) => {
      const listing = product.externalListings[0];
      const matchesQuery =
        !needle ||
        [
          product.title,
          product.inventorySku,
          product.productType,
          product.era,
          listing?.source.name,
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(needle));
      const matchesStatus = status === 'ALL' || product.status === status;
      const matchesAvailability = availability === 'ALL' || listing?.availability === availability;
      return matchesQuery && matchesStatus && matchesAvailability;
    });
  }, [availability, products, query, status]);

  const previewCards = useMemo(
    () =>
      (preview?.rows ?? []).flatMap((row) => {
        const item = row.normalizedPayload ?? row.payload.candidate;
        return item ? [{ row, item }] : [];
      }),
    [preview],
  );

  const filteredPreviewCards = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return previewCards.filter(({ item }) => {
      const matchesQuery =
        !needle ||
        [item.title, item.sku, item.productType, item.era, item.sourceUrl]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(needle));
      const matchesAvailability =
        availability === 'ALL' || item.listing?.availability === availability;
      return matchesQuery && matchesAvailability;
    });
  }, [availability, previewCards, query]);

  const metrics = useMemo(() => {
    const previewProducts = (preview?.rows ?? [])
      .map((row) => row.normalizedPayload ?? row.payload.candidate)
      .filter((product): product is ExtractedProduct => Boolean(product));
    if (!products.length && previewProducts.length) {
      const available = previewProducts.filter(
        (product) => product.listing?.availability === 'AVAILABLE',
      ).length;
      const withMedia = previewProducts.filter((product) => product.imageUrls?.length).length;
      const totalValue = previewProducts.reduce(
        (sum, product) => sum + Number(product.priceMinor ?? 0),
        0,
      );
      return {
        total: previewProducts.length,
        available,
        withMedia,
        drafts: previewProducts.length,
        totalValue,
      };
    }
    const available = products.filter(
      (product) => product.externalListings[0]?.availability === 'AVAILABLE',
    ).length;
    const withMedia = products.filter((product) => product.media.length > 0).length;
    const drafts = products.filter((product) => product.status === 'DRAFT').length;
    const totalValue = products.reduce((sum, product) => sum + Number(product.priceMinor), 0);
    return { total: products.length, available, withMedia, drafts, totalValue };
  }, [preview, products]);

  const sourceName = useMemo(() => {
    const extractedName = previewCards[0]?.item.source?.name;
    if (extractedName) return readableSourceName(extractedName);
    if (organization?.name) return readableSourceName(organization.name);
    try {
      return readableSourceName(new URL(siteUrl).hostname);
    } catch {
      return readableSourceName(siteUrl);
    }
  }, [organization?.name, previewCards, siteUrl]);

  const importEnabled = connectionMode === 'CONNECTED' && Boolean(organization);

  async function poll(jobId: string, terminal: string[]) {
    if (!organization) throw new Error('Organization is unavailable');
    for (let attempt = 0; attempt < 900; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const job = await request<ImportJob>(`/organizations/${organization.id}/imports/${jobId}`);
      setPreview(job);
      setNotice(
        job.status === 'FAILED'
          ? `Import failed: ${job.lastError ?? 'unknown error'}`
          : `${job.status}: ${job.validRows} valid · ${job.importedRows} imported · ${job.failedRows} failed`,
      );
      if (terminal.includes(job.status)) return job;
    }
    throw new Error('Import did not finish within fifteen minutes');
  }

  async function startPreview() {
    if (!organization || !importEnabled) {
      setNotice('Connect the API and sign in before starting a source scan.');
      return;
    }

    const categoryUrls = [
      ...new Set(
        categoryUrlsText
          .split(/\r?\n/)
          .map((url) => url.trim())
          .filter(Boolean),
      ),
    ];

    try {
      const site = new URL(siteUrl);
      if (!['http:', 'https:'].includes(site.protocol)) throw new Error();
      if (!categoryUrls.length) throw new Error('Add at least one category URL.');
      if (categoryUrls.length > 20) throw new Error('Use no more than 20 category URLs.');
      for (const categoryUrl of categoryUrls) {
        const category = new URL(categoryUrl);
        if (category.origin !== site.origin) {
          throw new Error('Every category URL must use the same origin as the website.');
        }
      }
    } catch (error) {
      setNotice(error instanceof Error && error.message ? error.message : 'Check the website URL.');
      return;
    }

    setBusy(true);
    setRightsConfirmed(false);
    setPreview(undefined);
    setNotice('Scanning category pages and extracting product cards…');
    try {
      const job = await request<ImportJob>(`/organizations/${organization.id}/imports/web`, {
        method: 'POST',
        body: JSON.stringify({
          siteUrl,
          categoryUrls,
          maxProducts,
          maxCategoryPages,
          idempotencyKey: `dashboard-web-preview-${Date.now()}`,
        }),
      });
      setPreview(job);
      await poll(job.id, ['VALIDATED', 'FAILED']);
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Website scan failed');
    } finally {
      setBusy(false);
    }
  }

  async function loadJob(jobId: string) {
    if (!organization) return;
    setBusy(true);
    try {
      const job = await request<ImportJob>(`/organizations/${organization.id}/imports/${jobId}`);
      setPreview(job);
      setRightsConfirmed(false);
      setNotice(`Loaded ${job.status.toLowerCase()} import from ${dateTime(job.createdAt)}.`);
    } finally {
      setBusy(false);
    }
  }

  async function applyPreview() {
    if (!organization || !preview || preview.status !== 'VALIDATED' || !rightsConfirmed) return;
    setBusy(true);
    setNotice('Creating DRAFT products and source evidence…');
    try {
      await request(`/organizations/${organization.id}/imports/${preview.id}/apply`, {
        method: 'POST',
        body: JSON.stringify({ rightsConfirmed: true }),
      });
      await poll(preview.id, ['COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED']);
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Apply failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.dashboard}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>
            {INVESTOR_MODE ? 'DecorFlavor · Investor preview' : 'DecorFlavor · Catalog intelligence'}
          </p>
          <h1>{INVESTOR_MODE ? 'Catalog intelligence' : 'Product dashboard'}</h1>
          <p>
            {INVESTOR_MODE
              ? 'A structured, marketplace-ready view of the Established Lines source catalog.'
              : `${organization?.name ?? 'Seller catalog'} · canonical cards, source listings and import evidence`}
          </p>
        </div>
        <nav aria-label="Dashboard navigation">
          <a href={products.length ? '#catalog' : '#snapshot'}>Catalog</a>
          {!INVESTOR_MODE ? (
            <>
              <a href="#import">Import</a>
              <Link href="/products">Operations</Link>
              <Link href="/notifications">Notifications</Link>
              <button
                disabled={busy}
                onClick={() => (organization ? void refresh() : window.location.reload())}
              >
                {connectionMode === 'CONNECTED' ? 'Refresh' : 'Reconnect'}
              </button>
            </>
          ) : null}
        </nav>
      </header>

      {notice ? (
        <div className={styles.notice} role="status" aria-live="polite" data-busy={busy}>
          <span aria-hidden="true" />
          {notice}
        </div>
      ) : null}

      <section className={styles.metrics} aria-label="Catalog metrics">
        <article>
          <span>Canonical products</span>
          <strong>{metrics.total}</strong>
          <small>{INVESTOR_MODE ? 'structured source cards' : `${metrics.drafts} drafts`}</small>
        </article>
        <article>
          <span>Available now</span>
          <strong>{metrics.available}</strong>
          <small>source listing in stock</small>
        </article>
        <article>
          <span>Cards with media</span>
          <strong>{metrics.withMedia}</strong>
          <small>{metrics.total - metrics.withMedia} need images</small>
        </article>
        <article>
          <span>Catalog asking value</span>
          <strong>{money(metrics.totalValue)}</strong>
          <small>across loaded cards</small>
        </article>
      </section>

      <section className={styles.importWorkspace} id="import">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.kicker}>Partner catalog</p>
            <h2>
              {sourceName} · {metrics.total}-card{' '}
              {connectionMode === 'SNAPSHOT' ? 'snapshot' : 'catalog'}
            </h2>
            <p className={styles.sectionDescription}>
              {INVESTOR_MODE
                ? 'Explore the captured assortment, structured fields and complete product galleries.'
                : 'Browse the current catalog, then configure one or several category URLs for the next source scan.'}
            </p>
          </div>
          <span className={styles.safeBadge} data-mode={connectionMode}>
            {INVESTOR_MODE
              ? 'Investor preview · Read only'
              : connectionMode === 'CONNECTED'
                ? 'Live import enabled'
                : 'Read-only snapshot'}
          </span>
        </div>

        <div className={styles.connectionPanel} data-mode={connectionMode} hidden={INVESTOR_MODE}>
          <span className={styles.connectionDot} aria-hidden="true" />
          <div>
            <strong>
              {connectionMode === 'CONNECTED'
                ? 'Ready to scan a source website'
                : connectionMode === 'CHECKING'
                  ? 'Checking import services'
                  : connectionMode === 'SNAPSHOT'
                    ? 'This local snapshot is read-only'
                    : 'Import services are unavailable'}
            </strong>
            <p>
              {connectionMode === 'CONNECTED'
                ? 'API and seller session are connected. Worker health is confirmed when the queued scan starts processing.'
                : 'Start the API and worker, sign in as a seller, then reconnect this dashboard to enable new scans.'}
            </p>
          </div>
          {connectionMode !== 'CONNECTED' ? (
            <Link href="/login">Sign in to enable imports</Link>
          ) : null}
        </div>

        <details className={styles.importTools} hidden={INVESTOR_MODE}>
          <summary>
            <span>Import settings</span>
            <small>Website, categories and crawl budgets</small>
          </summary>
          <div className={styles.importForm}>
            <label>
              Website
              <input
                type="url"
                value={siteUrl}
                onChange={(event) => setSiteUrl(event.target.value)}
              />
            </label>
            <label className={styles.categoryField}>
              Categories
              <textarea
                rows={3}
                value={categoryUrlsText}
                onChange={(event) => setCategoryUrlsText(event.target.value)}
                aria-describedby="category-help"
              />
            </label>
            <label>
              Products
              <input
                type="number"
                min={1}
                max={200}
                value={maxProducts}
                onChange={(event) =>
                  setMaxProducts(Math.min(200, Math.max(1, Number(event.target.value) || 1)))
                }
              />
            </label>
            <label>
              Pages / category
              <input
                type="number"
                min={1}
                max={20}
                value={maxCategoryPages}
                onChange={(event) =>
                  setMaxCategoryPages(Math.min(20, Math.max(1, Number(event.target.value) || 1)))
                }
              />
            </label>
            <button
              disabled={busy || !importEnabled}
              onClick={() => void startPreview()}
              title={importEnabled ? undefined : 'Connect API and sign in to enable source scans'}
            >
              {busy ? 'Working…' : 'Start preview scan'}
            </button>
            <p className={styles.importHelp} id="category-help">
              One category URL per line · up to 20 categories · 200 products · 20 pages per
              category. Category URLs must belong to the website above.
            </p>
          </div>
        </details>

        {preview && !INVESTOR_MODE ? (
          <div className={styles.previewSummary}>
            <div>
              <span>Import {preview.id.slice(0, 8)}</span>
              <strong>{preview.status}</strong>
            </div>
            <div>
              <span>Found</span>
              <strong>{preview.totalRows}</strong>
            </div>
            <div>
              <span>Valid</span>
              <strong>{preview.validRows}</strong>
            </div>
            <div>
              <span>Invalid</span>
              <strong>{preview.failedRows}</strong>
            </div>
          </div>
        ) : null}

        {previewCards.length ? (
          <>
            <div className={styles.catalogToolbar} id="snapshot">
              <label className={styles.searchField}>
                <span>Search snapshot</span>
                <input
                  type="search"
                  placeholder="Title, SKU or product type"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <label>
                <span>Availability</span>
                <select
                  value={availability}
                  onChange={(event) => setAvailability(event.target.value)}
                >
                  <option value="ALL">All availability</option>
                  <option value="AVAILABLE">Available</option>
                  <option value="RESERVED">Reserved</option>
                  <option value="SOLD">Sold</option>
                  <option value="UNAVAILABLE">Unavailable</option>
                </select>
              </label>
              <p>
                <strong>{filteredPreviewCards.length}</strong>
                <span>of {previewCards.length} cards</span>
              </p>
            </div>
            <div className={styles.previewGrid}>
              {filteredPreviewCards.map(({ row, item }) => {
                const detailSlug = sourceSlug(item?.sourceUrl);
                return (
                  <article className={styles.previewCard} key={row.id}>
                    <div className={styles.previewImage}>
                      {item.imageUrls?.[0] ? (
                        <img src={item.imageUrls[0]} alt={item.title ?? 'Catalog product'} />
                      ) : (
                        <div className={styles.imageFallback}>No image</div>
                      )}
                      <span data-availability={item.listing?.availability ?? 'UNKNOWN'}>
                        {item.listing?.availability ?? row.status}
                      </span>
                      <small>{item.imageUrls?.length ?? 0} photos</small>
                    </div>
                    <div className={styles.previewBody}>
                      <div className={styles.cardMeta}>
                        <span className={styles.rowNumber}>#{row.rowNumber}</span>
                        {item.era ? <span className={styles.eraTag}>{item.era}</span> : null}
                      </div>
                      <h3>{item?.title ?? row.payload.sourceUrl ?? 'Extraction failed'}</h3>
                      <strong className={styles.previewPrice}>
                        {item.priceMinor
                          ? money(item.priceMinor, item.currency)
                          : 'Price unavailable'}
                      </strong>
                      <small>
                        {item.width && item.height
                          ? `${item.width} × ${item.height}${item.depth ? ` × ${item.depth}` : ''} ${item.dimensionUnit ?? 'in'}`
                          : (item.conditionDescription ??
                            row.payload.captureMethod ??
                            'No details')}
                      </small>
                      {row.errors?.length ? (
                        <p className={styles.error}>{row.errors.join('; ')}</p>
                      ) : null}
                      {detailSlug ? (
                        <Link
                          className={styles.detailsLink}
                          href={`/catalog-dashboard/products/${encodeURIComponent(detailSlug)}`}
                        >
                          View full card →
                        </Link>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
            {!filteredPreviewCards.length ? (
              <div className={styles.emptyState}>
                <strong>No matching cards</strong>
                <p>Try a broader search or show every availability.</p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setAvailability('ALL');
                  }}
                >
                  Reset filters
                </button>
              </div>
            ) : null}
          </>
        ) : null}

        {organization && preview?.status === 'VALIDATED' && preview.validRows > 0 ? (
          <div className={styles.applyBar}>
            <label>
              <input
                type="checkbox"
                checked={rightsConfirmed}
                onChange={(event) => setRightsConfirmed(event.target.checked)}
              />
              I confirm authorization to import this partner catalog and its images.
            </label>
            <button disabled={!rightsConfirmed || busy} onClick={() => void applyPreview()}>
              Create {preview.validRows} DRAFT cards
            </button>
          </div>
        ) : null}
      </section>

      {jobs.length ? (
        <section className={styles.history} id="history">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.kicker}>Audit trail</p>
              <h2>Recent imports</h2>
            </div>
          </div>
          <div className={styles.historyList}>
            {jobs.slice(0, 8).map((job) => (
              <button key={job.id} onClick={() => void loadJob(job.id)}>
                <span className={styles.statusDot} data-status={job.status} />
                <strong>{job.source.toUpperCase()}</strong>
                <span>{job.status}</span>
                <span>
                  {job.importedRows || job.validRows}/{job.totalRows || job._count?.rows || 0}
                </span>
                <time>{dateTime(job.createdAt)}</time>
              </button>
            ))}
            {!jobs.length ? <p>No imports yet.</p> : null}
          </div>
        </section>
      ) : null}

      {products.length ? (
        <section className={styles.catalog} id="catalog">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.kicker}>Canonical inventory</p>
              <h2>Marketplace-ready cards</h2>
            </div>
            <span>{filteredProducts.length} shown</span>
          </div>
          <div className={styles.filters}>
            <input
              type="search"
              placeholder="Search title, SKU, category or source"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="ALL">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
            <select value={availability} onChange={(event) => setAvailability(event.target.value)}>
              <option value="ALL">All availability</option>
              <option value="AVAILABLE">Available</option>
              <option value="RESERVED">Reserved</option>
              <option value="SOLD">Sold</option>
              <option value="UNAVAILABLE">Unavailable</option>
            </select>
          </div>
          <div className={styles.productGrid}>
            {filteredProducts.map((product) => {
              const listing = product.externalListings[0];
              const primary = product.media.find((media) => media.isPrimary) ?? product.media[0];
              const detailSlug = sourceSlug(listing?.canonicalUrl ?? primary?.sourceUrl);
              return (
                <article className={styles.productCard} key={product.id}>
                  <div className={styles.productImage}>
                    {primary?.sourceUrl ? (
                      <img src={primary.sourceUrl} alt={product.title} />
                    ) : (
                      <div className={styles.imageFallback}>Media pending</div>
                    )}
                    <span data-availability={listing?.availability ?? 'UNKNOWN'}>
                      {listing?.availability ?? product.inventory?.status ?? 'UNKNOWN'}
                    </span>
                  </div>
                  <div className={styles.productBody}>
                    <div className={styles.productMeta}>
                      <span>{product.productType}</span>
                      <span>{product.era ?? 'Era not set'}</span>
                      <span>{product.status}</span>
                    </div>
                    <h3>{product.title}</h3>
                    <strong className={styles.price}>
                      {money(product.priceMinor, product.currency)}
                    </strong>
                    <dl>
                      <div>
                        <dt>SKU</dt>
                        <dd>{product.inventorySku}</dd>
                      </div>
                      <div>
                        <dt>Condition</dt>
                        <dd>{product.condition}</dd>
                      </div>
                      <div>
                        <dt>Dimensions</dt>
                        <dd>
                          {product.width && product.height
                            ? `${product.width} × ${product.height}${product.depth ? ` × ${product.depth}` : ''} ${product.dimensionUnit}`
                            : '—'}
                        </dd>
                      </div>
                      <div>
                        <dt>Evidence</dt>
                        <dd>{listing?._count.snapshots ?? 0} snapshots</dd>
                      </div>
                    </dl>
                    <footer>
                      <span>{listing?.source.name ?? 'Manual'}</span>
                      {detailSlug ? (
                        <Link
                          className={styles.detailsLink}
                          href={`/catalog-dashboard/products/${encodeURIComponent(detailSlug)}`}
                        >
                          Details
                        </Link>
                      ) : null}
                      {listing?.canonicalUrl ? (
                        <a href={listing.canonicalUrl} target="_blank" rel="noreferrer">
                          Source ↗
                        </a>
                      ) : null}
                    </footer>
                  </div>
                </article>
              );
            })}
            {!filteredProducts.length ? (
              <div className={styles.emptyState}>No cards match the selected filters.</div>
            ) : null}
          </div>
        </section>
      ) : null}
    </main>
  );
}
