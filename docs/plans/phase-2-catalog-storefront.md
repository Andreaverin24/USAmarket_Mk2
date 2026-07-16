# Phase 2 — Catalog + Established Lines Storefront

- Status: implementation authorized
- Date: 2026-07-15
- Foundation dependency: accepted

## Цель

Построить tenant-safe catalog vertical slice, где один canonical Product управляется продавцом, проходит moderation state machine и публикуется одновременно как marketplace и seller-storefront projection. Доказать сценарий на Established Lines и Shopify fixture из 10 товаров.

## Scope

### Catalog

- Category tree, Product, ProductMedia, MediaVariant, Collection, CollectionProduct;
- InventoryItem с optimistic version и доступностью, но без checkout/reservation logic;
- ProductAttribute как нормализованные seller-owned facets;
- состояния `DRAFT`, `SUBMITTED`, `NEEDS_CHANGES`, `APPROVED`, `PUBLISHED`, `RESERVED`, `SOLD`, `ARCHIVED`;
- только application-service transitions, audit и transactional outbox;
- seller-owner/staff permissions и fail-closed tenant scope.

### Public channels

- marketplace home, catalog, category, product, seller pages;
- filters, sorting, cursor/page pagination;
- PostgreSQL FTS и trigram через `SearchProvider`;
- SEO metadata, canonical URL, sitemap и Product JSON-LD;
- hostname/subdomain/custom-domain resolution и `/dealers/:sellerSlug` fallback;
- approved StorefrontTheme fields, policy pages и featured collections;
- Established Lines premium preset и product presentation.

### Import and media

- Shopify CSV mapping, validation, preview/dry-run, background apply, row recovery;
- tenant-scoped idempotency by import key and product external ID/SKU;
- catalog CSV export;
- signed original uploads, explicit completion, checksum/MIME/size validation;
- async thumbnail/optimized WebP/AVIF variants with metadata stripping;
- image URL ingestion with SSRF controls and outbox/queue processing.

## Non-goals

- checkout, cart, reservations, orders, Stripe, payments or subscription billing;
- shipping workflow, logistics or driver functionality;
- Elasticsearch/OpenSearch;
- custom seller CSS/JavaScript or drag-and-drop builder;
- review system, real shipping quote calculation or newsletter delivery.

## Architectural decisions

- [ADR-005](../adr/005-catalog-storefront-boundaries.md): one canonical Product and channel projections.
- [ADR-006](../adr/006-shopify-import-idempotency.md): tenant-scoped import/product idempotency.
- [ADR-007](../adr/007-asynchronous-media-processing.md): original preservation and normalized async variants.
- [ADR-008](../adr/008-restartable-background-import.md): persisted rows, leases and restartable worker apply.
- [Catalog domain](../architecture/phase-2-catalog-domain.md).
- [Media pipeline](../architecture/phase-2-media-pipeline.md).
- [Storefront tenancy](../architecture/phase-2-storefront-tenancy.md).
- [Shopify import](../architecture/phase-2-shopify-import.md).

## Schema changes

- retain Phase 2 entities already introduced;
- add `InventoryItem`, `ProductAttribute`, `MediaVariant`;
- add moderation note/reviewer timestamps and product transition evidence;
- add import lease/progress/error/retry columns;
- add media processing status, original metadata and variant uniqueness;
- add indexes for public pagination and normalized facets.

## API plan

- public catalog/category/product/seller/search/facets/sitemap routes;
- storefront resolve/home/product/policy/redirect routes;
- seller product CRUD, transitions, media sign/complete/reorder and export;
- Shopify preview/create/report/retry routes;
- worker consumes import/media outbox events; no client body supplies trusted tenant ID.

## UI plan

- marketplace home, catalog pagination, category, product JSON-LD and seller pages;
- Established Lines home sections, collection/category navigation, trust/delivery/about blocks;
- storefront product with clean metadata, availability, related items and non-functional Phase 2 shipping request placeholder;
- policy pages and unknown-domain fail-closed response;
- portal catalog list/editor/import/report/media controls within Phase 2 scope.

## Tests

Canonical matrix: [phase-2-acceptance-tests.md](phase-2-acceptance-tests.md).

Required layers:

- pure unit tests for state machine, import mapping/validation and MIME rules;
- PostgreSQL Testcontainers integration for FTS/trigram, filters, IDOR, import recovery/idempotency, hostname/storefront isolation and canonical product consistency;
- worker integration for media variants/checksum/metadata stripping;
- Playwright smoke for marketplace, category, product SEO/JSON-LD, storefront, policy and redirect behavior;
- actual dry-run and background real fixture run against local infrastructure.

## Risks

- untrusted remote media: SSRF, decompression bomb and MIME confusion;
- import retries after partial success;
- hostname normalization and unknown-domain leakage;
- accidental direct product status updates;
- public query pagination/search ranking drift;
- AVIF encoder availability and Windows native dependency behavior.

## File plan

- `docs/architecture/*phase-2*`, ADR-007/008, acceptance/report;
- Prisma schema plus additive Phase 2 completion migration;
- catalog/import/media/storefront application services and worker handlers;
- marketplace/storefront/portal routes and presentation helpers;
- unit, integration, worker and Playwright evidence;
- no checkout/payment/order/logistics/driver implementation files.

## Exit

All 17 acceptance scenario steps pass, required commands exit zero, evidence is recorded in the report, and no Phase 3 code is introduced.
