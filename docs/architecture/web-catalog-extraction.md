# Public web catalog extraction

## Status

Design level 2 pilot authorized by the owner on 2026-07-31. The pilot is local-only until a
separate production/external-call gate is granted.

## Business result

An authenticated seller supplies one public HTTPS site URL and one or more category URLs. Atlas
discovers directly linked product pages, extracts structured product drafts, and presents a
validation report. A separate explicit apply command creates or updates catalog products as
`DRAFT`; extraction never publishes products.

## Current authority and reuse

- The existing modular monolith, `ImportJob`/`ImportRow`, transactional outbox, worker lease,
  idempotent catalog upsert, moderation flow, and media pipeline remain authoritative.
- Web extraction is a new source adapter. It must produce the same normalized catalog draft used
  by the existing importer instead of writing products directly.
- Remote images continue through `catalog.media.import-requested`; the extractor stores only their
  public HTTPS source URLs.

## Scope of the first vertical slice

- public HTTPS pages without authentication;
- exact-origin category traversal with bounded pagination;
- bounded product discovery and deduplication;
- fast HTML/JSON-LD/OpenGraph extraction;
- real Chromium rendering through Playwright when static HTML lacks useful product/category data;
- field provenance and row-level validation errors;
- preview first, explicit apply second, catalog result always `DRAFT`;
- deterministic source identity and safe retry.

## Out of scope

- CAPTCHA or anti-bot bypass, stealth automation, residential proxies, and credential handling;
- login-only pages, arbitrary whole-site crawling, scheduled monitoring, and automatic repricing;
- automatic publication or moderation approval;
- production rollout and real requests to third-party sites during local acceptance;
- a promise that every site can be parsed without a domain adapter.

## Canonical flow

1. `POST /organizations/:organizationId/imports/web` validates seller authorization and input.
2. The API creates an idempotent `ImportJob(source=web, dryRun=true)` and emits
   `catalog.web-extraction.requested`.
3. The worker claims the job, traverses only the configured category URLs and bounded pagination,
   and captures product pages through HTTP with Chromium fallback.
4. Extracted candidates become immutable `ImportRow` payloads with normalized payloads or errors;
   the job becomes `VALIDATED`.
5. The seller reviews the report, confirms authorization to use the source materials, and calls the
   explicit apply endpoint. The API stores the actor and timestamp with the job/outbox evidence.
6. Apply emits the existing `catalog.import.requested`; the catalog processor performs idempotent
   DRAFT upserts and queues remote media processing.

## Security and operational boundaries

- Only `https:` URLs without embedded credentials are accepted.
- Site and category URLs must have the same origin.
- DNS resolution, redirects, browser requests, and final URLs reject loopback, private, link-local,
  reserved, documentation, and multicast addresses.
- HTTP responses and rendered HTML have byte limits; category pages, product count, redirects,
  navigation time, and per-job work are bounded.
- Browser contexts have no persisted cookies, downloads, or service workers and are destroyed after
  each job. Production additionally requires network-level egress isolation.
- Extracted descriptions are converted to plain text; source HTML is not persisted.
- A blocked source fails visibly and is not circumvented.
- Production enablement requires a domain-policy/robots review in addition to technical URL safety.

## Assumptions

- The marketplace is USD-first; missing source currency is normalized to USD and identified through
  provenance. This assumption must be reviewed before non-US sources are enabled.
- Missing source SKU receives a deterministic `WEB-<hash>` inventory SKU.
- Generic discovery covers common JSON-LD `ItemList`, product-like links, and `rel=next`. Important
  domains may need versioned adapters after fixture evidence shows a gap.

## Verification contract

- JSON-LD Product, OpenGraph fallback, ItemList discovery, canonical URL normalization, price
  normalization, and duplicate handling have deterministic unit tests.
- Negative tests reject non-HTTPS, credentialed, cross-origin, loopback, and private targets.
- A local Playwright test proves that JavaScript mutates a page and the rendered result is captured.
- API/typecheck/build tests prove the preview/apply contracts integrate without changing the
  existing Shopify import.
- No third-party website is contacted as part of the pilot verification.

## Deferred

- domain adapter registry and fixture refresh tooling;
- seller-side correction of invalid extracted rows;
- per-domain rate policies and production egress containerization;
- scheduled refresh and change detection.
