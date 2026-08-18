# DecorFlavor: P0 manual-invoice — completion record

**Status:** completed on 2026-08-17

## Delivered vertical path

1. Public storefront product page reserves one available unique item.
2. A buyer account can be created or signed in to create and view the order.
3. The seller records an invoice reference, shipping amount, and due date for an invoice issued outside DecorFlavor.
4. The buyer reports payment; this does not change the order to confirmed.
5. Only a user with `platform:admin` confirms or rejects the report.
6. The seller moves a confirmed order to `READY_FOR_FULFILLMENT`.

## Operational guarantees

- one P0 order is bound to one seller and one `quantity = 1` product;
- reservation is atomic and releases product/inventory only on pre-confirmation cancellation;
- every mutation uses optimistic order versioning and writes `OrderEvent`, audit log, and outbox event in the same transaction;
- no acquiring, payment instrument, payment link, bank detail, statement, invoice file, webhook, payout, or real-money action is implemented.

## Evidence

- P0 unit state-machine tests: 4/4 passed;
- isolated PostgreSQL integration test: 1/1 passed;
- isolated migration + seed check passed with four published, reservable sample products;
- Prisma schema validation passed;
- API, web and portal type checks passed;
- production builds for `apps/web` and `apps/portal` passed.

## Deliberately next, not part of this P0

Delivery address collection, driver assignment, pickup/delivery tracking, proof of delivery, refunds/disputes, tax calculation, invoice delivery e-mail, and any payment provider require a separate authorized design slice.
