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
  status: string;
  totalRows: number;
  validRows: number;
  importedRows: number;
  failedRows: number;
}

export default function ProductsPage() {
  const [organization, setOrganization] = useState<Me['memberships'][number]['organization']>();
  const [products, setProducts] = useState<Product[]>([]);
  const [state, setState] = useState('Loading catalog…');
  const [csv, setCsv] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  async function load() {
    try {
      const me = await request<Me>('/auth/me');
      const membership =
        me.memberships.find((entry) => entry.organization.slug === 'established-lines') ??
        me.memberships[0];
      if (!membership) throw new Error('No seller organization');
      setOrganization(membership.organization);
      const rows = await request<Product[]>(
        `/organizations/${membership.organization.id}/catalog/products`,
      );
      const categoryRows = await request<Category[]>(
        `/organizations/${membership.organization.id}/catalog/categories`,
      );
      setProducts(rows);
      setCategories(categoryRows);
      setState('');
    } catch {
      setState('Sign in to manage a seller catalog.');
    }
  }
  useEffect(() => {
    void load();
  }, []);
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
  return (
    <main className="portal-page">
      <header>
        <div>
          <p className="eyebrow">Seller OS · Catalog</p>
          <h1>{organization?.name ?? 'Products'}</h1>
        </div>
        <Link href="/login">Switch account</Link>
      </header>
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
