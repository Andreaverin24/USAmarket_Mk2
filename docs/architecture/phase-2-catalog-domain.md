# Phase 2 catalog domain

## Ownership and invariants

`catalog` owns Category, Product, ProductAttribute, InventoryItem, ProductMedia, MediaVariant, Collection and CollectionProduct. Storefront and marketplace may query public projections but never persist copies of Product.

- Every seller-owned row carries `organizationId`.
- Product slug, SKU and external identity are unique inside the seller tenant.
- InventoryItem is one-to-one with Product in Phase 2 and carries quantity/availability/version. Reservation operations are intentionally absent.
- ProductAttribute stores normalized facet `name`, display `value`, normalized value and sort order. Core frequently queried facets remain typed Product columns/arrays; attributes cover extensible seller metadata.
- Protected repositories always combine resource ID with trusted server-derived tenant context.

## State machine

Allowed transitions:

| From                         | Action    | To            | Actor                                 |
| ---------------------------- | --------- | ------------- | ------------------------------------- |
| DRAFT                        | submit    | SUBMITTED     | seller catalog writer                 |
| NEEDS_CHANGES                | submit    | SUBMITTED     | seller catalog writer                 |
| SUBMITTED                    | approve   | APPROVED      | catalog moderator                     |
| SUBMITTED                    | reject    | NEEDS_CHANGES | catalog moderator; reason required    |
| APPROVED                     | publish   | PUBLISHED     | catalog moderator                     |
| PUBLISHED                    | archive   | ARCHIVED      | seller writer or moderator            |
| DRAFT/NEEDS_CHANGES/APPROVED | archive   | ARCHIVED      | seller writer or moderator            |
| RESERVED                     | mark_sold | SOLD          | future order application service only |

Phase 2 exposes no operation that creates `RESERVED` or `SOLD`; they are defined for compatibility with Phase 3. Every implemented transition performs optimistic version validation, mutation, audit entry and outbox insert in one transaction. Controllers never update status directly.

## Public query model

`CatalogQueryService` returns only active-tenant `PUBLISHED` products. Marketplace scope spans sellers; storefront scope adds one resolved organization. Search is delegated to `SearchProvider`. Pagination has a bounded page size and deterministic tie-breaker. Filters are server-validated and include category, price, seller, condition, style, material, color, dimensions, availability and location.

## Permissions

- `catalog:read`: seller catalog read/export;
- `catalog:write`: create/edit/archive, attributes/inventory/media management;
- `catalog:submit`: submit/re-submit;
- `catalog:moderate`: approve/reject/publish;
- `storefront:write`: theme/navigation/policy settings.

Seed roles grant seller owner all seller permissions and seller staff only explicitly assigned permissions. Platform admin bypass requires `platform:admin` and remains audited.
