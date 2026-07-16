# Demo build report

## Result

- Recursive Stitch inventory: **34 extracted HTML templates**, **34 PNG previews**, **6 design markdown files**, and **4 ZIP archives**.
- Pages included in Demo Navigator: **39** total.
  - **34** normalized Stitch pages.
  - **5** explicitly marked placeholder/service pages for missing designs.
- Source assets copied: **34 PNG files** (all extracted Stitch previews).
- Deployable assets in `assets`: **41 files** total — 34 copied PNG previews, 1 generated SVG favicon, 3 shared CSS files, and 3 shared JavaScript files.
- Standalone Stitch CSS / JavaScript / local fonts found: **0 / 0 / 0**.

## Duplicates and normalization

- Desktop/mobile variants were retained as distinct screens for six workflows: marketplace, catalog, product detail, cart, seller storefront, and order tracking.
- Archive-contained copies were not duplicated in the demo.
- One older archived Operations Command Center HTML variant (23,608 bytes) was excluded in favor of the current extracted template (21,855 bytes).
- Generic `code.html` filenames were renamed according to content and parent folder; no extracted page had an unclear purpose after content inspection.
- Every Stitch page shares one injected demo toolbar and one shared interaction script; the toolbar is not manually duplicated.
- Fixed one original null-reference in the mobile product shipping calculator and one invalid percentage-based SVG route path in route planning.

## Verification results

Verification was performed through a local HTTP server at `http://127.0.0.1:8088`.

- `index.html`: **HTTP 200**.
- All 39 demo pages: **HTTP 200**.
- Extensionless direct URL checks for the index and key nested pages: **HTTP 200** with the included server.
- Local asset/page references: **all resolved**; no local 404 responses.
- Demo Navigator cards: **39 rendered**; local PNG preview visible.
- Browser `pageerror`: **none**.
- Browser console errors: **none**.
- Key buyer flow: **marketplace → catalog → product → cart → checkout passed**.
- Seller storefront: **passed**.
- Seller dashboard and products entry: **passed**.
- Playwright result: **3 passed (24.6s)** using installed Microsoft Edge.
- Absolute Windows paths in HTML: **none**.
- Original `Stich` directory: **not modified**; all build writes were limited to `demo`.
- Backend, Prisma, API, production application, and Phase 1/2 architecture: **not modified**. Phase 3 was not started.

## Exact start command

```bash
cd demo
python -m http.server 8088
```

Open `http://127.0.0.1:8088/index.html`.

Alternative standalone preview command:

```bash
node demo/tests/serve-demo.mjs
```

## Automated checks

```bash
node demo/tests/check-demo.mjs
./node_modules/.bin/playwright test --config demo/playwright.config.ts
```
