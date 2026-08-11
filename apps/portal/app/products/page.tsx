'use client';
import { useEffect, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { request } from '../../lib/api';

interface Me {
  memberships: Array<{ organization: { id: string; slug: string; name: string } }>;
}
interface Product {
  id: string;
  title: string;
  slug: string;
  status: string;
  priceMinor: string;
  version: number;
  inventorySku: string;
}
interface Category {
  id: string;
  name: string;
}
interface ImportJob {
  id: string;
  source?: string;
  status: string;
  totalRows: number;
  validRows: number;
  importedRows: number;
  failedRows: number;
  lastError?: string;
  rows?: ImportRow[];
}
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
interface ExtractedProduct {
  sourceUrl: string;
  title?: string;
  priceMinor?: string;
  currency?: string;
  sku?: string;
  maker?: string;
  imageUrls?: string[];
}

export default function ProductsPage() {
  const [organization, setOrganization] = useState<Me['memberships'][number]['organization']>();
  const [organizations, setOrganizations] = useState<Me['memberships'][number]['organization'][]>(
    [],
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [state, setState] = useState('Loading catalog…');
  const [csv, setCsv] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [categoryUrls, setCategoryUrls] = useState('');
  const [maxProducts, setMaxProducts] = useState(50);
  const [webJob, setWebJob] = useState<ImportJob>();
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  async function load() {
    try {
      const me = await request<Me>('/auth/me');
      const membership =
        me.memberships.find((entry) => entry.organization.slug === 'established-lines') ??
        me.memberships[0];
      if (!membership) throw new Error('No seller organization');
      setOrganizations(me.memberships.map((entry) => entry.organization));
      setOrganization(membership.organization);
      await loadOrganization(membership.organization);
      setState('');
    } catch {
      setState('Sign in to manage a seller catalog.');
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function loadOrganization(selected: Me['memberships'][number]['organization']) {
    const [rows, categoryRows] = await Promise.all([
      request<Product[]>(`/organizations/${selected.id}/catalog/products`),
      request<Category[]>(`/organizations/${selected.id}/catalog/categories`),
    ]);
    setOrganization(selected);
    setProducts(rows);
    setCategories(categoryRows);
  }
  async function updateTitle(product: Product) {
    const title = window.prompt('Product title', product.title);
    if (!title || !organization) return;
    await request(`/organizations/${organization.id}/catalog/products/${product.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title, version: product.version }),
    });
    await load();
  }
  async function importCsv(dryRun: boolean) {
    if (!organization || !csv) return;
    const job = await request<ImportJob>(`/organizations/${organization.id}/imports/shopify`, {
      method: 'POST',
      body: JSON.stringify({
        csv,
        dryRun,
        idempotencyKey: `portal-${dryRun ? 'preview' : 'apply'}-${Date.now()}`,
      }),
    });
    if (dryRun) {
      setState(`Preview: ${job.validRows}/${job.totalRows} valid, ${job.failedRows} invalid.`);
      return;
    }
    setState(`Import queued: ${job.id}`);
    for (let attempt = 0; attempt < 30; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const current = await request<ImportJob>(
        `/organizations/${organization.id}/imports/${job.id}`,
      );
      setState(
        `Import ${current.status}: ${current.importedRows} imported, ${current.failedRows} failed.`,
      );
      if (['COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED'].includes(current.status)) break;
    }
    await load();
  }
  async function pollImport(jobId: string, terminal: string[]) {
    if (!organization) throw new Error('Seller organization is unavailable');
    for (let attempt = 0; attempt < 900; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const current = await request<ImportJob>(
        `/organizations/${organization.id}/imports/${jobId}`,
      );
      if (current.source === 'web') setWebJob(current);
      setState(
        current.status === 'FAILED'
          ? `Import failed: ${current.lastError ?? 'unknown source error'}`
          : `Import ${current.status}: ${current.validRows} valid, ${current.importedRows} imported, ${current.failedRows} failed.`,
      );
      if (terminal.includes(current.status)) return current;
    }
    throw new Error('Import did not finish within fifteen minutes');
  }
  async function scanWebsite() {
    if (!organization || !siteUrl || !categoryUrls.trim()) return;
    setWebJob(undefined);
    setRightsConfirmed(false);
    setState('Website scan queued…');
    try {
      const job = await request<ImportJob>(`/organizations/${organization.id}/imports/web`, {
        method: 'POST',
        body: JSON.stringify({
          siteUrl,
          categoryUrls: categoryUrls
            .split(/\r?\n/)
            .map((url) => url.trim())
            .filter(Boolean),
          maxProducts,
          maxCategoryPages: 5,
          idempotencyKey: `portal-web-preview-${Date.now()}`,
        }),
      });
      setWebJob(job);
      await pollImport(job.id, ['VALIDATED', 'FAILED']);
    } catch (error) {
      setState(error instanceof Error ? error.message : 'Website scan failed');
    }
  }
  async function applyWebsiteImport() {
    if (!organization || !webJob || webJob.status !== 'VALIDATED') return;
    setState('Creating catalog drafts…');
    const job = await request<ImportJob>(
      `/organizations/${organization.id}/imports/${webJob.id}/apply`,
      { method: 'POST', body: JSON.stringify({ rightsConfirmed: true }) },
    );
    setWebJob(job);
    await pollImport(job.id, ['COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED']);
    await loadOrganization(organization);
  }
  async function createProduct() {
    if (!organization || !categories[0]) return;
    const title = window.prompt('Product title');
    const sku = window.prompt('Inventory SKU');
    const price = window.prompt('Price in dollars');
    if (!title || !sku || !price) return;
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    await request(`/organizations/${organization.id}/catalog/products`, {
      method: 'POST',
      body: JSON.stringify({
        title,
        slug,
        productType: 'Furniture',
        categoryId: categories[0].id,
        condition: 'GOOD',
        quantity: 1,
        quantityAvailable: 1,
        priceMinor: String(Math.round(Number(price) * 100)),
        inventorySku: sku,
      }),
    });
    await load();
  }
  async function transition(product: Product, action: 'submit' | 'archive') {
    if (!organization) return;
    await request(`/organizations/${organization.id}/catalog/products/${product.id}/${action}`, {
      method: 'POST',
    });
    await load();
  }
  async function uploadMedia(product: Product, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!organization || !file) return;
    const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
    const checksum = [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
    const signed = await request<{ mediaId: string; uploadUrl: string }>(
      `/organizations/${organization.id}/catalog/products/${product.id}/media/upload-url`,
      {
        method: 'POST',
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          checksum,
        }),
      },
    );
    const uploaded = await fetch(signed.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    });
    if (!uploaded.ok) throw new Error(`Upload failed: ${uploaded.status}`);
    await request(
      `/organizations/${organization.id}/catalog/products/${product.id}/media/${signed.mediaId}/complete`,
      { method: 'POST' },
    );
    setState('Media uploaded and queued for processing.');
    await load();
  }
  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void file.text().then(setCsv);
  }
  async function showModeration(product: Product) {
    if (!organization) return;
    const reviews = await request<
      Array<{
        status: string;
        requestedChanges?: string;
        comments: Array<{ body: string }>;
      }>
    >(`/organizations/${organization.id}/catalog/products/${product.id}/moderation`);
    const summary =
      reviews
        .map(
          (review, index) =>
            `#${index + 1} ${review.status}${
              review.requestedChanges ? `: ${review.requestedChanges}` : ''
            }${review.comments.length ? `\n${review.comments.map((comment) => comment.body).join('\n')}` : ''}`,
        )
        .join('\n\n') || 'No moderation reviews yet.';
    window.alert(summary);
  }
  return (
    <main className="portal-page">
      <header>
        <div>
          <p className="eyebrow">Seller OS · Catalog</p>
          <h1>{organization?.name ?? 'Products'}</h1>
        </div>
        <div className="actions">
          <Link href="/catalog-dashboard">Catalog dashboard</Link>
          <Link href="/dealer-onboarding">Dealer status</Link>
          <Link href="/notifications">Notifications</Link>
          <Link href="/login">Switch account</Link>
        </div>
      </header>
      {organizations.length > 1 ? (
        <label className="organization-switcher">
          Current organization
          <select
            value={organization?.id}
            onChange={(event) => {
              const selected = organizations.find((row) => row.id === event.target.value);
              if (selected) void loadOrganization(selected);
            }}
          >
            {organizations.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {state && <p className="notice">{state}</p>}
      <section className="import-panel">
        <h2>Shopify CSV import</h2>
        <p>Upload for validation and idempotent product import.</p>
        <input type="file" accept=".csv,text/csv" onChange={chooseFile} />
        <button disabled={!csv || !organization} onClick={() => void importCsv(true)}>
          Validate preview
        </button>
        <button disabled={!csv || !organization} onClick={() => void importCsv(false)}>
          Start background import
        </button>
        <button disabled={!organization || !categories.length} onClick={() => void createProduct()}>
          Create product
        </button>
      </section>
      <section className="web-import-panel">
        <div className="web-import-heading">
          <p className="eyebrow">Public web extraction</p>
          <h2>Import products from website categories</h2>
          <p>
            Public HTTPS pages only. Atlas reads structured HTML first and launches Chromium when
            the catalog is rendered by JavaScript.
          </p>
        </div>
        <label>
          Website URL
          <input
            type="url"
            placeholder="https://shop.example"
            value={siteUrl}
            onChange={(event) => setSiteUrl(event.target.value)}
          />
        </label>
        <label className="wide">
          Category URLs, one per line
          <textarea
            placeholder={
              'https://shop.example/collections/chairs\nhttps://shop.example/collections/tables'
            }
            value={categoryUrls}
            onChange={(event) => setCategoryUrls(event.target.value)}
          />
        </label>
        <label>
          Maximum products
          <input
            type="number"
            min={1}
            max={200}
            value={maxProducts}
            onChange={(event) => setMaxProducts(Number(event.target.value))}
          />
        </label>
        <div className="actions wide">
          <button
            disabled={!organization || !siteUrl || !categoryUrls.trim()}
            onClick={() => void scanWebsite()}
          >
            Scan and build preview
          </button>
          <button
            disabled={!webJob?.validRows || webJob.status !== 'VALIDATED' || !rightsConfirmed}
            onClick={() => void applyWebsiteImport()}
          >
            Create {webJob?.validRows ?? 0} drafts
          </button>
        </div>
        <label className="rights-confirmation wide">
          <input
            type="checkbox"
            checked={rightsConfirmed}
            onChange={(event) => setRightsConfirmed(event.target.checked)}
          />
          I confirm that I am authorized to use the product data, descriptions, and images from
          these source pages.
        </label>
        {webJob?.rows?.length ? (
          <div className="extraction-preview wide">
            {webJob.rows.map((row) => {
              const product = row.normalizedPayload ?? row.payload.candidate;
              return (
                <article key={row.id} className="extraction-row">
                  {product?.imageUrls?.[0] ? (
                    <img src={product.imageUrls[0]} alt="" />
                  ) : (
                    <div className="image-placeholder">No image</div>
                  )}
                  <div>
                    <strong>
                      {product?.title ?? row.payload.sourceUrl ?? `Row ${row.rowNumber}`}
                    </strong>
                    <p>
                      {product?.priceMinor
                        ? `${product.currency ?? 'USD'} ${(Number(product.priceMinor) / 100).toLocaleString()}`
                        : 'Price missing'}
                      {' · '}
                      {row.payload.captureMethod ?? 'capture failed'}
                    </p>
                    {row.errors?.length ? (
                      <p className="row-error">{row.errors.join('; ')}</p>
                    ) : null}
                  </div>
                  <span>{row.status}</span>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>
      <section className="product-table">
        <div className="table-head">
          <span>Product</span>
          <span>Status</span>
          <span>SKU</span>
          <span>Price</span>
          <span></span>
        </div>
        {products.length
          ? products.map((product) => (
              <div className="table-row" key={product.id}>
                <strong>{product.title}</strong>
                <span>{product.status}</span>
                <span>{product.inventorySku}</span>
                <span>${(Number(product.priceMinor) / 100).toLocaleString()}</span>
                <button onClick={() => void updateTitle(product)}>Edit title</button>
                <button onClick={() => void showModeration(product)}>Review history</button>
                {['DRAFT', 'NEEDS_CHANGES'].includes(product.status) ? (
                  <button onClick={() => void transition(product, 'submit')}>Submit</button>
                ) : null}
                {!['ARCHIVED', 'SUBMITTED'].includes(product.status) ? (
                  <button onClick={() => void transition(product, 'archive')}>Archive</button>
                ) : null}
                <label className="upload-control">
                  Add media
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    onChange={(event) => void uploadMedia(product, event)}
                  />
                </label>
              </div>
            ))
          : !state && <p className="notice">No products yet. Import the pilot CSV.</p>}
      </section>
    </main>
  );
}
