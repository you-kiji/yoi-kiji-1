ALTER TABLE "HomepageSection"
  ADD COLUMN "sectionType" TEXT NOT NULL DEFAULT 'rich-text',
  ADD COLUMN "settings" JSONB,
  ADD COLUMN "slides" JSONB;

CREATE INDEX "HomepageSection_sectionType_isActive_position_idx"
  ON "HomepageSection" ("sectionType", "isActive", "position");
