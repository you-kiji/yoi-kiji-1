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

-- Seed editable homepage blocks. Administrators can reorder, revise, hide or replace every block.
INSERT INTO "HomepageSection" ("id","key","eyebrow","title","body","imageUrl","imageAlt","ctaLabel","ctaHref","position","isActive","createdAt","updatedAt")
VALUES
('home_hero','hero','A QUIETER KIND OF LUXURY','Make room for feeling.','Thoughtful textiles. Natural textures. A softer way to come home.','https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=2000&q=90','A softly layered Japanese-inspired living space','Explore the collection','/shop',0,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('home_intro','intro','THE YOI KIJI PHILOSOPHY','Beauty lives in the everyday.','In the first light of morning. In the feeling of fresh linen. In the small rituals that turn a room into your own kind of sanctuary.',NULL,NULL,'Discover our point of view','/our-story',1,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('home_collections','collections','THE COLLECTIONS','Find your own rhythm.','Explore considered textiles for every room.',NULL,NULL,'View all collections','/shop',2,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('home_feature','feature','THE BEDDING EDIT','Rest, in your own way.','Beautifully considered bedding for slower mornings, longer evenings and everything in between.','https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1800&q=90','Natural bed linen in a softly lit bedroom','Shop bedsheets','/shop?category=bedsheets',3,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('home_manifesto','manifesto','A NOTE FROM YOI KIJI','Not more things. Just more meaning in the things we keep.','日々を、心地よく。',NULL,NULL,NULL,NULL,4,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('home_journal','journal','NOTES FOR LIVING WELL','A little more thoughtfulness.','Explore stories, care notes and considered ideas for creating spaces that feel like you.','',NULL,'Read the journal','/journal',5,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

-- Starter policy pages are deliberately drafts. A business owner must review and publish the final legal wording.
INSERT INTO "LegalPage" ("id","slug","title","content","status","seoTitle","seoDescription","publishedAt","createdAt","updatedAt")
VALUES
('legal_privacy','privacy-policy','Privacy Policy','DRAFT TEMPLATE — Replace this text with the organisation’s reviewed privacy notice before publishing.\n\nExplain what personal information is collected, why it is collected, the legal basis or consent mechanism, how information is used, retention periods, processors and service providers, cross-border transfers, security controls, customer rights, grievance contact details and how policy changes will be communicated.\n\nDo not publish until the business has verified the actual data flows, vendors and contact details.','DRAFT','Privacy Policy | YOI KIJI','Privacy information for YOI KIJI customers.',NULL,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('legal_terms','terms-and-conditions','Terms & Conditions','DRAFT TEMPLATE — Replace this text with the business-approved terms before publishing.\n\nCover eligibility, account responsibilities, product descriptions, pricing and tax treatment, order acceptance, payment methods, delivery estimates, cancellation, returns, refunds, intellectual property, acceptable use, limitation of liability, governing law, dispute resolution and customer support.\n\nConfirm the final terms against the actual operating model and applicable law before publication.','DRAFT','Terms & Conditions | YOI KIJI','Terms governing use of the YOI KIJI storefront.',NULL,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('legal_shipping','shipping-policy','Shipping Policy','DRAFT TEMPLATE — Confirm carriers, serviceable PIN codes, dispatch cut-offs, delivery estimates, shipping charges, tracking process, failed delivery handling and damage/loss escalation before publishing. Do not promise delivery timelines until operationally verified.','DRAFT','Shipping Policy | YOI KIJI','Shipping and delivery information for YOI KIJI orders.',NULL,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('legal_returns','returns-refunds','Returns & Refunds Policy','DRAFT TEMPLATE — Define eligible and excluded products, return window, condition requirements, evidence required, return authorisation, pickup/drop-off process, inspection, refund method and timelines. Confirm the policy against applicable consumer law and actual fulfilment capability before publishing.','DRAFT','Returns & Refunds | YOI KIJI','Returns, exchanges and refund information.',NULL,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('legal_cancellation','cancellation-policy','Cancellation Policy','DRAFT TEMPLATE — Specify when customers can cancel, order states that prevent cancellation, how cancellation requests are made, refund handling and exceptions. Confirm the process with the order and fulfilment systems before publishing.','DRAFT','Cancellation Policy | YOI KIJI','Order cancellation information for YOI KIJI customers.',NULL,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

-- Japanese starter translations for the seeded homepage blocks. English remains the canonical fallback.
INSERT INTO "ContentTranslation" ("id","localeCode","entityType","entityId","fieldKey","value","createdAt","updatedAt")
SELECT 'tr_ja_' || "key" || '_' || field.field_key, 'ja', 'homepageSection', "id", field.field_key, field.translated_value, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "HomepageSection"
JOIN (VALUES
  ('hero','eyebrow','静けさの中にある、上質な暮らし'),
  ('hero','title','心地よさを、暮らしの中に。'),
  ('hero','body','丁寧に選ばれたテキスタイル。自然な風合い。毎日に、やさしい心地よさを。'),
  ('hero','ctaLabel','コレクションを見る'),
  ('intro','eyebrow','YOI KIJI の哲学'),
  ('intro','title','美しさは、日々の中に。'),
  ('intro','body','朝の光。清潔なリネンの肌ざわり。部屋を自分らしい安らぎの場所に変える、小さな習慣。'),
  ('intro','ctaLabel','私たちの想い'),
  ('collections','eyebrow','コレクション'),
  ('collections','title','自分らしい心地よさを。'),
  ('collections','body','それぞれの空間に寄り添う、こだわりのテキスタイル。'),
  ('collections','ctaLabel','すべてのコレクションを見る'),
  ('feature','eyebrow','ベッドリネン'),
  ('feature','title','自分らしく、深く休む。'),
  ('feature','body','ゆっくりとした朝も、穏やかな夜も。日々に寄り添う、丁寧に選ばれたベッドリネン。'),
  ('feature','ctaLabel','ベッドシーツを見る'),
  ('manifesto','eyebrow','YOI KIJI からのメッセージ'),
  ('manifesto','title','ものを増やすのではなく。大切なものに、もっと意味を。'),
  ('journal','eyebrow','心地よい暮らしのためのノート'),
  ('journal','title','日々に、もう少しの思いやりを。'),
  ('journal','body','暮らしの物語、お手入れのヒント、自分らしい空間をつくるためのアイデアをご紹介します。'),
  ('journal','ctaLabel','ジャーナルを読む')
) AS field(section_key, field_key, translated_value) ON field.section_key = "HomepageSection"."key"
ON CONFLICT ("localeCode","entityType","entityId","fieldKey") DO NOTHING;

INSERT INTO "ContentTranslation" ("id","localeCode","entityType","entityId","fieldKey","value","createdAt","updatedAt")
SELECT 'tr_ja_category_' || "slug" || '_' || field.field_key, 'ja', 'category', "id", field.field_key, field.translated_value, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Category"
JOIN (VALUES
  ('bedsheets','name','ベッドシーツ'),('bedsheets','description','毎日の眠りを心地よく整えるリネン。'),
  ('curtains','name','カーテン'),('curtains','description','光をやわらかく取り込み、空間を彩る。'),
  ('upholstery','name','張り地・ファブリック'),('upholstery','description','自分らしい空間をつくる、豊かな手ざわり。'),
  ('bath-linen','name','バスリネン'),('bath-linen','description','毎日のバスタイムを心地よいひとときに。'),
  ('kitchen-linen','name','キッチンリネン'),('kitchen-linen','description','暮らしの中心に寄り添う、細やかな心づかい。')
) AS field(category_slug, field_key, translated_value) ON field.category_slug = "Category"."slug"
ON CONFLICT ("localeCode","entityType","entityId","fieldKey") DO NOTHING;
