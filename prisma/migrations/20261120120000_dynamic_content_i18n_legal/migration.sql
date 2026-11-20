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
('legal_privacy','privacy-policy','Privacy Policy','DRAFT TEMPLATE — Replace this text with the organisation’s reviewed privacy notice before publishing.

Explain what personal information is collected, why it is collected, the legal basis or consent mechanism, how information is used, retention periods, processors and service providers, cross-border transfers, security controls, customer rights, grievance contact details and how policy changes will be communicated.

Do not publish until the business has verified the actual data flows, vendors and contact details.','DRAFT','Privacy Policy | YOI KIJI','Privacy information for YOI KIJI customers.',NULL,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('legal_terms','terms-and-conditions','Terms & Conditions','DRAFT TEMPLATE — Replace this text with the business-approved terms before publishing.

Cover eligibility, account responsibilities, product descriptions, pricing and tax treatment, order acceptance, payment methods, delivery estimates, cancellation, returns, refunds, intellectual property, acceptable use, limitation of liability, governing law, dispute resolution and customer support.

Confirm the final terms against the actual operating model and applicable law before publication.','DRAFT','Terms & Conditions | YOI KIJI','Terms governing use of the YOI KIJI storefront.',NULL,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
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

-- Storefront interface dictionary (Japanese). Administrators can extend or override any key from Languages & translations.
INSERT INTO "ContentTranslation" ("id","localeCode","entityType","entityId","fieldKey","value","createdAt","updatedAt")
VALUES
('tr_ja_ui_header_shop','ja','ui','storefront','header.shop','ショップ',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_header_categories','ja','ui','storefront','header.categories','カテゴリー',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_header_shopall','ja','ui','storefront','header.shopAll','すべての商品',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_header_shopallcats','ja','ui','storefront','header.shopAllCategories','すべてのカテゴリー',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_header_story','ja','ui','storefront','header.story','私たちについて',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_header_journal','ja','ui','storefront','header.journal','ジャーナル',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_header_search','ja','ui','storefront','header.search','検索',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_header_account','ja','ui','storefront','header.account','アカウント',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_header_bag','ja','ui','storefront','header.bag','バッグ',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_header_menu','ja','ui','storefront','header.menu','メニュー',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_header_close','ja','ui','storefront','header.close','閉じる',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_home_search','ja','ui','storefront','home.searchTitle','コレクションを検索',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_search_label','ja','ui','storefront','search.label','コレクションを検索',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_search_placeholder','ja','ui','storefront','search.placeholder','商品名、カテゴリー、素材、色、SKUで検索',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_search_button','ja','ui','storefront','search.button','検索',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_search_hint','ja','ui','storefront','search.hint','商品名、SKU、カテゴリー、色、素材、商品仕様から検索できます。',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_search_suggested','ja','ui','storefront','search.suggested','おすすめの商品',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_search_recent','ja','ui','storefront','search.recent','最近の検索',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_search_empty','ja','ui','storefront','search.noMatches','一致する商品がありません。素材、色、または短い言葉でお試しください。',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_search_viewall','ja','ui','storefront','search.viewAll','すべての検索結果を見る',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_footer_shop','ja','ui','storefront','footer.shopAll','すべての商品',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_footer_story','ja','ui','storefront','footer.story','私たちについて',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_footer_journal','ja','ui','storefront','footer.journal','ジャーナル',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_footer_contact','ja','ui','storefront','footer.contact','お問い合わせ',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_footer_backtop','ja','ui','storefront','footer.backTop','ページ上部へ',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("localeCode","entityType","entityId","fieldKey") DO NOTHING;

INSERT INTO "HomepageSection" ("id","key","eyebrow","title","body","position","isActive","createdAt","updatedAt")
VALUES ('home_announcement','announcement',NULL,'TEXTILES FOR THE WAY YOU LIVE','COMFORT, CONSIDERED.',-10,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
INSERT INTO "ContentTranslation" ("id","localeCode","entityType","entityId","fieldKey","value","createdAt","updatedAt")
SELECT 'tr_ja_announcement_' || "id" || '_' || field.field_key,'ja','homepageSection',"id",field.field_key,field.translated_value,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
FROM "HomepageSection"
JOIN (VALUES ('announcement','title','暮らしに寄り添うテキスタイル'),('announcement','body','心地よさを、丁寧に。')) AS field(section_key,field_key,translated_value)
ON field.section_key = "HomepageSection"."key"
ON CONFLICT ("localeCode","entityType","entityId","fieldKey") DO NOTHING;

INSERT INTO "ContentTranslation" ("id","localeCode","entityType","entityId","fieldKey","value","createdAt","updatedAt")
VALUES ('tr_ja_ui_search_popular','ja','ui','storefront','search.popular','人気のコレクション',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("localeCode","entityType","entityId","fieldKey") DO NOTHING;
INSERT INTO "ContentTranslation" ("id","localeCode","entityType","entityId","fieldKey","value","createdAt","updatedAt")
SELECT 'tr_ja_collection_' || "slug" || '_' || field.field_key,'ja','collection',"id",field.field_key,field.translated_value,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
FROM "StoreCollection"
JOIN (VALUES
 ('bedsheets','name','ベッドシーツ'),('bedsheets','description','毎日の眠りを心地よく整えるリネン。'),
 ('curtains','name','カーテン'),('curtains','description','光をやわらかく取り込み、空間を彩る。'),
 ('upholstery','name','張り地・ファブリック'),('upholstery','description','自分らしい空間をつくる、豊かな手ざわり。'),
 ('bath-linen','name','バスリネン'),('bath-linen','description','毎日のバスタイムを心地よいひとときに。'),
 ('kitchen-linen','name','キッチンリネン'),('kitchen-linen','description','暮らしの中心に寄り添う、細やかな心づかい。')
) AS field(collection_slug,field_key,translated_value) ON field.collection_slug = "StoreCollection"."slug"
ON CONFLICT ("localeCode","entityType","entityId","fieldKey") DO NOTHING;

INSERT INTO "ContentTranslation" ("id","localeCode","entityType","entityId","fieldKey","value","createdAt","updatedAt")
VALUES
('tr_ja_ui_shop_all','ja','ui','storefront','shop.all','すべての商品',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_shop_title','ja','ui','storefront','shop.title','心地よさを、',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_shop_title2','ja','ui','storefront','shop.titleSecond','すべての部屋に。',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_shop_desc','ja','ui','storefront','shop.description','毎日の暮らしを彩る、丁寧に選ばれたテキスタイル。',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_shop_filter','ja','ui','storefront','shop.filterEyebrow','こだわりの検索',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_shop_find','ja','ui','storefront','shop.findPiece','お気に入りを見つける',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_shop_refine','ja','ui','storefront','shop.refineHint','コレクション、ディテール、価格で絞り込めます。',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_shop_searchlabel','ja','ui','storefront','shop.searchLabel','コレクションを検索',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_shop_searchplaceholder','ja','ui','storefront','shop.searchPlaceholder','商品名、詳細、SKU',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_shop_category','ja','ui','storefront','shop.category','カテゴリー',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_shop_allcategories','ja','ui','storefront','shop.allCategories','すべてのカテゴリー',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_shop_minprice','ja','ui','storefront','shop.minimumPrice','最低価格',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_shop_maxprice','ja','ui','storefront','shop.maximumPrice','最高価格',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_shop_nomin','ja','ui','storefront','shop.noMinimum','下限なし',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_shop_nomax','ja','ui','storefront','shop.noMaximum','上限なし',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_shop_sort','ja','ui','storefront','shop.sortBy','並び替え',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_shop_newest','ja','ui','storefront','shop.newest','新着順',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_shop_pricelow','ja','ui','storefront','shop.priceLow','価格の安い順',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_shop_pricehigh','ja','ui','storefront','shop.priceHigh','価格の高い順',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_shop_namesort','ja','ui','storefront','shop.nameSort','名前順',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_shop_apply','ja','ui','storefront','shop.applyFilters','絞り込む',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_shop_clear','ja','ui','storefront','shop.clearAll','すべてクリア',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_shop_piece','ja','ui','storefront','shop.piece','点',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_shop_pieces','ja','ui','storefront','shop.pieces','点',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_shop_discover','ja','ui','storefront','shop.toDiscover','の商品',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_shop_showing','ja','ui','storefront','shop.showingResults','検索結果',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_shop_allcollections','ja','ui','storefront','shop.allCollections','すべてのコレクションを見る',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_category_eyebrow','ja','ui','storefront','category.eyebrow','YOI KIJI / コレクション',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_category_subtitle','ja','ui','storefront','category.subtitle','心地よい暮らしのために。',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_category_explore','ja','ui','storefront','category.explore','このコレクションを見る',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_category_related','ja','ui','storefront','category.related','関連カテゴリー',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_category_refine','ja','ui','storefront','category.refine','コレクションを絞り込む',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_category_clear','ja','ui','storefront','category.clearFilters','絞り込みをクリア',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_category_nomatches','ja','ui','storefront','category.noFilterMatches','条件に一致する商品がありません。',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_category_coming','ja','ui','storefront','category.comingSoon','新しい商品を準備しています。',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_category_remove','ja','ui','storefront','category.removeFilters','条件を減らして、もう一度お試しください。',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_category_preparing','ja','ui','storefront','category.preparing','このコレクションを準備しています。他のコレクションもご覧ください。',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_product_material','ja','ui','storefront','product.material','素材',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_product_colour','ja','ui','storefront','product.colour','色',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_product_dimensions','ja','ui','storefront','product.dimensions','サイズ',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_product_care','ja','ui','storefront','product.care','お手入れ方法',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_product_relatedeyebrow','ja','ui','storefront','product.relatedEyebrow','おすすめの商品',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_product_relatedtitle','ja','ui','storefront','product.relatedTitle','一緒に楽しむ',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_product_relatedtitle2','ja','ui','storefront','product.relatedTitleAccent','心地よいアイテム。',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_journal_eyebrow','ja','ui','storefront','journal.eyebrow','暮らしをつくるノート',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_journal_title','ja','ui','storefront','journal.title','心地よく暮らす。',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_journal_title2','ja','ui','storefront','journal.titleAccent','自分らしい毎日を。',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_journal_desc','ja','ui','storefront','journal.description','日々の空間をより心地よくするための、ケアガイドやテキスタイルの物語。',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_journal_filter','ja','ui','storefront','journal.filterAria','記事を絞り込む',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_journal_all','ja','ui','storefront','journal.allStories','すべての記事',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_journal_heading','ja','ui','storefront','journal.heading','ジャーナル',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_journal_stories','ja','ui','storefront','journal.stories','記事：',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_journal_read','ja','ui','storefront','journal.readStory','記事を読む',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_journal_empty','ja','ui','storefront','journal.noStories','記事はまだありません。',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_journal_emptyhint','ja','ui','storefront','journal.noStoriesHint','別のカテゴリーを選ぶか、すべての記事をご覧ください。',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_journal_words','ja','ui','storefront','journal.wordsBy','執筆：',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_journal_related','ja','ui','storefront','journal.relatedEyebrow','詳細を見る',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_journal_relatedtitle','ja','ui','storefront','journal.relatedTitle','この記事に登場するアイテム',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_journal_back','ja','ui','storefront','journal.backToJournal','ジャーナルに戻る',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_search_loading','ja','ui','storefront','search.loading','商品を検索しています…',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_search_matching','ja','ui','storefront','search.matching','一致した商品：',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_search_matchcats','ja','ui','storefront','search.matchingCollections','該当するコレクション',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_search_notfound','ja','ui','storefront','search.notFoundEyebrow','見つかりませんでした',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_search_noresults','ja','ui','storefront','search.noResults','一致する商品がありません。',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_search_noresultshint','ja','ui','storefront','search.noResultsHint','別のキーワードで検索するか、すべての商品をご覧ください。',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_common_home','ja','ui','storefront','common.home','ホーム',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_common_shop','ja','ui','storefront','common.shop','ショップ',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_common_journal','ja','ui','storefront','common.journal','ジャーナル',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("localeCode","entityType","entityId","fieldKey") DO NOTHING;

INSERT INTO "ContentTranslation" ("id","localeCode","entityType","entityId","fieldKey","value","createdAt","updatedAt")
VALUES
('tr_ja_ui_product_gallery','ja','ui','storefront','product.gallery','商品画像',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_product_chooseimage','ja','ui','storefront','product.chooseImage','画像を選択',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_product_imagealt','ja','ui','storefront','product.imageAlt','YOI KIJI 商品画像',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_product_viewimage','ja','ui','storefront','product.viewImage','画像を見る',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_product_productview','ja','ui','storefront','product.productView','商品ビュー',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_product_pricenote','ja','ui','storefront','product.priceNote','価格は日本円で表示されています。配送可能地域と送料はチェックアウト時にご確認いただけます。',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_product_unavailable','ja','ui','storefront','product.unavailable','現在在庫切れです',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_product_available','ja','ui','storefront','product.available','ご注文いただけます',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_product_selectvariant','ja','ui','storefront','product.selectVariant','サイズ・オプションを選択',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_product_outofstock','ja','ui','storefront','product.outOfStock','在庫切れ',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_product_added','ja','ui','storefront','product.addedToBag','バッグに追加しました',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_product_add','ja','ui','storefront','product.addToBag','バッグに追加',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_home_discover','ja','ui','storefront','home.discover','詳しく見る',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("localeCode","entityType","entityId","fieldKey") DO NOTHING;

INSERT INTO "ContentTranslation" ("id","localeCode","entityType","entityId","fieldKey","value","createdAt","updatedAt")
VALUES
('tr_ja_ui_seo_home_title','ja','ui','storefront','seo.homeTitle','YOI KIJI — 暮らしに寄り添うテキスタイル',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_seo_home_desc','ja','ui','storefront','seo.homeDescription','ベッドシーツ、カーテン、張り地、バスリネン、キッチンリネン。丁寧に選ばれたテキスタイルで、心地よい暮らしを。',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_seo_journal_title','ja','ui','storefront','seo.journalTitle','ジャーナル | YOI KIJI',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('tr_ja_ui_seo_journal_desc','ja','ui','storefront','seo.journalDescription','テキスタイルの物語やお手入れのヒント、心地よい暮らしのためのアイデア。',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("localeCode","entityType","entityId","fieldKey") DO NOTHING;
