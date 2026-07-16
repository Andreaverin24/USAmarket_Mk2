CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'NEEDS_CHANGES', 'APPROVED', 'PUBLISHED', 'RESERVED', 'SOLD', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProductCondition" AS ENUM ('NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'RESTORED', 'AS_IS');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "MediaModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'VALIDATED', 'PROCESSING', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportRowStatus" AS ENUM ('VALID', 'INVALID', 'IMPORTED', 'SKIPPED', 'FAILED');

-- CreateTable
CREATE TABLE "storefront_themes" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "storefront_id" UUID NOT NULL,
    "preset" VARCHAR(80) NOT NULL DEFAULT 'atlas',
    "logo_url" VARCHAR(1000),
    "favicon_url" VARCHAR(1000),
    "primary_color" VARCHAR(20) NOT NULL DEFAULT '#1d241f',
    "secondary_color" VARCHAR(20) NOT NULL DEFAULT '#eee9df',
    "typography_preset" VARCHAR(80) NOT NULL DEFAULT 'editorial',
    "hero_image_url" VARCHAR(1000),
    "hero_title" VARCHAR(240),
    "hero_subtitle" VARCHAR(500),
    "about" TEXT,
    "contact_email" VARCHAR(320),
    "contact_phone" VARCHAR(60),
    "social_links" JSONB,
    "navigation" JSONB,
    "seo_title" VARCHAR(240),
    "seo_description" VARCHAR(500),
    "policy_pages" JSONB,
    "sales_channels" TEXT[] DEFAULT ARRAY['marketplace', 'storefront']::TEXT[],
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "storefront_themes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "parent_id" UUID,
    "name" VARCHAR(160) NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "city" VARCHAR(120) NOT NULL,
    "region" VARCHAR(120) NOT NULL,
    "postal_code" VARCHAR(20) NOT NULL,
    "country_code" CHAR(2) NOT NULL DEFAULT 'US',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "location_id" UUID,
    "external_source" VARCHAR(40),
    "external_id" VARCHAR(200),
    "title" VARCHAR(240) NOT NULL,
    "slug" VARCHAR(240) NOT NULL,
    "short_description" VARCHAR(500),
    "description" TEXT,
    "product_type" VARCHAR(120) NOT NULL,
    "condition" "ProductCondition" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price_minor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "width" DECIMAL(12,2),
    "height" DECIMAL(12,2),
    "depth" DECIMAL(12,2),
    "dimension_unit" VARCHAR(10) NOT NULL DEFAULT 'in',
    "weight" DECIMAL(12,2),
    "weight_unit" VARCHAR(10) NOT NULL DEFAULT 'lb',
    "materials" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "colors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "styles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "periods" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "maker" VARCHAR(240),
    "country_of_origin" VARCHAR(120),
    "estimated_year_from" INTEGER,
    "estimated_year_to" INTEGER,
    "inventory_sku" VARCHAR(120) NOT NULL,
    "pickup_ready_days" INTEGER NOT NULL DEFAULT 3,
    "authenticity_notes" TEXT,
    "provenance" TEXT,
    "restoration_notes" TEXT,
    "seo_title" VARCHAR(240),
    "seo_description" VARCHAR(500),
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_media" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "type" "MediaType" NOT NULL DEFAULT 'IMAGE',
    "source_url" VARCHAR(2000),
    "storage_key" VARCHAR(1000),
    "mime_type" VARCHAR(120),
    "checksum" CHAR(64),
    "alt_text" VARCHAR(300),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "variants" JSONB,
    "moderation_status" "MediaModerationStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "product_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collections" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_products" (
    "collection_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "collection_products_pkey" PRIMARY KEY ("collection_id","product_id")
);

-- CreateTable
CREATE TABLE "import_jobs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "idempotency_key" VARCHAR(200) NOT NULL,
    "source" VARCHAR(40) NOT NULL DEFAULT 'shopify',
    "checksum" CHAR(64) NOT NULL,
    "dry_run" BOOLEAN NOT NULL DEFAULT true,
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "total_rows" INTEGER NOT NULL DEFAULT 0,
    "valid_rows" INTEGER NOT NULL DEFAULT 0,
    "imported_rows" INTEGER NOT NULL DEFAULT 0,
    "failed_rows" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_rows" (
    "id" UUID NOT NULL,
    "import_job_id" UUID NOT NULL,
    "row_number" INTEGER NOT NULL,
    "external_id" VARCHAR(200),
    "sku" VARCHAR(120),
    "status" "ImportRowStatus" NOT NULL,
    "payload" JSONB NOT NULL,
    "errors" JSONB,
    "product_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "import_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redirect_mappings" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "storefront_id" UUID NOT NULL,
    "source_path" VARCHAR(1000) NOT NULL,
    "target_path" VARCHAR(1000) NOT NULL,
    "status_code" INTEGER NOT NULL DEFAULT 301,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "redirect_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "storefront_themes_organization_id_key" ON "storefront_themes"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "storefront_themes_storefront_id_key" ON "storefront_themes"("storefront_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_parent_id_sort_order_idx" ON "categories"("parent_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "locations_organization_id_name_key" ON "locations"("organization_id", "name");

-- CreateIndex
CREATE INDEX "products_organization_id_status_updated_at_idx" ON "products"("organization_id", "status", "updated_at");

-- CreateIndex
CREATE INDEX "products_category_id_status_idx" ON "products"("category_id", "status");

-- CreateIndex
CREATE INDEX "products_price_minor_status_idx" ON "products"("price_minor", "status");

-- CreateIndex
CREATE UNIQUE INDEX "products_organization_id_slug_key" ON "products"("organization_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "products_organization_id_inventory_sku_key" ON "products"("organization_id", "inventory_sku");

-- CreateIndex
CREATE UNIQUE INDEX "products_organization_id_external_source_external_id_key" ON "products"("organization_id", "external_source", "external_id");

-- CreateIndex
CREATE INDEX "product_media_organization_id_product_id_sort_order_idx" ON "product_media"("organization_id", "product_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "collections_organization_id_slug_key" ON "collections"("organization_id", "slug");

-- CreateIndex
CREATE INDEX "import_jobs_organization_id_created_at_idx" ON "import_jobs"("organization_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "import_jobs_organization_id_idempotency_key_key" ON "import_jobs"("organization_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "import_rows_import_job_id_row_number_key" ON "import_rows"("import_job_id", "row_number");

-- CreateIndex
CREATE UNIQUE INDEX "redirect_mappings_organization_id_source_path_key" ON "redirect_mappings"("organization_id", "source_path");

-- AddForeignKey
ALTER TABLE "storefront_themes" ADD CONSTRAINT "storefront_themes_storefront_id_fkey" FOREIGN KEY ("storefront_id") REFERENCES "storefronts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_products" ADD CONSTRAINT "collection_products_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_products" ADD CONSTRAINT "collection_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_import_job_id_fkey" FOREIGN KEY ("import_job_id") REFERENCES "import_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redirect_mappings" ADD CONSTRAINT "redirect_mappings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redirect_mappings" ADD CONSTRAINT "redirect_mappings_storefront_id_fkey" FOREIGN KEY ("storefront_id") REFERENCES "storefronts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "products_title_trgm_idx" ON "products" USING GIN ("title" gin_trgm_ops);
CREATE INDEX "products_search_fts_idx" ON "products" USING GIN (
  to_tsvector('english', coalesce("title", '') || ' ' || coalesce("description", '') || ' ' || coalesce("maker", ''))
);
