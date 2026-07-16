# Phase 2 acceptance tests

## Required vertical scenario

|    # | Evidence                                               | Layer                         |
| ---: | ------------------------------------------------------ | ----------------------------- |
|    1 | Established Lines organization/storefront/theme seeded | seed + integration            |
|    2 | fixture contains and imports exactly 10 products       | integration + real run        |
|    3 | preview reports 10 valid rows and creates no products  | integration + real dry run    |
|    4 | outbox/worker completes background import              | worker integration + real run |
|    5 | seller submits one product                             | integration                   |
|    6 | admin approves then publishes through state machine    | unit + integration            |
|    7 | marketplace returns published product                  | integration + E2E             |
|    8 | storefront returns same Product UUID                   | integration + E2E             |
| 9–10 | seller edit is visible in both projections             | integration + E2E             |
|   11 | second seller read/mutate return fail-closed 404       | integration                   |
|   12 | original plus WebP/AVIF/thumbnail variants exist       | worker integration            |
|   13 | FTS and typo/trigram search find product               | integration                   |
|   14 | category and facet pages/filters work                  | integration + E2E             |
|   15 | metadata, canonical and Product JSON-LD render         | unit + E2E                    |
|   16 | Shopify legacy URL resolves scoped redirect            | integration + E2E             |
|   17 | re-import creates no duplicate Product/InventoryItem   | integration + real run        |

## Mandatory automated matrix

- Product state machine: all allowed and representative forbidden transitions; reject reason required.
- Tenant isolation and cross-tenant IDOR: read, update, status, media, import report/export.
- Category filter plus price/seller/condition/style/material/color/dimension/availability/location filters.
- PostgreSQL FTS and trigram using deployed migration/extensions.
- Media MIME/extension/size/checksum validation and cross-tenant authorization.
- Media processing produces idempotent variants and strips EXIF metadata.
- Import parsing, column mapping, validation, same-key checksum conflict, idempotency and failed-row retry.
- Host normalization, verified custom domain, subdomain/fallback equivalence, unknown/unverified domain 404.
- Storefront only exposes its tenant and shares canonical Product UUID with marketplace.
- Sitemap includes public category/product/seller URLs only.
- JSON-LD contains Product name, image, offers price/currency/availability and seller.

## Commands

```text
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
pnpm test:e2e
pnpm phase2:acceptance
```

`phase2:acceptance` must execute local dry-run and real background fixture import, drain the outbox/worker, assert 10 canonical products and save machine-readable evidence under `artifacts/phase-2/` (ignored by version control).

## Pass rule

No required test may be skipped. Environment-dependent limitations must be reported, not silently treated as passing. Phase 3 remains unauthorized.
