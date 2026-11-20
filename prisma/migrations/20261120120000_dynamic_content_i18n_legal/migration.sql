CREATE TYPE "LegalPageStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TABLE "Locale" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "nativeName" TEXT NOT NULL,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "direction" TEXT NOT NULL DEFAULT 'ltr',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Locale_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Locale_code_key" ON "Locale"("code");
CREATE INDEX "Locale_isEnabled_sortOrder_idx" ON "Locale"("isEnabled", "sortOrder");

CREATE TABLE "ContentTranslation" (
  "id" TEXT NOT NULL,
  "localeCode" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "fieldKey" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContentTranslation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ContentTranslation_localeCode_entityType_entityId_fieldKey_key"
  ON "ContentTranslation"("localeCode", "entityType", "entityId", "fieldKey");
CREATE INDEX "ContentTranslation_entityType_entityId_idx" ON "ContentTranslation"("entityType", "entityId");
CREATE INDEX "ContentTranslation_localeCode_entityType_idx" ON "ContentTranslation"("localeCode", "entityType");
ALTER TABLE "ContentTranslation" ADD CONSTRAINT "ContentTranslation_localeCode_fkey"
  FOREIGN KEY ("localeCode") REFERENCES "Locale"("code") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "LegalPage" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "status" "LegalPageStatus" NOT NULL DEFAULT 'DRAFT',
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LegalPage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LegalPage_slug_key" ON "LegalPage"("slug");
CREATE INDEX "LegalPage_status_updatedAt_idx" ON "LegalPage"("status", "updatedAt");

CREATE TABLE "LegalPageRevision" (
  "id" TEXT NOT NULL,
  "pageId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "status" "LegalPageStatus" NOT NULL,
  "editorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LegalPageRevision_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LegalPageRevision_pageId_createdAt_idx" ON "LegalPageRevision"("pageId", "createdAt");
ALTER TABLE "LegalPageRevision" ADD CONSTRAINT "LegalPageRevision_pageId_fkey"
  FOREIGN KEY ("pageId") REFERENCES "LegalPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Locale" ("id", "code", "name", "nativeName", "isEnabled", "isDefault", "sortOrder", "updatedAt")
VALUES
  ('locale_en', 'en', 'English', 'English', true, true, 0, CURRENT_TIMESTAMP),
  ('locale_ja', 'ja', 'Japanese', '日本語', true, false, 1, CURRENT_TIMESTAMP);
