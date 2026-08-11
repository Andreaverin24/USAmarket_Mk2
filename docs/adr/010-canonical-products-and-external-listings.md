# ADR-010: Separate canonical collectible products from external listings

- Status: Accepted by owner
- Date: 2026-08-04

## Context

The same unique object can be listed on a dealer site and one or more marketplaces. Source URLs,
prices, availability, auction metadata, and titles change independently from the marketplace's
moderated product card. Storing a single external identity directly on `Product` cannot preserve
that distinction or explain where canonical fields came from.

## Decision

Keep `Product` as the canonical marketplace object. Add organization-scoped `CatalogSource` and
`ExternalListing`, immutable content-addressed `ListingSnapshot`, and `ProductFieldEvidence`.
Adapters produce one shared normalized contract. Applying an import writes a `DRAFT` product and
its source evidence transactionally. Legacy product external identity remains temporarily for
backward compatibility but is no longer the universal relationship.

## Alternatives

- Store every source as a separate `Product`: rejected because cross-listed objects duplicate
  inventory and moderation.
- Store all source data in one JSON column on `Product`: rejected because history, source conflicts,
  querying, and auditability become opaque.
- Create a different table per marketplace: rejected because every new source would require schema
  and application branching.
- Automatically merge cross-source listings: deferred because false matches can merge distinct
  collectible objects.

## Consequences

- New sources usually require only an adapter, not a schema migration.
- Source changes are append-only evidence and canonical edits remain reviewable.
- One product can later be linked to several source listings safely.
- The initial migration is additive, but import processing becomes responsible for maintaining the
  source/listing/snapshot/evidence graph transactionally.

## Conditions for review

Review after multi-source fixtures demonstrate a safe operator-assisted or confidence-based
cross-source matching workflow.
