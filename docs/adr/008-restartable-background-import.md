# ADR-008: Restartable background catalog import

- Status: Accepted
- Date: 2026-07-15

## Context

Large/retried imports cannot be completed reliably inside one HTTP request. A process crash must not lose progress or duplicate products.

## Decision

HTTP preview persists immutable source rows and validation. Apply writes a `catalog.import.requested` outbox event. Worker claims an ImportJob using a lease and processes each row in an independent idempotent transaction. Imported rows are terminal; failed rows retain errors and can be explicitly retried. Product identity is tenant + Shopify external ID, falling back to tenant + SKU. Same idempotency key with different file checksum is rejected.

## Consequences

- restart resumes unprocessed/failed rows;
- partial failure is observable and recoverable;
- request returns job state rather than waiting for all mutations;
- worker becomes an application adapter for the catalog import boundary;
- acceptance must drain real outbox jobs, not call a synchronous shortcut.
