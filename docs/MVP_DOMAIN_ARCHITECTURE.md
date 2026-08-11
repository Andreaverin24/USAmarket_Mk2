# THE GUILD MVP domain architecture

## Архитектурный стиль

THE GUILD остаётся modular monolith:

- один Git repository и pnpm workspace;
- одна PostgreSQL и Prisma schema;
- один API process;
- один существующий BullMQ worker;
- единые sessions, authorization, audit и transactional outbox.

Модули разделяют application services и persistence boundaries, но не становятся микросервисами.

## Модули

| Модуль                   | Source of truth                                      | Текущая фаза  |
| ------------------------ | ---------------------------------------------------- | ------------- |
| Identity                 | User, Session                                        | Phase 1       |
| Organizations            | Organization, OrganizationMember, Role, Permission   | Phase 1/3     |
| Dealers                  | DealerApplication, DealerProfile, DealerVerification | Phase 3       |
| Catalog                  | Product, Category, InventoryItem, ProductAttribute   | Phase 2       |
| Moderation               | ProductModerationReview, ProductModerationComment    | Phase 3       |
| Storefront               | Storefront, StorefrontTheme, StorefrontDomain        | Phase 2/3     |
| Imports                  | ImportJob, ImportRow                                 | Phase 2       |
| Media                    | ProductMedia, MediaVariant                           | Phase 2       |
| Notifications            | Notification                                         | Phase 3       |
| Audit/outbox             | AuditLog, OutboxEvent                                | Cross-cutting |
| Conversations/offers     | Не реализовано                                       | Phase 4       |
| Shipping/orders/payments | Не реализовано                                       | Phase 5       |
| Delivery                 | Не реализовано                                       | Phase 6       |
| Disputes/payouts         | Не реализовано                                       | Phase 7       |
| Subscriptions            | Не реализовано                                       | Phase 8       |

## Phase 3 command flow

### Dealer onboarding

1. Authenticated user creates a seller organization and draft application.
2. Application edits require organization OWNER/ADMIN permission and optimistic version.
3. Submit changes `DRAFT|CHANGES_REQUESTED → SUBMITTED` in one transaction.
4. Transaction also writes `AuditLog` and `OutboxEvent`.
5. Platform reviewer executes explicit commands: start review, request changes, approve, reject or
   suspend.
6. Every command appends `DealerVerification`; previous decisions are immutable.
7. Approval updates `DealerProfile` and activates the storefront.

### Product moderation

1. Product remains the Phase 2 canonical record.
2. Submit is permitted only when `DealerProfile.status = APPROVED`.
3. Each submission creates `ProductModerationReview(productId, submittedVersion)`.
4. Requested changes and moderator notes append comments; no review history is overwritten.
5. Dealer edits `NEEDS_CHANGES` product through optimistic locking and resubmits.
6. Platform moderator approves and publishes through application commands.
7. Public catalog/storefront queries require both published product and approved dealer.

### Notifications

Domain transactions emit outbox events. Worker materializes idempotent IN_APP and EMAIL
notification records using the outbox event ID as deduplication key. UI handlers never create
notifications directly.

## Security boundaries

- Tenant IDs from route parameters are resolved against active membership and permission grants.
- Cross-tenant entity lookup includes `organizationId`; sensitive misses return 404.
- Platform actions require a platform membership with the exact permission.
- A public hostname resolves storefront presentation only; it never creates admin authorization.
- Seller cannot grant itself dealer approval or product moderation.
- Mutation endpoints use SessionGuard, CsrfGuard, Zod schemas and domain-state validation.
- Lifecycle changes are transactional and append audit/outbox records.

## Product status compatibility

The Phase 2 enum is retained:

| Existing status | Target semantic          |
| --------------- | ------------------------ |
| `DRAFT`         | DRAFT                    |
| `SUBMITTED`     | IN_REVIEW                |
| `NEEDS_CHANGES` | CHANGES_REQUESTED        |
| `APPROVED`      | approved, not yet public |
| `PUBLISHED`     | ACTIVE/PUBLIC            |
| `RESERVED`      | RESERVED                 |
| `SOLD`          | SOLD                     |
| `ARCHIVED`      | ARCHIVED                 |

Renaming persisted values would create unnecessary migration and API compatibility risk.
