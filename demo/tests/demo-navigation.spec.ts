import { expect, test } from "@playwright/test";

const pages = [
  "marketplace-home-desktop", "marketplace-home-mobile", "catalog-desktop", "catalog-mobile",
  "product-desktop", "product-mobile", "cart-desktop", "cart-mobile", "seller-storefront-desktop",
  "seller-storefront-mobile", "seller-storefront-product", "about-established-lines", "seller-dashboard",
  "seller-dashboard-mobile", "seller-products", "seller-product-edit", "seller-import-upload",
  "seller-import-validation", "seller-import-results", "seller-orders", "storefront-settings", "admin-dashboard",
  "admin-seller-review", "admin-moderation", "admin-payouts", "admin-audit-log", "logistics-command-center",
  "logistics-routes", "logistics-quotes", "logistics-incidents", "driver-routes", "auth", "buyer-account",
  "buyer-orders", "order-tracking-desktop", "order-tracking-mobile", "checkout-delivery", "checkout-payment",
  "order-success"
];

test("Demo Index and every screen load without local 404 or pageerror", async ({ page }) => {
  const errors: string[] = [];
  const consoleErrors: string[] = [];
  const local404s: string[] = [];
  page.on("pageerror", (error) => errors.push(`${page.url()}: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(`${page.url()}: ${message.text()}`);
  });
  page.on("response", (response) => {
    if (response.status() === 404 && response.url().startsWith("http://127.0.0.1:8088")) local404s.push(response.url());
  });

  await page.goto("/index.html");
  await expect(page.getByRole("heading", { name: "The Guild Demo Navigator" })).toBeVisible();
  await expect(page.locator(".screen-card")).toHaveCount(39);
  await expect(page.locator(".screen-card__preview img").first()).toBeVisible();

  for (const slug of pages) {
    const response = await page.goto(`/pages/${slug}.html`);
    expect(response?.status(), slug).toBe(200);
    await expect(page.locator(".demo-toolbar")).toBeVisible();
  }
  expect(local404s).toEqual([]);
  expect(errors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("buyer funnel routes marketplace to checkout", async ({ page }) => {
  await page.goto("/pages/marketplace-home-desktop.html");
  await page.locator('a[href$="catalog-desktop.html"]').first().click();
  await expect(page).toHaveURL(/catalog-desktop\.html$/);

  await page.locator('[data-demo-target="product-desktop"]').first().click();
  await expect(page).toHaveURL(/product-desktop\.html$/);

  await page.locator('[data-demo-target="cart-desktop"]').first().click();
  await expect(page).toHaveURL(/cart-desktop\.html$/);

  await page.locator('[data-demo-target="checkout-delivery"]').first().click();
  await expect(page).toHaveURL(/checkout-delivery\.html$/);
});

test("seller storefront and seller dashboard are reachable", async ({ page }) => {
  await page.goto("/pages/seller-storefront-desktop.html");
  await expect(page.locator(".demo-toolbar")).toBeVisible();
  await page.goto("/pages/seller-dashboard.html");
  await expect(page.locator(".demo-toolbar")).toBeVisible();
  await expect(page.locator('[data-demo-target="seller-products"]').first()).toBeVisible();
});
