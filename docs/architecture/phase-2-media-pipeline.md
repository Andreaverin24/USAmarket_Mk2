# Phase 2 media pipeline

## Flow

1. Authenticated seller requests a signed URL for a product inside trusted tenant context.
2. API validates filename extension, declared MIME, byte limit and SHA-256 format, creates `ProductMedia` in `UPLOADING`, and signs only an organization/product-scoped original key.
3. Client uploads the original directly to object storage.
4. Client calls completion endpoint. API HEAD-checks object size/content type/checksum metadata and atomically sets `PENDING` plus `catalog.media.processing-requested` outbox event.
5. Worker downloads the stored original with a strict byte cap, verifies magic-byte MIME and checksum, decodes with pixel limits, auto-orients and removes metadata by re-encoding.
6. Worker writes normalized thumbnail and optimized WebP/AVIF variants, upserts `MediaVariant`, sets media `READY`, and records processing evidence. Failure sets `FAILED` and retains the original for diagnosis/retry.

Remote Shopify URLs enter at step 5 through `catalog.media.import-requested`; HTTPS, DNS resolution, private/reserved address rejection, redirects, timeout and response size are validated before original persistence.

## Variants

- thumbnail WebP, max 480×480;
- optimized WebP, max 1600×1600;
- optimized AVIF, max 1600×1600 when encoder succeeds;
- all derivatives are auto-oriented and encoded without source EXIF, including GPS;
- original object is immutable and never replaced.

`MediaVariant` stores kind, format, key, width, height, bytes and checksum. `(mediaId, kind, format)` is unique, making processing idempotent.

## Security

- allowlist: JPEG, PNG, WebP, AVIF;
- max upload/download bytes and max decoded pixels;
- declared MIME is not trusted without magic-byte verification;
- no arbitrary storage key from the client;
- media authorization scopes product and media IDs by organization;
- checksum mismatch fails processing;
- outbox and BullMQ provide at-least-once delivery, so writes are upserts.
