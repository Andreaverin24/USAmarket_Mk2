-- DecorFlavor Operations & Support P0. These records contain operational
-- communication only; they do not contain payment instruments, documents,
-- payment links, account details, refunds, or delivery evidence.
CREATE TYPE "SupportCaseStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED');
CREATE TYPE "SupportCaseCategory" AS ENUM (
  'ORDER_STATUS',
  'EXTERNAL_INVOICE',
  'FULFILLMENT',
  'OTHER'
);

CREATE TABLE "support_cases" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL,
  "buyer_user_id" UUID NOT NULL,
  "category" "SupportCaseCategory" NOT NULL,
  "subject" VARCHAR(160) NOT NULL,
  "status" "SupportCaseStatus" NOT NULL DEFAULT 'OPEN',
  "version" INTEGER NOT NULL DEFAULT 1,
  "resolved_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "support_cases_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "support_cases_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "support_cases_buyer_user_id_fkey"
    FOREIGN KEY ("buyer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "support_cases_buyer_user_id_status_updated_at_idx"
  ON "support_cases"("buyer_user_id", "status", "updated_at");
CREATE INDEX "support_cases_status_updated_at_idx"
  ON "support_cases"("status", "updated_at");
CREATE INDEX "support_cases_order_id_created_at_idx"
  ON "support_cases"("order_id", "created_at");

CREATE TABLE "support_case_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "support_case_id" UUID NOT NULL,
  "actor_user_id" UUID,
  "action" VARCHAR(80) NOT NULL,
  "from_status" "SupportCaseStatus",
  "to_status" "SupportCaseStatus" NOT NULL,
  "note" VARCHAR(2000),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "support_case_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "support_case_events_support_case_id_fkey"
    FOREIGN KEY ("support_case_id") REFERENCES "support_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "support_case_events_actor_user_id_fkey"
    FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "support_case_events_support_case_id_created_at_idx"
  ON "support_case_events"("support_case_id", "created_at");
