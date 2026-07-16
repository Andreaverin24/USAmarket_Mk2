-- CreateEnum
CREATE TYPE "MediaProcessingStatus" AS ENUM ('UPLOADING', 'PENDING', 'PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "MediaVariantKind" AS ENUM ('THUMBNAIL', 'OPTIMIZED');

-- CreateEnum
CREATE TYPE "InventoryStatus" AS ENUM ('AVAILABLE', 'UNAVAILABLE');

-- DropIndex
DROP INDEX "products_title_trgm_idx";

-- AlterTable
ALTER TABLE "import_jobs" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "completed_at" TIMESTAMPTZ,
ADD COLUMN     "correlation_id" UUID,
ADD COLUMN     "last_error" VARCHAR(1000),
ADD COLUMN     "lease_expires_at" TIMESTAMPTZ,
ADD COLUMN     "lease_owner" VARCHAR(200),
ADD COLUMN     "mapping" JSONB,
ADD COLUMN     "requested_by_user_id" UUID,
ADD COLUMN     "started_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "import_rows" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "normalized_payload" JSONB;

-- AlterTable
ALTER TABLE "product_media" ADD COLUMN     "byte_size" INTEGER,
ADD COLUMN     "completed_at" TIMESTAMPTZ,
ADD COLUMN     "height" INTEGER,
ADD COLUMN     "original_filename" VARCHAR(500),
ADD COLUMN     "processing_error" VARCHAR(1000),
ADD COLUMN     "processing_status" "MediaProcessingStatus" NOT NULL DEFAULT 'UPLOADING',
ADD COLUMN     "width" INTEGER;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "approved_at" TIMESTAMPTZ,
ADD COLUMN     "moderation_note" TEXT,
ADD COLUMN     "submitted_at" TIMESTAMPTZ;

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity_on_hand" INTEGER NOT NULL DEFAULT 1,
    "quantity_available" INTEGER NOT NULL DEFAULT 1,
    "status" "InventoryStatus" NOT NULL DEFAULT 'AVAILABLE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_attributes" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "value" VARCHAR(500) NOT NULL,
    "normalized_value" VARCHAR(500) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "product_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_variants" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "kind" "MediaVariantKind" NOT NULL,
    "format" VARCHAR(20) NOT NULL,
    "storage_key" VARCHAR(1000) NOT NULL,
    "mime_type" VARCHAR(120) NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "checksum" CHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "media_variants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_product_id_key" ON "inventory_items"("product_id");

-- CreateIndex
CREATE INDEX "inventory_items_organization_id_status_idx" ON "inventory_items"("organization_id", "status");

-- CreateIndex
CREATE INDEX "product_attributes_organization_id_name_normalized_value_idx" ON "product_attributes"("organization_id", "name", "normalized_value");

-- CreateIndex
CREATE UNIQUE INDEX "product_attributes_product_id_name_normalized_value_key" ON "product_attributes"("product_id", "name", "normalized_value");

-- CreateIndex
CREATE INDEX "media_variants_organization_id_media_id_idx" ON "media_variants"("organization_id", "media_id");

-- CreateIndex
CREATE UNIQUE INDEX "media_variants_media_id_kind_format_key" ON "media_variants"("media_id", "kind", "format");

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attributes" ADD CONSTRAINT "product_attributes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attributes" ADD CONSTRAINT "product_attributes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_variants" ADD CONSTRAINT "media_variants_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_variants" ADD CONSTRAINT "media_variants_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "product_media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill the one-to-one inventory projection for products created by the first Phase 2 slice.
INSERT INTO "inventory_items" (
  "id", "organization_id", "product_id", "quantity_on_hand", "quantity_available", "status", "version", "updated_at"
)
SELECT
  gen_random_uuid(), "organization_id", "id", "quantity",
  CASE WHEN "status" IN ('SOLD', 'ARCHIVED') THEN 0 ELSE "quantity" END,
  CASE WHEN "status" IN ('SOLD', 'ARCHIVED') OR "quantity" = 0
    THEN 'UNAVAILABLE'::"InventoryStatus" ELSE 'AVAILABLE'::"InventoryStatus" END,
  1, CURRENT_TIMESTAMP
FROM "products"
ON CONFLICT ("product_id") DO NOTHING;

-- Existing imported media already has an original source/object and must enter processing, not upload.
UPDATE "product_media"
SET "processing_status" = 'PENDING'::"MediaProcessingStatus"
WHERE "source_url" IS NOT NULL OR "storage_key" IS NOT NULL;

-- Preserve indexes that Prisma cannot represent in schema.prisma.
CREATE INDEX "products_title_trgm_idx" ON "products" USING GIN ("title" gin_trgm_ops);
CREATE INDEX "products_public_pagination_idx" ON "products" ("status", "published_at" DESC, "id");
CREATE INDEX "products_materials_gin_idx" ON "products" USING GIN ("materials");
CREATE INDEX "products_colors_gin_idx" ON "products" USING GIN ("colors");
CREATE INDEX "products_styles_gin_idx" ON "products" USING GIN ("styles");
