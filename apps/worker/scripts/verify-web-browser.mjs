import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('@playwright/test');

const browser = await chromium.launch({ headless: true, timeout: 20_000 });
try {
  const page = await browser.newPage();
  await page.setContent(`
    <main id="catalog"></main>
    <script>
      document.querySelector('#catalog').innerHTML =
        '<article class="product-card"><a href="/products/js-chair">JS Chair</a></article>';
    </script>`);
  const text = await page.locator('.product-card').textContent();
  const html = await page.content();
  if (!text?.includes('JS Chair') || !html.includes('/products/js-chair'))
    throw new Error('Chromium did not expose the JavaScript-rendered product card');
  process.stdout.write('Chromium JavaScript rendering verified.\n');
} finally {
  await browser.close();
}
