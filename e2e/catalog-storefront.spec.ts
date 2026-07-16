import { expect, test } from '@playwright/test';

const title = 'Phase Two Smoke Lounge Chair';
const slug = 'phase-two-smoke-lounge-chair';

test.describe('public catalog and seller storefront', () => {
  test('shows the same published product in both public channels', async ({ page }) => {
    await page.goto('/catalog');
    await expect(page.getByRole('heading', { name: 'Curated catalog' })).toBeVisible();
    await expect(page.getByText(title)).toBeVisible();

    await page.goto(`/products/${slug}`);
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      new RegExp(`/products/${slug}$`),
    );
    const jsonLd = JSON.parse(
      (await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}',
    );
    expect(jsonLd['@type']).toBe('Product');
    expect(jsonLd.offers.priceCurrency).toBe('USD');

    await page.goto('/dealers/established-lines');
    await expect(page.getByText(title)).toBeVisible();

    await page.goto(`/dealers/established-lines/products/${slug}`);
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      new RegExp(`/dealers/established-lines/products/${slug}$`),
    );
    await expect(page.getByText('Request Shipping Estimate')).toBeVisible();
  });

  test('supports public search and has no client-side runtime errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/catalog?q=Smoke+Lounge');
    await expect(page.getByText(title)).toBeVisible();
    await expect(page.getByText(/1 objects/)).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('renders category, sitemap, policy and scoped legacy redirect', async ({
    page,
    request,
  }) => {
    await page.goto('/categories/furniture');
    await expect(page.getByRole('heading', { name: 'Furniture' })).toBeVisible();
    await expect(page.getByText(title)).toBeVisible();

    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.ok()).toBeTruthy();
    expect(await sitemap.text()).toContain(`/products/${slug}`);

    await page.goto('/dealers/established-lines/policies/shipping');
    await expect(page.getByRole('heading', { name: 'Delivery & Pickup' })).toBeVisible();

    const legacy = await request.get(
      '/dealers/established-lines/legacy-redirect?path=%2Fproducts%2Fitalian-travertine-console',
      { maxRedirects: 0 },
    );
    expect(legacy.status()).toBe(308);
    expect(legacy.headers().location).toContain(
      '/dealers/established-lines/products/italian-travertine-console',
    );
  });
});
