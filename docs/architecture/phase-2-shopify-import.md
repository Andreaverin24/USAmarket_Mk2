# Phase 2 Shopify import

## Lifecycle

1. Upload/preview parses bounded CSV and applies explicit or default Shopify column mapping.
2. Validation persists `ImportJob` and one `ImportRow` per source row with original payload, normalized payload and errors.
3. Dry run ends in `VALIDATED` and performs no catalog mutation.
4. Apply sets job `PENDING` and atomically writes `catalog.import.requested` to outbox.
5. Worker claims the job with a lease, marks `PROCESSING`, and processes retryable rows in deterministic row order.
6. Each row runs in its own transaction: category/product/inventory/attributes/media upsert, audit and outbox, then row `IMPORTED`.
7. Row failure is isolated as `FAILED`; the job ends `COMPLETED_WITH_ERRORS`. Retry resets only failed rows and creates another idempotent import event.

## Identity and idempotency

- Job request: `(organizationId, idempotencyKey)` unique; same key plus different checksum is rejected.
- Primary product match: `(organizationId, externalSource, externalId)`.
- Fallback product match: `(organizationId, inventorySku)` when external ID is unavailable.
- A re-import updates the canonical product and never creates a channel-specific copy.
- Media source URL and variant compound keys avoid duplicate jobs/objects.

## Mapping and validation

Default mapping supports Shopify Handle, Title, Body HTML, Vendor, Type, Variant SKU/Price, condition/facets and Image Src. The API accepts a bounded mapping object for renamed columns. Required values, currency/price, condition, duplicate SKU/external ID and HTTPS image URLs are validated before apply.

## Export

Tenant-authorized export reads canonical seller products, emits stable UTF-8 CSV columns and never includes another tenant. Export is a read operation and does not mutate status.
