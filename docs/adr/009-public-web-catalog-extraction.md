# ADR-009: Public catalog extraction uses HTTP first with Chromium fallback

- Status: Accepted by owner
- Date: 2026-07-31

## Context

Sellers need to import public product pages without API credentials. A browser-only implementation
would process JavaScript sites but would be slow and expensive for pages that already expose
structured HTML. A static-only implementation would miss client-rendered catalogs.

## Decision

Use a bounded, self-hosted extraction worker. It first fetches public HTML and parses JSON-LD,
OpenGraph, and semantic links. When that result is incomplete, the same URL is rendered in a real
Playwright Chromium context. Both paths produce a common `NormalizedProductDraft` with provenance
and feed the existing preview/apply import boundary.

## Alternatives

- Custom browser engine: rejected because maintaining navigation, JavaScript, TLS, rendering, and
  security patches provides no product advantage over Chromium.
- Browser for every page: rejected as the default because it increases latency and resource usage.
- Static scraper only: rejected because it cannot cover JavaScript-rendered catalogs.
- Third-party scraping provider: deferred because it creates an external paid dependency and needs
  a separate owner/cost gate.

## Consequences

- JavaScript sites are supported without making Chromium the cost of every extraction.
- Site changes remain an external failure mode, so row provenance, visible errors, fixtures, and
  optional domain adapters are required.
- The browser worker handles untrusted code and therefore requires strict URL validation and
  production egress isolation.
- Public availability does not authorize publication; preview, seller confirmation, moderation,
  and DRAFT-only catalog writes remain mandatory.
- Canonical product/source separation and immutable capture evidence are defined by ADR-010.
