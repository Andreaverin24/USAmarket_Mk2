# Universal product ingestion

## Status

Design level 2. Authorized by the owner on 2026-08-04. This document is the current feature
authority for turning heterogeneous external listings into marketplace-ready collectible product
drafts.

## Business result

Atlas can ingest a listing from a public website, marketplace, auction house, API, CSV, or manual
entry without making that source's schema the marketplace schema. Every capture is preserved as
source evidence. A normalized, unique physical object or lot becomes the canonical `Product` that
the marketplace can moderate and publish.

## Context map

### KNOWN

- `Product` is already the marketplace source of truth and has moderation, inventory, media,
  attributes, collections, audit, and outbox boundaries.
- `ImportJob`/`ImportRow` already provide preview/apply, idempotency, retries, and row errors.
- Public web extraction already uses bounded HTTP-first capture with Chromium fallback.
- Imported products are always written as `DRAFT`; publication is a separate moderation command.
- The owner requires unique collectible objects comparable to listings on 1stDibs, Incollect,
  Christie's, Etsy, and the partner site Established Lines.

### CONFLICT

- Legacy `Product.externalSource` and `Product.externalId` identify a source listing on the
  canonical object itself. That cannot represent one physical object cross-listed on multiple
  sites. They remain temporarily for compatibility, but new imports use `ExternalListing` as the
  authoritative source identity.

### UNKNOWN / DEFERRED

- Cross-source matching confidence thresholds require real multi-source fixtures.
- Per-domain crawl policies and scheduled synchronization are deferred until production rollout.
- Auction settlement, hammer prices, payments, and orders are outside ingestion.

## Owner decisions

### DEC-U01 — Canonical entity

`Product` represents one unique physical object or one sellable lot/set. Marketplace inventory is
therefore zero or one. `pieceCount` describes how many pieces are inside a set without turning the
set into mass inventory.

### DEC-U02 — Source separation

`CatalogSource` describes a source and adapter. `ExternalListing` describes a mutable listing at
that source. One `Product` can have many external listings.

### DEC-U03 — Evidence before normalization

Each materially different capture creates an immutable `ListingSnapshot` with the raw structured
payload, normalized payload, adapter version, validation errors, and field provenance. Source HTML
is not persisted.

### DEC-U04 — Explainable canonical fields

`ProductFieldEvidence` links a canonical field to a listing snapshot, source path, normalized value,
and confidence. A marketplace operator can therefore see why a field exists and replace it without
destroying source history.

### DEC-U05 — No unsafe automatic cross-source merge

Repeated capture of the same source listing updates the linked product idempotently. Listings from
different sources are not automatically merged in this slice. False merging two unique objects is
more damaging than a reviewable duplicate.

### DEC-U06 — Typed core plus extensible attributes

Frequently displayed and filtered collectible fields are typed on `Product`. Long-tail source
properties remain in `ProductAttribute` and the immutable snapshot. Adding a new site must not
require a database migration for every source-specific label.

## Canonical terms

- **Product** — marketplace-ready canonical description of one physical object or lot.
- **CatalogSource** — an organization-scoped source definition and adapter version.
- **ExternalListing** — current source-side commercial/listing state.
- **ListingSnapshot** — immutable structured evidence from one capture.
- **ProductFieldEvidence** — provenance for a selected canonical product field.
- **Adapter** — deterministic source parser that outputs the shared normalized contract.

## Scope of the authorized vertical slice

- Add the universal source, listing, snapshot, and field-evidence models and migration.
- Extend the canonical collectible product with piece count, designer/manufacturer/model, medium,
  detailed condition, diameter/seat height, signature, edition, literature, and exhibition history.
- Extend the normalized contract with source/listing identity, availability, sale type, auction
  estimates, typed dimensions, collectible metadata, and field provenance.
- Keep generic JSON-LD/OpenGraph parsing and add reusable Shopify embedded-data parsing rather than
  hard-coding Established Lines into the database model.
- On explicit apply, idempotently create/update `Product`, `ExternalListing`, `ListingSnapshot`,
  `ProductFieldEvidence`, attributes, inventory, media, audit, and outbox records in one transaction.
- Preserve Shopify CSV compatibility.
- Verify the first real read-only fixture against Established Lines.

## Out of scope

- Automatic publication, moderation approval, purchasing, bidding, payments, orders, or repricing.
- CAPTCHA bypass, stealth, proxies, credentials, or circumvention of a blocked source.
- Automatic cross-source object matching.
- Applying the migration to cloud Supabase in this implementation step.
- Production crawling schedules or guaranteed support for an arbitrary site without an adapter.

## Main flow

1. A source adapter captures and validates a bounded public page.
2. Preview stores raw structured capture and a normalized candidate in `ImportRow`.
3. The seller reviews the preview and explicitly confirms rights.
4. Apply resolves the source and source listing, deduplicated by source identity.
5. Apply creates or updates one canonical `Product` as `DRAFT` and keeps unique inventory at 0/1.
6. A content fingerprint creates or reuses an immutable listing snapshot.
7. Field evidence records the source path and confidence for each canonical field.
8. Remote images continue through the existing media pipeline.

