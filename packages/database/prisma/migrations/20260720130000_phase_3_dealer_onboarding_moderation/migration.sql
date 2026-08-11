-- Phase 3: dealer onboarding, historical product moderation and notifications.

CREATE TYPE "DealerStatus" AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'CHANGES_REQUESTED',
  'APPROVED',
  'REJECTED',
  'SUSPENDED'
);

CREATE TYPE "DealerVerificationAction" AS ENUM (
  'START_REVIEW',
  'REQUEST_CHANGES',
  'APPROVE',
  'REJECT',
  'SUSPEND'
);

CREATE TYPE "ProductModerationReviewStatus" AS ENUM (
  'SUBMITTED',
  'CHANGES_REQUESTED',
  'APPROVED',
  'PUBLISHED'
);

CREATE TYPE "ModerationCommentVisibility" AS ENUM ('SELLER', 'INTERNAL');
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL');
CREATE TYPE "NotificationStatus" AS ENUM ('QUEUED', 'DELIVERED', 'READ', 'FAILED');

CREATE TABLE "dealer_profiles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "status" "DealerStatus" NOT NULL DEFAULT 'DRAFT',
  "public_dealer_name" VARCHAR(200) NOT NULL,
  "website" VARCHAR(1000),
  "description" TEXT,
  "specialties" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "years_in_business" INTEGER,
  "approved_at" TIMESTAMPTZ,
  "suspended_at" TIMESTAMPTZ,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "dealer_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dealer_applications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "applicant_user_id" UUID NOT NULL,
  "legal_business_name" VARCHAR(240) NOT NULL,
  "public_dealer_name" VARCHAR(200) NOT NULL,
  "business_type" VARCHAR(120) NOT NULL,
  "website" VARCHAR(1000),
  "email" VARCHAR(320) NOT NULL,
  "phone" VARCHAR(60) NOT NULL,
  "business_address" JSONB NOT NULL,
  "contact_person" VARCHAR(200) NOT NULL,
  "company_description" TEXT NOT NULL,
  "specialties" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "years_in_business" INTEGER NOT NULL,
  "supporting_documents" JSONB,
  "status" "DealerStatus" NOT NULL DEFAULT 'DRAFT',
  "review_reason" TEXT,
  "submitted_at" TIMESTAMPTZ,
  "reviewed_by_user_id" UUID,
  "reviewed_at" TIMESTAMPTZ,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "dealer_applications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dealer_verifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "application_id" UUID NOT NULL,
  "reviewer_user_id" UUID NOT NULL,
  "action" "DealerVerificationAction" NOT NULL,
  "from_status" "DealerStatus" NOT NULL,
  "to_status" "DealerStatus" NOT NULL,
  "reason" TEXT,
  "internal_note" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dealer_verifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_moderation_reviews" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "submitted_version" INTEGER NOT NULL,
  "status" "ProductModerationReviewStatus" NOT NULL DEFAULT 'SUBMITTED',
  "moderator_user_id" UUID,
  "requested_changes" TEXT,
  "submitted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "product_moderation_reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_moderation_comments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "review_id" UUID NOT NULL,
  "author_user_id" UUID NOT NULL,
  "visibility" "ModerationCommentVisibility" NOT NULL DEFAULT 'SELLER',
  "body" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_moderation_comments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID,
  "recipient_user_id" UUID NOT NULL,
  "source_event_id" UUID NOT NULL,
  "channel" "NotificationChannel" NOT NULL,
  "type" VARCHAR(160) NOT NULL,
  "subject" VARCHAR(240) NOT NULL,
  "body" TEXT NOT NULL,
  "payload" JSONB,
  "status" "NotificationStatus" NOT NULL DEFAULT 'QUEUED',
  "delivered_at" TIMESTAMPTZ,
  "read_at" TIMESTAMPTZ,
  "last_error" VARCHAR(1000),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "dealer_profiles_organization_id_key"
  ON "dealer_profiles"("organization_id");
CREATE INDEX "dealer_profiles_status_updated_at_idx"
  ON "dealer_profiles"("status", "updated_at");

CREATE UNIQUE INDEX "dealer_applications_organization_id_key"
  ON "dealer_applications"("organization_id");
CREATE INDEX "dealer_applications_status_submitted_at_idx"
  ON "dealer_applications"("status", "submitted_at");
CREATE INDEX "dealer_applications_applicant_user_id_created_at_idx"
  ON "dealer_applications"("applicant_user_id", "created_at");

CREATE INDEX "dealer_verifications_application_id_created_at_idx"
  ON "dealer_verifications"("application_id", "created_at");
CREATE INDEX "dealer_verifications_organization_id_created_at_idx"
  ON "dealer_verifications"("organization_id", "created_at");

CREATE UNIQUE INDEX "product_moderation_reviews_product_id_submitted_version_key"
  ON "product_moderation_reviews"("product_id", "submitted_version");
CREATE INDEX "product_moderation_reviews_status_submitted_at_idx"
  ON "product_moderation_reviews"("status", "submitted_at");
CREATE INDEX "product_moderation_reviews_organization_id_status_idx"
  ON "product_moderation_reviews"("organization_id", "status");

CREATE INDEX "product_moderation_comments_review_id_created_at_idx"
  ON "product_moderation_comments"("review_id", "created_at");
CREATE INDEX "product_moderation_comments_organization_id_created_at_idx"
  ON "product_moderation_comments"("organization_id", "created_at");

CREATE UNIQUE INDEX "notifications_source_event_id_recipient_user_id_channel_key"
  ON "notifications"("source_event_id", "recipient_user_id", "channel");
CREATE INDEX "notifications_recipient_user_id_channel_status_created_at_idx"
  ON "notifications"("recipient_user_id", "channel", "status", "created_at");
CREATE INDEX "notifications_organization_id_created_at_idx"
  ON "notifications"("organization_id", "created_at");

ALTER TABLE "dealer_profiles"
  ADD CONSTRAINT "dealer_profiles_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "dealer_applications"
  ADD CONSTRAINT "dealer_applications_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dealer_applications"
  ADD CONSTRAINT "dealer_applications_applicant_user_id_fkey"
  FOREIGN KEY ("applicant_user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dealer_applications"
  ADD CONSTRAINT "dealer_applications_reviewed_by_user_id_fkey"
  FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "dealer_verifications"
  ADD CONSTRAINT "dealer_verifications_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dealer_verifications"
  ADD CONSTRAINT "dealer_verifications_application_id_fkey"
  FOREIGN KEY ("application_id") REFERENCES "dealer_applications"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dealer_verifications"
  ADD CONSTRAINT "dealer_verifications_reviewer_user_id_fkey"
  FOREIGN KEY ("reviewer_user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "product_moderation_reviews"
  ADD CONSTRAINT "product_moderation_reviews_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_moderation_reviews"
  ADD CONSTRAINT "product_moderation_reviews_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_moderation_reviews"
  ADD CONSTRAINT "product_moderation_reviews_moderator_user_id_fkey"
  FOREIGN KEY ("moderator_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "product_moderation_comments"
  ADD CONSTRAINT "product_moderation_comments_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_moderation_comments"
  ADD CONSTRAINT "product_moderation_comments_review_id_fkey"
  FOREIGN KEY ("review_id") REFERENCES "product_moderation_reviews"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_moderation_comments"
  ADD CONSTRAINT "product_moderation_comments_author_user_id_fkey"
  FOREIGN KEY ("author_user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_recipient_user_id_fkey"
  FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_source_event_id_fkey"
  FOREIGN KEY ("source_event_id") REFERENCES "outbox_events"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
