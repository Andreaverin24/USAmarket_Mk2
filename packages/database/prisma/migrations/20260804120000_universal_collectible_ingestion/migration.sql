-- Universal collectible-product ingestion: canonical products, source listings,
-- immutable normalized snapshots and field-level evidence.

CREATE TYPE "CatalogSourceKind" AS ENUM (
  'WEBSITE',
  'MARKETPLACE',
  'AUCTION_HOUSE',
  'API',
  'CSV',
  'MANUAL'
);

CREATE TYPE "ExternalListingAvailability" AS ENUM (
  'AVAILABLE',
  'RESERVED',
  'SOLD',
  'UNAVAILABLE',
  'UNKNOWN'
);

CREATE TYPE "ExternalListingSaleType" AS ENUM (
  'FIXED_PRICE',
  'PRICE_ON_REQUEST',
  'AUCTION',
  'UNKNOWN'
);

ALTER TABLE "products"
  ADD COLUMN "piece_count" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "diameter" DECIMAL(12, 2),
  ADD COLUMN "seat_height" DECIMAL(12, 2),
  ADD COLUMN "designer" VARCHAR(240),
  ADD COLUMN "manufacturer" VARCHAR(240),
  ADD COLUMN "model_name" VARCHAR(240),
  ADD COLUMN "medium" VARCHAR(500),
  ADD COLUMN "condition_description" TEXT,
  ADD COLUMN "signed_details" TEXT,
  ADD COLUMN "edition_details" TEXT,
  ADD COLUMN "literature" TEXT,
  ADD COLUMN "exhibition_history" TEXT,
  ADD COLUMN "source_refresh_locked" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "products"
  ADD CONSTRAINT "products_piece_count_check" CHECK ("piece_count" >= 1);

ALTER TABLE "import_jobs"
  ADD COLUMN "rights_confirmed_by_user_id" UUID,
  ADD COLUMN "rights_confirmed_at" TIMESTAMPTZ,
  ADD COLUMN "rights_scope_hash" CHAR(64);

CREATE TABLE "catalog_sources" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "key" VARCHAR(160) NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "kind" "CatalogSourceKind" NOT NULL,
  "base_url" VARCHAR(2000),
  "adapter_key" VARCHAR(120) NOT NULL,
  "adapter_version" VARCHAR(40) NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "config" JSONB,
  "last_successful_sync_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "catalog_sources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "external_listings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "source_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "external_id" VARCHAR(200) NOT NULL,
  "canonical_url" VARCHAR(2000),
  "source_sku" VARCHAR(120),
  "source_title" VARCHAR(500),
  "sale_type" "ExternalListingSaleType" NOT NULL DEFAULT 'UNKNOWN',
  "availability" "ExternalListingAvailability" NOT NULL DEFAULT 'UNKNOWN',
  "price_minor" BIGINT,
  "currency" CHAR(3),
  "estimate_low_minor" BIGINT,
  "estimate_high_minor" BIGINT,
  "auction_sale_name" VARCHAR(240),
  "auction_lot_number" VARCHAR(120),
  "auction_starts_at" TIMESTAMPTZ,
  "auction_ends_at" TIMESTAMPTZ,
  "first_seen_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_seen_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_captured_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "external_listings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "listing_snapshots" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "listing_id" UUID NOT NULL,
  "import_row_id" UUID,
  "content_hash" CHAR(64) NOT NULL,
  "captured_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "capture_method" VARCHAR(20) NOT NULL,
  "adapter_key" VARCHAR(120) NOT NULL,
  "adapter_version" VARCHAR(40) NOT NULL,
  "raw_payload" JSONB NOT NULL,
  "normalized_payload" JSONB NOT NULL,
  "provenance" JSONB,
  "validation_errors" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "listing_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_field_evidence" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "listing_id" UUID NOT NULL,
  "snapshot_id" UUID NOT NULL,
  "field_path" VARCHAR(200) NOT NULL,
  "source_path" VARCHAR(500) NOT NULL,
  "confidence" DECIMAL(5, 4) NOT NULL,
  "value" JSONB,
  "is_selected" BOOLEAN NOT NULL DEFAULT true,
  "applied_product_version" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_field_evidence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_field_evidence_confidence_check"
    CHECK ("confidence" >= 0 AND "confidence" <= 1)
);

CREATE UNIQUE INDEX "catalog_sources_organization_id_key_key"
  ON "catalog_sources"("organization_id", "key");
CREATE INDEX "catalog_sources_organization_id_kind_enabled_idx"
  ON "catalog_sources"("organization_id", "kind", "enabled");

CREATE UNIQUE INDEX "external_listings_source_id_external_id_key"
  ON "external_listings"("source_id", "external_id");
CREATE UNIQUE INDEX "external_listings_source_id_canonical_url_key"
  ON "external_listings"("source_id", "canonical_url");
CREATE INDEX "external_listings_organization_id_product_id_idx"
  ON "external_listings"("organization_id", "product_id");
CREATE INDEX "external_listings_source_id_availability_last_seen_at_idx"
  ON "external_listings"("source_id", "availability", "last_seen_at");

CREATE UNIQUE INDEX "listing_snapshots_listing_id_content_hash_key"
  ON "listing_snapshots"("listing_id", "content_hash");
CREATE INDEX "listing_snapshots_organization_id_captured_at_idx"
  ON "listing_snapshots"("organization_id", "captured_at");
CREATE INDEX "listing_snapshots_import_row_id_idx"
  ON "listing_snapshots"("import_row_id");

CREATE UNIQUE INDEX "product_field_evidence_product_id_snapshot_id_field_path_key"
  ON "product_field_evidence"("product_id", "snapshot_id", "field_path");
CREATE INDEX "product_field_evidence_product_id_field_path_is_selected_idx"
  ON "product_field_evidence"("product_id", "field_path", "is_selected");
CREATE INDEX "product_field_evidence_listing_id_snapshot_id_idx"
  ON "product_field_evidence"("listing_id", "snapshot_id");

ALTER TABLE "catalog_sources"
  ADD CONSTRAINT "catalog_sources_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "external_listings"
  ADD CONSTRAINT "external_listings_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "external_listings_source_id_fkey"
  FOREIGN KEY ("source_id") REFERENCES "catalog_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "external_listings_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "listing_snapshots"
  ADD CONSTRAINT "listing_snapshots_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "listing_snapshots_listing_id_fkey"
  FOREIGN KEY ("listing_id") REFERENCES "external_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "listing_snapshots_import_row_id_fkey"
  FOREIGN KEY ("import_row_id") REFERENCES "import_rows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "product_field_evidence"
  ADD CONSTRAINT "product_field_evidence_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "product_field_evidence_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "product_field_evidence_listing_id_fkey"
  FOREIGN KEY ("listing_id") REFERENCES "external_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "product_field_evidence_snapshot_id_fkey"
  FOREIGN KEY ("snapshot_id") REFERENCES "listing_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
