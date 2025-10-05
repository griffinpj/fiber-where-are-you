-- CreateTable
CREATE TABLE "fiber_providers" (
    "id" TEXT NOT NULL,
    "frn" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "brand_name" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "technology" INTEGER NOT NULL,
    "max_advertised_download_speed" INTEGER NOT NULL,
    "max_advertised_upload_speed" INTEGER NOT NULL,
    "low_latency" INTEGER NOT NULL,
    "business_residential_code" TEXT NOT NULL,
    "state_usps" TEXT NOT NULL,
    "block_geoid" TEXT NOT NULL,
    "h3_res8_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fiber_providers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fiber_providers_block_geoid_idx" ON "fiber_providers"("block_geoid");

-- CreateIndex
CREATE INDEX "fiber_providers_brand_name_idx" ON "fiber_providers"("brand_name");

-- CreateIndex
CREATE INDEX "fiber_providers_state_usps_idx" ON "fiber_providers"("state_usps");