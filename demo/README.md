# The Guild static Stitch demo

This folder is a standalone static project assembled from every extracted Stitch HTML template. It uses plain HTML, CSS, and small browser-side JavaScript only. It does not import or modify the production application, backend, Prisma schema, API, or database.

## Run locally

From the `demo` directory:

```bash
python -m http.server 8088
```

Then open [http://127.0.0.1:8088/index.html](http://127.0.0.1:8088/index.html).

Node.js is an optional alternative (no installation required):

```bash
node tests/serve-demo.mjs
```

No `package.json` is included because serving and deploying this static project requires no npm dependencies.

## GitHub and Vercel

- Commit the complete `demo` folder. All deployable URLs are relative and contain no local machine paths.
- For Vercel, set the project Root Directory to `demo`; no build command or output-directory override is required.
- `vercel.json` enables clean URLs and disables trailing slashes. Both `/pages/catalog-desktop.html` and the clean direct URL `/pages/catalog-desktop` resolve when hosted on Vercel.
- For GitHub Pages, publish `demo` as the site root (or copy its contents to the chosen Pages artifact). Relative URLs continue to work when the repository is hosted below a subpath.

## Screen inventory

The Demo Navigator exposes 39 screens: 34 Stitch templates and 5 clearly marked service placeholders.

1. Marketplace / Buyer (8): marketplace desktop/mobile, catalog desktop/mobile, product desktop/mobile, cart desktop/mobile.
2. Seller Storefront (4): Established Lines desktop/mobile, branded product, about page.
3. Seller Dashboard (9): overview desktop/mobile, inventory, product editor, three bulk-import stages, seller orders placeholder, storefront settings placeholder.
4. Admin / Operations (5): admin dashboard placeholder, seller review, product moderation, payouts, audit log.
5. Logistics / Driver (5): command center, dispatcher routes, shipping quotes, incidents, driver routes placeholder.
6. Authentication / Service pages (8): authentication placeholder, buyer account, buyer orders, tracking desktop/mobile, delivery checkout, payment checkout, order confirmation.

The complete source-to-demo mapping is in [PAGE_MAP.md](PAGE_MAP.md).

## Connected flows

- Marketplace logo/home → marketplace home.
- Shop, collection, category, and catalog actions → desktop or mobile catalog (category links may carry query/hash state).
- Catalog product cards → product detail.
- Product purchase/add actions → cart; storefront actions → Established Lines storefront.
- Cart → delivery checkout → payment checkout → order confirmation.
- Account → buyer account; Orders → buyer orders → order tracking.
- Seller Overview → seller dashboard; Products → inventory; Orders → placeholder; Storefront/Settings → placeholder/public storefront.
- Admin navigation → admin dashboard placeholder, moderation, seller review, payouts, and audit log.
- Logistics navigation → command center, quote management, incidents, dispatcher routes, and driver placeholder.
- Every page receives the same fixed `DEMO` toolbar from shared CSS/JavaScript with Demo Index, Previous, Next, and all-screen selection.

Forms are intercepted, do not reload the page, and show a demo notification. Mobile menu, basic cart count feedback, product gallery switching, and simple action notifications are demonstrational only.

## Missing screens

The following screens were not present in Stitch and are intentionally minimal placeholders carrying the text `Screen is not designed yet`:

- Authentication.
- Admin dashboard overview.
- Seller orders.
- Storefront editor/settings.
- Driver routes/application.

## Remote dependencies

Stitch did not include standalone local CSS, JavaScript, font files, or individual product photos. The original templates retain these remote resources:

- `cdn.tailwindcss.com` — Tailwind browser runtime used by all 34 Stitch pages.
- `fonts.googleapis.com` and `fonts.gstatic.com` — Google Fonts and Material Symbols.
- `www.gstatic.com/labs-code/stitch/stitch-placeholder-300x300.svg` — Stitch placeholder imagery where no local product image was supplied.

The 34 local `screen.png` files are copied to `assets/images`, renamed, and displayed as Demo Navigator previews. They are full-screen design references, not replacements for individual product images.

## Source files not deployed

- Six `DESIGN.md` files are design-system references, not pages.
- Four ZIP archives are backups containing duplicate copies of the extracted templates and assets; they are not deployed.
- An older archived Operations Command Center variant is not used; the current extracted template is used.
- No extracted HTML template or PNG preview is omitted.

## Verification

Fast local path check from the repository root:

```bash
node demo/tests/check-demo.mjs
```

Optional browser smoke test when the repository's Playwright dependency and Microsoft Edge are available:

```bash
./node_modules/.bin/playwright test --config demo/playwright.config.ts
```

The test opens Demo Index and every screen, checks local 404 responses, `pageerror`, console errors, and exercises marketplace → catalog → product → cart → checkout plus the seller storefront/dashboard entry points.

## Known limitations

- The remote Tailwind/fonts/placeholder images require internet access for the original Stitch styling and imagery to render fully.
- Search, authentication, checkout/payment, file upload, moderation, logistics updates, and account changes do not persist and call no API.
- Desktop and mobile Stitch layouts remain separate pages because they were delivered as separate visual templates.
- Clean extensionless URLs depend on the hosting platform configuration; a basic local HTTP server should use `.html` URLs unless it implements the included clean-URL fallback.

