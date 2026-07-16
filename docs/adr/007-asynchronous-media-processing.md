# ADR-007: Asynchronous normalized media variants

- Status: Accepted
- Date: 2026-07-15

## Context

Original media must be preserved while public delivery requires safe, metadata-free optimized variants. Image decoding and external download cannot block API requests and are exposed to untrusted input.

## Decision

Use explicit signed-upload completion followed by transactional outbox and BullMQ processing. `ProductMedia` represents the original and lifecycle; normalized `MediaVariant` rows represent idempotent thumbnail/WebP/AVIF derivatives. Worker verifies magic MIME, checksum, byte/pixel limits, strips metadata by re-encoding and upserts variants. Remote imports additionally enforce HTTPS and SSRF defenses.

## Consequences

- API latency is independent of image processing;
- original evidence remains immutable;
- normalized rows make readiness/query/testing explicit;
- temporary `PENDING/PROCESSING` states must be handled by UI;
- native image codec dependency is required in worker runtime.
