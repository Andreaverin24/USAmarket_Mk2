-- P0 manual-invoice order flow. The platform records operational state only;
-- it neither processes payments nor stores payment instruments or bank data.
CREATE TYPE "OrderStatus" AS ENUM (
  'AWAITING_SELLER_INVOICE',
  'INVOICE_SENT',
  'PAYMENT_VERIFICATION_PENDING',
  'PAYMENT_CONFIRMED',
  'READY_FOR_FULFILLMENT',
  'CANCELLED'
);

CREATE TYPE "ManualInvoiceStatus" AS ENUM (
  'ISSUED',
  'BUYER_REPORTED',
  'VERIFIED',
  'REJECTED'
);

CREATE TABLE "orders" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "buyer_user_id" UUID NOT NULL,
  "seller_organization_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "product_title_snapshot" VARCHAR(240) NOT NULL,
  "product_price_minor" BIGINT NOT NULL,
  "shipping_minor" BIGINT NOT NULL DEFAULT 0,
  "total_minor" BIGINT NOT NULL,
  "currency" CHAR(3) NOT NULL,
  "status" "OrderStatus" NOT NULL DEFAULT 'AWAITING_SELLER_INVOICE',
  "version" INTEGER NOT NULL DEFAULT 1,
  "cancelled_at" TIMESTAMPTZ,
  "cancellation_reason" VARCHAR(2000),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "orders_buyer_user_id_fkey"
    FOREIGN KEY ("buyer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "orders_seller_organization_id_fkey"
    FOREIGN KEY ("seller_organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "orders_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "orders_nonnegative_amounts" CHECK ("product_price_minor" >= 0 AND "shipping_minor" >= 0 AND "total_minor" >= 0),
  CONSTRAINT "orders_total_matches_snapshots" CHECK ("total_minor" = "product_price_minor" + "shipping_minor")
);

CREATE INDEX "orders_buyer_user_id_created_at_idx" ON "orders"("buyer_user_id", "created_at");
CREATE INDEX "orders_seller_organization_id_status_created_at_idx" ON "orders"("seller_organization_id", "status", "created_at");
CREATE INDEX "orders_status_created_at_idx" ON "orders"("status", "created_at");

CREATE TABLE "manual_invoices" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL,
  "external_reference" VARCHAR(120) NOT NULL,
  "amount_minor" BIGINT NOT NULL,
  "currency" CHAR(3) NOT NULL,
  "due_at" TIMESTAMPTZ NOT NULL,
  "status" "ManualInvoiceStatus" NOT NULL DEFAULT 'ISSUED',
  "issued_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "buyer_reported_at" TIMESTAMPTZ,
  "verified_at" TIMESTAMPTZ,
  "verified_by_user_id" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "manual_invoices_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "manual_invoices_order_id_key" UNIQUE ("order_id"),
  CONSTRAINT "manual_invoices_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "manual_invoices_verified_by_user_id_fkey"
    FOREIGN KEY ("verified_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "manual_invoices_nonnegative_amount" CHECK ("amount_minor" >= 0)
);

CREATE INDEX "manual_invoices_status_due_at_idx" ON "manual_invoices"("status", "due_at");

CREATE TABLE "order_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL,
  "actor_user_id" UUID,
  "action" VARCHAR(80) NOT NULL,
  "from_status" "OrderStatus",
  "to_status" "OrderStatus" NOT NULL,
  "note" VARCHAR(2000),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_events_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "order_events_actor_user_id_fkey"
    FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "order_events_order_id_created_at_idx" ON "order_events"("order_id", "created_at");
