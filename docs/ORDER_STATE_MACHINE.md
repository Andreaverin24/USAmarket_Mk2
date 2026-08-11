# Target order state machine

Status: approved target architecture; **not implemented in Phase 3**.

Main path:

`DRAFT → AWAITING_SHIPPING_QUOTE → QUOTE_READY → AWAITING_PAYMENT → PAYMENT_PROCESSING → PAID → SELLER_CONFIRMATION_REQUIRED → CONFIRMED → PICKUP_SCHEDULING → PICKUP_SCHEDULED → PICKED_UP → IN_TRANSIT → DELIVERED → ACCEPTANCE_PERIOD → COMPLETED`

Exceptional states:

`CANCELLED`, `PAYMENT_FAILED`, `DELIVERY_EXCEPTION`, `DISPUTED`, `REFUND_PENDING`,
`PARTIALLY_REFUNDED`, `REFUNDED`.

Future `OrderStateService` commands must validate current state and actor, execute transactionally,
append status history/audit/outbox, and be idempotent where retries are expected.

Implementation sequence:

- Phase 5: quote, checkout, payment and seller confirmation;
- Phase 6: pickup and delivery;
- Phase 7: acceptance, disputes, refunds and payouts.

No order/payment/delivery tables or claims of implementation are introduced by Phase 3.
