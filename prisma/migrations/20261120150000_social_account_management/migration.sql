CREATE TABLE "SocialAccount" (
  "id" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "placement" TEXT NOT NULL DEFAULT 'footer',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SocialAccount_isActive_placement_sortOrder_idx"
ON "SocialAccount"("isActive","placement","sortOrder");
