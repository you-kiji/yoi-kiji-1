CREATE TABLE "StoreNavigationItem" (
  "id" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "href" TEXT NOT NULL,
  "location" TEXT NOT NULL DEFAULT 'HEADER',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "openInNewTab" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StoreNavigationItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StoreNavigationItem_location_isActive_sortOrder_idx"
ON "StoreNavigationItem"("location","isActive","sortOrder");