## Negative scenarios

- Missing required marketplace fields: keep the row invalid and preserve preview evidence; do not
  create a product.
- Missing or inquiry-only source price: preserve listing evidence, but do not invent a marketplace
  price.
- Sold/unavailable listing: canonical inventory becomes unavailable; the product is never
  auto-published.
- Repeated identical capture: update `lastSeenAt` and reuse the snapshot fingerprint.
- Same URL with changed content: append a new immutable snapshot and update the canonical draft.
- Same physical object on another source: create a reviewable separate listing/product until an
  operator links it.
- Source blocks the worker: fail visibly and do not circumvent the block.

## Risk and rollback boundaries

- The migration is additive; legacy source identity columns remain available for rollback.
- No cloud migration or production crawl occurs without a separate explicit gate.
- Captured HTML is never stored; structured payload size remains bounded by the existing page and
  import limits.
- Existing tenant authorization and DRAFT/moderation boundaries remain unchanged.

## Implementation decisions resolving the cold read

- A source is unique by `(organizationId, key)`, where `key` is a lower-case normalized hostname
  for web sources and a stable configured key for API/CSV/manual sources.
- A listing is unique by `(sourceId, externalId)`. Web adapters use a publisher ID/SKU when stable
  and otherwise SHA-256 of the canonical URL. Canonical URL is also unique inside the source.
  Database unique constraints and transaction upserts close concurrent-apply races.
- A canonical product is created on the first applied listing. Another source creates a separate
  reviewable product/listing pair in this slice; manual linking is deferred.
- `Product.sourceRefreshLocked` starts false. Source refresh may update canonical fields only while
  the product is `DRAFT` and unlocked. Any seller catalog edit locks source refresh. Listing state,
  immutable snapshots, and evidence still update while locked.
- Snapshot `contentHash` is SHA-256 of stable-key JSON containing normalized source, listing,
  product, attributes, image URLs, and provenance. Capture time and transport method are excluded.
  `(listingId, contentHash)` is unique. Identical captures update only listing `lastSeenAt` and
  `lastCapturedAt`; changed content appends a snapshot.
- A row is applicable only with title, slug, SKU, product type, decimal minor-unit price, and a
  three-letter uppercase currency. Images are not required to create a draft because publication
  already requires processed media. Inquiry-only and auction-without-marketplace-price captures
  remain preview evidence and cannot create a priced marketplace product.
- Rights confirmation remains bound to the immutable import job checksum and is additionally stored
  in typed `ImportJob.rightsConfirmedByUserId`, `rightsConfirmedAt`, and `rightsScopeHash` fields.
  Audit metadata includes the job, row, source listing, and confirmation hash.
- Dimension values preserve one declared unit. Inches are preferred when both imperial and metric
  appear; otherwise centimeters are stored. Money is integer minor units with uppercase ISO-style
  currency codes. Source timestamps are UTC `DateTime`; unparseable values remain snapshot data.
- Listing availability maps to `AVAILABLE`, `RESERVED`, `SOLD`, `UNAVAILABLE`, or `UNKNOWN`.
  `Offer.price` means `FIXED_PRICE`; estimates/lot metadata mean `AUCTION`; explicit inquiry text
  means `PRICE_ON_REQUEST`; otherwise sale type is `UNKNOWN`.
- Sold/unavailable listing refresh sets unique inventory to zero. Available listing refresh sets it
  to one only for the listing's linked product; no publication transition is performed.
- Database transactions create media metadata and outbox jobs only. Remote image retrieval and S3
  writes remain asynchronous and never run inside a database transaction.
- Legacy `Product.externalSource/externalId` mirror the first/primary applied listing for backward
  compatibility and are not used to merge listings from different sources.
- Page HTML stays under the existing 5 MB capture limit and is discarded. Structured normalized
  snapshot JSON is limited to 512 KB before apply; galleries remain limited to 30 URLs and
  long-tail attributes to 100 names with bounded values.
- The owner previously authorized Established Lines as the partner pilot, and the read-only HTML
  diagnostic was separately approved on 2026-08-04. No other live source is authorized.

## Verification contract

- Prisma validates and generates from the new schema; migration SQL is additive and reviewable.
- Five catalog fixtures cover Schema.org, OpenGraph, Shopify-style galleries, collectible
  dimensions, availability, condition text, source identity, and unsafe URL rejection.
- Nineteen worker tests cover the bounded HTTP/browser capture boundary; catalog, database, API,
  and worker typechecks pass; the eight-task scoped monorepo build passes.
- The authorized live Established Lines capture returns HTTP 200 with title, price, SKU,
  availability, detailed condition, four typed dimensions, and ten deduplicated images.
- Transactional database integration remains a deployment-gate check because this migration has
  intentionally not been applied to cloud Supabase.

## Next deployment gate

After separate owner approval, back up Supabase, deploy the additive migration, and run one full
Established Lines preview/apply cycle. The product must remain `DRAFT`; the check must verify one
source, one listing, one immutable snapshot, selected field evidence, 0/1 inventory, and queued
media jobs before enabling additional domains.
