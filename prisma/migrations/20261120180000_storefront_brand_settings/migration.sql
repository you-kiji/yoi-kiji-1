CREATE TABLE "StorefrontBrandSettings" (
  "id" TEXT NOT NULL DEFAULT 'global',
  "background" TEXT NOT NULL DEFAULT '#0e300e',
  "surface" TEXT NOT NULL DEFAULT '#19451b',
  "text" TEXT NOT NULL DEFAULT '#e9e9e9',
  "muted" TEXT NOT NULL DEFAULT '#c8d0c5',
  "accent" TEXT NOT NULL DEFAULT '#c9a878',
  "contentMaxWidth" INTEGER NOT NULL DEFAULT 1440,
  "sectionSpacing" INTEGER NOT NULL DEFAULT 96,
  "buttonRadius" INTEGER NOT NULL DEFAULT 8,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StorefrontBrandSettings_pkey" PRIMARY KEY ("id")
);
