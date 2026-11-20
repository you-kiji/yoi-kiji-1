import { getLocaleData } from "@/lib/i18n";
import { AdvancedSearch } from "@/components/advanced-search";
import { getActiveCategories } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const fallbackCategories = [
  { name: "Bedsheets", note: "A softer beginning and end to every day.", image: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1400&q=90", slug: "bedsheets" },
  { name: "Curtains", note: "Light, filtered to feel just right.", image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1400&q=90", slug: "curtains" },
  { name: "Upholstery", note: "Texture that makes a space your own.", image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1400&q=90", slug: "upholstery" },
  { name: "Bath linen", note: "Everyday rituals, made more considered.", image: "https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=1400&q=90", slug: "bath-linen" },
  { name: "Kitchen linen", note: "The thoughtful details of daily living.", image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=90", slug: "kitchen-linen" },
];

const defaultSectionOrder = ["hero", "intro", "collections", "feature", "manifesto", "journal"] as const;

function paragraphs(value: string) {
  return value.split(/\n+/).map((part) => part.trim()).filter(Boolean);
}

export default async function HomePage() {
  const locale = await getLocaleData();
  const localeCode = locale.code;
  const [allSections, collectionRecords, categoryRecords] = await Promise.all([
    prisma.homepageSection.findMany({ orderBy: [{ position: "asc" }, { key: "asc" }] }).catch(() => []),
    prisma.storeCollection.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }).catch(() => []),
    getActiveCategories(),
  ]);

  const rootCategories = categoryRecords.filter((category) => category.parentId === null);
  const translationTargets = [
    ...allSections.map((item) => ({ entityType: "homepageSection", entityId: item.id })),
    ...collectionRecords.map((item) => ({ entityType: "collection", entityId: item.id })),
    ...categoryRecords.map((item) => ({ entityType: "category", entityId: item.id })),
  ];
  const translations = localeCode === "en" || !translationTargets.length
    ? []
    : await prisma.contentTranslation.findMany({
        where: {
          localeCode,
          OR: translationTargets.map((target) => ({ entityType: target.entityType, entityId: target.entityId })),
        },
        select: { entityType: true, entityId: true, fieldKey: true, value: true },
      }).catch(() => []);

  const translated = new Map(translations.map((item) => [
    item.entityType + ":" + item.entityId + ":" + item.fieldKey,
    item.value,
  ]));
  const sectionByKey = new Map(allSections.map((section) => [section.key, section]));
  const getValue = (
    section: (typeof allSections)[number] | null,
    field: "eyebrow" | "title" | "body" | "imageAlt" | "ctaLabel" | "ctaHref",
    fallback: string,
  ) => {
    if (!section) return fallback;
    return translated.get("homepageSection:" + section.id + ":" + field) ?? section[field] ?? fallback;
  };

  const imageFallbacks = Object.fromEntries(fallbackCategories.map((category) => [category.slug, category.image]));
  const categories = collectionRecords.length
    ? collectionRecords.map((item, index) => ({
        id: item.id,
        name: translated.get("collection:" + item.id + ":name") ?? item.name,
        note: translated.get("collection:" + item.id + ":description") ?? item.description ?? "Thoughtfully chosen textiles for the spaces you return to.",
        image: item.imageUrl || fallbackCategories[index % fallbackCategories.length].image,
        href: "/shop?collection=" + encodeURIComponent(item.slug),
      }))
    : rootCategories.length
      ? rootCategories.map((category, index) => ({
          id: category.id,
          name: translated.get("category:" + category.id + ":name") ?? category.name,
          note: translated.get("category:" + category.id + ":description") ?? category.description ?? "Thoughtfully chosen textiles for the spaces you return to.",
          image: category.imageUrl || imageFallbacks[category.slug] || fallbackCategories[index % fallbackCategories.length].image,
          href: "/shop?category=" + encodeURIComponent(category.slug),
        }))
      : fallbackCategories.map((category) => ({
          id: category.slug,
          name: category.name,
          note: category.note,
          image: category.image,
          href: "/shop?category=" + encodeURIComponent(category.slug),
        }));

  // Preserve the original LIVE editorial composition. CMS values replace copy/media in-place;
  // missing records use the established homepage content rather than rendering an empty page.
  const baselineItems = defaultSectionOrder.flatMap((key, index) => {
    const section = sectionByKey.get(key) ?? null;
    if (section && !section.isActive) return [];
    return [{ key, section, position: section?.position ?? index }];
  });
  const customItems = allSections
    .filter((section) => section.isActive && !defaultSectionOrder.includes(section.key as (typeof defaultSectionOrder)[number]))
    .filter((section) => section.key !== "announcement" && section.key !== "search" && !section.key.startsWith("demo-"))
    .map((section) => ({ key: section.key, section, position: section.position }));
  const homepageItems = [...baselineItems, ...customItems].sort((a, b) => a.position - b.position);

  return (
    <main className="home-redesign">
      {homepageItems.map(({ key, section }) => {
        if (key === "hero") {
          const eyebrow = getValue(section, "eyebrow", "A QUIETER KIND OF LUXURY");
          const title = getValue(section, "title", "");
          const body = getValue(section, "body", "Thoughtful textiles. Natural textures. A softer way to come home.");
          const imageUrl = section?.imageUrl || "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=2000&q=90";
          const imageAlt = getValue(section, "imageAlt", "YOI KIJI home textiles");
          const ctaLabel = getValue(section, "ctaLabel", "Explore the collection");
          const ctaHref = getValue(section, "ctaHref", "/shop");
          return (
            <section className="editorial-hero" aria-label={imageAlt || "YOI KIJI home textiles"} key={key}>
              <div className="editorial-hero__image" style={{ backgroundImage: "url(\"" + imageUrl + "\")" }} />
              <div className="editorial-hero__shade" />
              <div className="editorial-hero__topline"><span>YOI KIJI — THE ART OF TEXTILE LIVING</span></div>
              <div className="editorial-hero__content">
                <p className="editorial-eyebrow"><span />{eyebrow}</p>
                <h1>{title || <>Make room<br />for <em>feeling.</em></>}</h1>
                <p className="editorial-hero__description">{body}</p>
                <a className="editorial-cta" href={ctaHref}>{ctaLabel}</a>
                <div className="editorial-hero__search"><AdvancedSearch compact labels={locale.labels} /></div>
              </div>
              <div className="editorial-hero__bottom"><span>COMFORT, CONSIDERED.</span><span>SCROLL TO DISCOVER</span></div>
            </section>
          );
        }

        if (key === "intro") {
          const eyebrow = getValue(section, "eyebrow", "THE YOI KIJI PHILOSOPHY");
          const title = getValue(section, "title", "");
          const body = getValue(section, "body", "In the first light of morning. In the feeling of fresh linen. In the small rituals that turn a room into your own kind of sanctuary.\nWe believe the things closest to us should feel considered, beautiful and made to be lived with.");
          const ctaLabel = getValue(section, "ctaLabel", "Discover our point of view");
          const ctaHref = getValue(section, "ctaHref", "/our-story");
          return (
            <section className="editorial-intro" key={key}>
              <div className="editorial-intro__label"><span>{eyebrow}</span></div>
              <div className="editorial-intro__grid">
                <h2>{title || <>Beauty lives in<br />the <em>everyday.</em></>}</h2>
                <div>{paragraphs(body).map((paragraph, index) => <p key={index}>{paragraph}</p>)}<a className="editorial-text-link" href={ctaHref}>{ctaLabel}</a></div>
              </div>
            </section>
          );
        }

        if (key === "collections") {
          const eyebrow = getValue(section, "eyebrow", "THE COLLECTIONS");
          const title = getValue(section, "title", "");
          const ctaLabel = getValue(section, "ctaLabel", "View all collections");
          const ctaHref = getValue(section, "ctaHref", "/shop");
          return (
            <section className="editorial-collections" key={key}>
              <div className="editorial-section-heading">
                <div><p className="editorial-eyebrow editorial-eyebrow--dark">{eyebrow}</p><h2>{title || <>Find your <em>own rhythm.</em></>}</h2></div>
                <a className="editorial-text-link" href={ctaHref}>{ctaLabel}</a>
              </div>
              <div className="editorial-collection-grid">
                {categories.map((item, index) => (
                  <a className={"editorial-collection editorial-collection--" + (index + 1)} href={item.href} key={item.id}>
                    <div className="editorial-collection__photo" style={{ backgroundImage: "url(\"" + item.image + "\")" }} />
                    <div className="editorial-collection__shade" />
                    <div className="editorial-collection__copy"><span>{item.note}</span><h3>{item.name}</h3><b>{locale.labels["home.discover"] ?? "DISCOVER"}</b></div>
                  </a>
                ))}
              </div>
            </section>
          );
        }

        if (key === "feature") {
          const eyebrow = getValue(section, "eyebrow", "THE BEDDING EDIT");
          const title = getValue(section, "title", "");
          const body = getValue(section, "body", "Beautifully considered bedding for slower mornings, longer evenings and everything in between.");
          const imageUrl = section?.imageUrl || "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1800&q=90";
          const imageAlt = getValue(section, "imageAlt", "Softly layered natural bed linen in a sunlit bedroom");
          const ctaLabel = getValue(section, "ctaLabel", "Shop bedsheets");
          const ctaHref = getValue(section, "ctaHref", "/shop?category=bedsheets");
          return (
            <section className="editorial-feature" key={key}>
              <div className="editorial-feature__image" role="img" aria-label={imageAlt} style={{ backgroundImage: "url(\"" + imageUrl + "\")" }} />
              <div className="editorial-feature__copy">
                <p className="editorial-eyebrow"><span />{eyebrow}</p>
                <h2>{title || <>Rest, in<br /><em>your own way.</em></>}</h2>
                <p>{body}</p>
                <a className="editorial-cta editorial-cta--light" href={ctaHref}>{ctaLabel}</a>
                <small>SINGLE&nbsp;&nbsp; / &nbsp;&nbsp;DOUBLE&nbsp;&nbsp; / &nbsp;&nbsp;KING&nbsp;&nbsp; / &nbsp;&nbsp;FITTED</small>
              </div>
            </section>
          );
        }

        if (key === "manifesto") {
          const title = getValue(section, "title", "");
          const body = getValue(section, "body", "日々を、心地よく。");
          return (
            <section className="editorial-manifesto" key={key}>
              <span className="editorial-manifesto__flower" aria-hidden="true">✳</span>
              <p>{title || <>Not more things.<br />Just more <em>meaning</em> in the things we keep.</>}</p>
              <span className="editorial-manifesto__jp">{body}</span>
            </section>
          );
        }

        if (key === "journal") {
          const eyebrow = getValue(section, "eyebrow", "NOTES FOR LIVING WELL");
          const title = getValue(section, "title", "");
          const body = getValue(section, "body", "Explore stories, care notes and considered ideas for creating spaces that feel like you.");
          const ctaLabel = getValue(section, "ctaLabel", "Read the journal");
          const ctaHref = getValue(section, "ctaHref", "/journal");
          return (
            <section className="editorial-journal" key={key}>
              <div><p className="editorial-eyebrow"><span />{eyebrow}</p><h2>{title || <>A little more<br /><em>thoughtfulness.</em></>}</h2></div>
              <p>{body}</p>
              <a className="editorial-text-link" href={ctaHref}>{ctaLabel}</a>
            </section>
          );
        }

        const eyebrow = getValue(section, "eyebrow", "");
        const title = getValue(section, "title", "");
        const body = getValue(section, "body", "");
        const imageUrl = section?.imageUrl ?? "";
        const imageAlt = getValue(section, "imageAlt", "");
        const ctaLabel = getValue(section, "ctaLabel", "");
        const ctaHref = getValue(section, "ctaHref", "");
        return (
          <section className="editorial-custom-section" key={key}>
            {imageUrl && <div className="editorial-custom-section__image" role="img" aria-label={imageAlt} style={{ backgroundImage: "url(\"" + imageUrl + "\")" }} />}
            <div>
              {eyebrow && <p className="editorial-eyebrow editorial-eyebrow--dark">{eyebrow}</p>}
              {title && <h2>{title}</h2>}
              {paragraphs(body).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
              {ctaLabel && ctaHref && <a className="editorial-text-link" href={ctaHref}>{ctaLabel}</a>}
            </div>
          </section>
        );
      })}
    </main>
  );
}
