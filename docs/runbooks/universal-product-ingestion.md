# Universal product ingestion runbook

## Current state

The universal schema and processor are implemented locally. Migration
`20260804120000_universal_collectible_ingestion` has not been deployed to Supabase. Do not start an
apply job against the cloud database until that migration is explicitly approved and deployed.

## Read-only source diagnostic

This command fetches one public HTTPS product page, discards the HTML, and prints only the
normalized preview. It does not write to PostgreSQL, Redis, S3, or the source site.

```powershell
& .\packages\database\node_modules\.bin\tsx.cmd `
  packages/catalog/scripts/inspect-url.ts `
  'https://www.establishedlines.com/products/leather-lacquered-mahogany-post-modern-window-bench'
```

## Deployment gate

1. Take or verify a recoverable Supabase database backup.
2. Review the additive migration SQL and confirm the target database from `.env`.
3. Deploy migrations only after explicit owner approval:

```powershell
& .\packages\database\node_modules\.bin\prisma.cmd migrate deploy `
  --schema packages/database/prisma/schema.prisma
```

4. Regenerate the client and restart API and worker processes.
5. Create a web preview for one small Established Lines category and review every valid/invalid
   row.
6. Confirm content/image rights in the apply action. Apply must create only `DRAFT` products.

## Acceptance checks after deployment

For one applied row, verify:

- one `catalog_sources` record for `establishedlines.com`;
- one `external_listings` record linked to the product;
- one `listing_snapshots` record without page HTML;
- field provenance in `product_field_evidence`;
- canonical `products.source_refresh_locked = false` until the seller edits the card;
- inventory equal to one only when the source listing is available;
- media records queued for asynchronous S3 processing;
- no automatic publication or moderation transition.

Re-run the identical source capture: no second product or identical snapshot may be created. Change
one source field and re-run: a new snapshot must be appended. Manually edit the product and re-run:
listing/snapshot/evidence may refresh, but canonical seller-edited fields must remain unchanged.

## Rollback boundary

The migration is additive and keeps legacy source fields. Application code can be rolled back
without immediately dropping the new tables. A destructive database rollback requires the verified
backup and a separately reviewed rollback migration; do not hand-delete cloud tables.
