import { getLocaleData } from "@/lib/i18n";
import { getActiveCategories } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";
import { AdvancedSearch } from "@/components/advanced-search";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const locale = await getLocaleData();
  const localeCode = locale.code;
  const [sections, collections, categoryRecords] = await Promise.all([
    prisma.homepageSection.findMany({ where: { isActive: true, key: { not: "announcement" } }, orderBy: [{ position: "asc" }, { key: "asc" }] }),
    prisma.storeCollection.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    getActiveCategories(),
  ]);
  const translationTargets = [
    ...sections.map(item => ({ entityType: "homepageSection", entityId: item.id })),
    ...collections.map(item => ({ entityType: "collection", entityId: item.id })),
    ...categoryRecords.map(item => ({ entityType: "category", entityId: item.id })),
  ];
  const translations = localeCode === "en" || !translationTargets.length ? [] : await prisma.contentTranslation.findMany({
    where: { localeCode, OR: translationTargets.map(target => ({ entityType: target.entityType, entityId: target.entityId })) },
    select: { entityType: true, entityId: true, fieldKey: true, value: true },
  }).catch(() => []);
  const translated = new Map(translations.map(item => [`${item.entityType}:${item.entityId}:${item.fieldKey}`, item.value]));
  const value = (section: typeof sections[number], field: "eyebrow"|"title"|"body"|"imageAlt"|"ctaLabel"|"ctaHref") =>
    translated.get(`homepageSection:${section.id}:${field}`) ?? section[field] ?? "";
  const categories = collections.length
    ? collections.map(item => ({ id: item.id, name: translated.get(`collection:${item.id}:name`) ?? item.name, note: translated.get(`collection:${item.id}:description`) ?? item.description ?? "", image: item.imageUrl ?? "", href: `/shop?collection=${encodeURIComponent(item.slug)}` }))
    : categoryRecords.filter(item => item.parentId === null).map(item => ({ id: item.id, name: translated.get(`category:${item.id}:name`) ?? item.name, note: translated.get(`category:${item.id}:description`) ?? item.description ?? "", image: item.imageUrl ?? "", href: `/shop?category=${encodeURIComponent(item.slug)}` }));

  return <main className="home-redesign">
    {sections.map(section => {
      const eyebrow = value(section, "eyebrow");
      const title = value(section, "title");
      const body = value(section, "body");
      const imageUrl = section.imageUrl;
      const imageAlt = value(section, "imageAlt");
      const ctaLabel = value(section, "ctaLabel");
      const ctaHref = value(section, "ctaHref");
      if (section.key === "search") return <section className="home-search-section" aria-label={locale.labels["search.label"] ?? "Search YOI KIJI collections"} key={section.id}>
        <div>{eyebrow && <p className="editorial-eyebrow editorial-eyebrow--dark">{eyebrow}</p>}{title && <h2>{title}</h2>}{body && <p>{body}</p>}</div>
        <AdvancedSearch labels={locale.labels} />
      </section>;
      if (section.key === "collections") {
        if (!categories.length) return null;
        return <section className="editorial-collections" key={section.id}>
          <div className="editorial-section-heading"><div>{eyebrow && <p className="editorial-eyebrow editorial-eyebrow--dark">{eyebrow}</p>}{title && <h2>{title}</h2>}</div>{ctaLabel && ctaHref && <a className="editorial-text-link" href={ctaHref}>{ctaLabel}</a>}</div>
          <div className="editorial-collection-grid">{categories.map((item,index)=><a className={`editorial-collection editorial-collection--${index+1}`} href={item.href} key={item.id}><div className="editorial-collection__photo" style={item.image?{backgroundImage:`url("${item.image}")`}:undefined}/><div className="editorial-collection__shade"/><div className="editorial-collection__copy"><span>{item.note}</span><h3>{item.name}</h3><b>{locale.labels["home.discover"] ?? "DISCOVER"}</b></div></a>)}</div>
        </section>;
      }
      if (section.key === "hero") return <section className="editorial-hero" aria-label={imageAlt || title || "YOI KIJI"} key={section.id}>
        {imageUrl && <div className="editorial-hero__image" style={{backgroundImage:`url("${imageUrl}")`}}/>}<div className="editorial-hero__shade"/>
        <div className="editorial-hero__topline"><span>{eyebrow}</span></div>
        <div className="editorial-hero__content">{eyebrow && <p className="editorial-eyebrow"><span/>{eyebrow}</p>}{title && <h1>{title}</h1>}{body && <p className="editorial-hero__description">{body}</p>}{ctaLabel && ctaHref && <a className="editorial-cta" href={ctaHref}>{ctaLabel}</a>}</div>
        <div className="editorial-hero__bottom"><span>{imageAlt}</span></div>
      </section>;
      if (section.key === "intro") return <section className="editorial-intro" key={section.id}><div className="editorial-intro__label"><span>{eyebrow}</span></div><div className="editorial-intro__grid">{title && <h2>{title}</h2>}<div>{body && <p>{body}</p>}{ctaLabel && ctaHref && <a className="editorial-text-link" href={ctaHref}>{ctaLabel}</a>}</div></div></section>;
      if (section.key === "feature") return <section className="editorial-feature" key={section.id}>{imageUrl && <div className="editorial-feature__image" role="img" aria-label={imageAlt} style={{backgroundImage:`url("${imageUrl}")`}}/>}<div className="editorial-feature__copy">{eyebrow && <p className="editorial-eyebrow"><span/>{eyebrow}</p>}{title && <h2>{title}</h2>}{body && <p>{body}</p>}{ctaLabel && ctaHref && <a className="editorial-cta editorial-cta--light" href={ctaHref}>{ctaLabel}</a>}</div></section>;
      if (section.key === "manifesto") return <section className="editorial-manifesto" key={section.id}>{imageUrl && <span className="editorial-manifesto__flower" aria-hidden="true">✳</span>}{title && <p>{title}</p>}{body && <span>{body}</span>}</section>;
      if (section.key === "journal") return <section className="editorial-journal" key={section.id}><div>{eyebrow && <p className="editorial-eyebrow"><span/>{eyebrow}</p>}{title && <h2>{title}</h2>}</div>{body && <p>{body}</p>}{ctaLabel && ctaHref && <a className="editorial-text-link" href={ctaHref}>{ctaLabel}</a>}</section>;
      return <section className="editorial-custom-section" key={section.id}>{imageUrl && <div className="editorial-custom-section__image" role="img" aria-label={imageAlt} style={{backgroundImage:`url("${imageUrl}")`}}/>}<div>{eyebrow && <p className="editorial-eyebrow editorial-eyebrow--dark">{eyebrow}</p>}{title && <h2>{title}</h2>}{body && <p>{body}</p>}{ctaLabel && ctaHref && <a className="editorial-text-link" href={ctaHref}>{ctaLabel}</a>}</div></section>;
    })}
  </main>;
}
