import { getLocaleData } from "@/lib/i18n";
import { AdvancedSearch } from "@/components/advanced-search";
import { getActiveCategories } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const defaultSectionOrder = ["hero", "intro", "collections", "feature", "manifesto", "journal"] as const;

function paragraphs(value: string) {
  return value.split(/\n+/).map((part) => part.trim()).filter(Boolean);
}

export default async function HomePage() {
  const locale = await getLocaleData();
  const localeCode = locale.code;
  const [allSections, collectionRecords, categoryRecords, featuredProducts, recentArticles] = await Promise.all([
    prisma.homepageSection.findMany({ orderBy: [{ position: "asc" }, { key: "asc" }] }).catch(() => []),
    prisma.storeCollection.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }).catch(() => []),
    getActiveCategories(),
    prisma.product.findMany({where:{isActive:true},select:{id:true,name:true,slug:true,pricePaise:true,images:{where:{isPrimary:true},take:1,select:{url:true,alt:true}}},orderBy:{updatedAt:"desc"},take:8}).catch(()=>[]),
    prisma.blogPost.findMany({where:{status:"PUBLISHED",noIndex:false},select:{id:true,title:true,slug:true,excerpt:true,coverImageUrl:true,coverImageAlt:true,publishedAt:true},orderBy:{publishedAt:"desc"},take:3}).catch(()=>[]),
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
    _fallback: string,
  ) => {
    if (!section) return "";
    return translated.get("homepageSection:" + section.id + ":" + field) ?? section[field] ?? "";
  };

  const categories = collectionRecords.length
    ? collectionRecords.map((item) => ({
        id: item.id,
        name: translated.get("collection:" + item.id + ":name") ?? item.name,
        note: translated.get("collection:" + item.id + ":description") ?? item.description ?? "",
        image: item.imageUrl ?? "",
        href: "/shop?collection=" + encodeURIComponent(item.slug),
      }))
    : rootCategories.map((category) => ({
        id: category.id,
        name: translated.get("category:" + category.id + ":name") ?? category.name,
        note: translated.get("category:" + category.id + ":description") ?? category.description ?? "",
        image: category.imageUrl ?? "",
        href: "/shop?category=" + encodeURIComponent(category.slug),
      }));

  // Preserve the original LIVE editorial composition. CMS values replace copy/media in-place;
  // The homepage content and visibility are database-owned; absent or hidden sections stay hidden.
  const baselineItems = defaultSectionOrder.flatMap((key) => {
    const section = sectionByKey.get(key) ?? null;
    if (!section || !section.isActive) return [];
    return [{ key, section, position: section.position }];
  });
  const customItems = allSections
    .filter((section) => section.isActive && !defaultSectionOrder.includes(section.key as (typeof defaultSectionOrder)[number]))
    .filter((section) => section.key !== "announcement" && section.key !== "search" && !section.key.startsWith("demo-"))
    .map((section) => ({ key: section.key, section, position: section.position }));
  const homepageItems = [...baselineItems, ...customItems].sort((a, b) => a.position - b.position);

  return (
    <main className="home-redesign">
      {homepageItems.map(({ key, section }) => {
        if (section.sectionType === "product-grid") {
          return (
            <section className="storefront-dynamic-grid" key={section.id}>
              <div className="editorial-section-heading"><div><p className="editorial-eyebrow editorial-eyebrow--dark">{section.eyebrow || "THE EDIT"}</p><h2>{section.title || "Considered essentials"}</h2></div>{section.ctaHref && <a className="editorial-text-link" href={section.ctaHref}>{section.ctaLabel || "Shop all"}</a>}</div>
              <div className="storefront-product-grid">{featuredProducts.slice(0,8).map(product=><a className="storefront-product-card" href={"/shop?search="+encodeURIComponent(product.name)} key={product.id}>
                {product.images[0]?.url ? <img src={product.images[0].url} alt={product.images[0].alt || product.name} loading="lazy"/> : <span className="storefront-product-card__placeholder"/>}
                <span className="storefront-product-card__name">{product.name}</span><span className="storefront-product-card__price">{new Intl.NumberFormat(localeCode==="ja"?"ja-JP":"en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(product.pricePaise/100)}</span>
              </a>)}</div>
            </section>
          );
        }
        if (section.sectionType === "featured-collections") {
          return (
            <section className="editorial-collections" key={section.id}>
              <div className="editorial-section-heading"><div><p className="editorial-eyebrow editorial-eyebrow--dark">{section.eyebrow || "EXPLORE"}</p><h2>{section.title || "Shop by collection"}</h2></div>{section.ctaHref && <a className="editorial-text-link" href={section.ctaHref}>{section.ctaLabel || "View all"}</a>}</div>
              <div className="editorial-collection-grid">{categories.map((item,index)=><a className={"editorial-collection editorial-collection--"+(index+1)} href={item.href} key={item.id}><div className="editorial-collection__photo" style={{backgroundImage:"url(\\""+item.image+"\\")"}}/><div className="editorial-collection__shade"/><div className="editorial-collection__copy"><span>{item.note}</span><h3>{item.name}</h3><b>DISCOVER</b></div></a>)}</div>
            </section>
          );
        }
        if (section.sectionType === "blog-grid") {
          return (
            <section className="storefront-dynamic-grid" key={section.id}>
              <div className="editorial-section-heading"><div><p className="editorial-eyebrow editorial-eyebrow--dark">{section.eyebrow || "JOURNAL"}</p><h2>{section.title || "Notes for living well"}</h2></div>{section.ctaHref && <a className="editorial-text-link" href={section.ctaHref}>{section.ctaLabel || "Read all"}</a>}</div>
              <div className="storefront-article-grid">{recentArticles.map(article=><a className="storefront-article-card" href={"/journal/"+article.slug} key={article.id}>{article.coverImageUrl&&<img src={article.coverImageUrl} alt={article.coverImageAlt||article.title} loading="lazy"/>}<h3>{article.title}</h3>{article.excerpt&&<p>{article.excerpt}</p>}</a>)}</div>
            </section>
          );
        }
        if (section.sectionType === "testimonial") {
          const quotes = Array.isArray(section.slides) ? section.slides as Array<{title?:string;body?:string;eyebrow?:string}> : [];
          return <section className="storefront-testimonials" key={section.id}><p className="editorial-eyebrow editorial-eyebrow--dark">{section.eyebrow||"KIND WORDS"}</p><h2>{section.title||"A little love for the everyday"}</h2><div>{quotes.map((quote,index)=><blockquote key={index}><p>“{quote.body||quote.title||""}”</p><cite>{quote.eyebrow||"YOI KIJI customer"}</cite></blockquote>)}</div></section>;
        }
        if (section.sectionType === "slideshow") {
          const slides = Array.isArray(section.slides) ? section.slides as Array<{imageUrl:string;imageAlt?:string;eyebrow?:string;title?:string;body?:string;ctaLabel?:string;ctaHref?:string}> : [];
          if (!slides.length) return null;
          return (
            <section className="storefront-slideshow" aria-label={section.title || "Featured stories"} key={section.id}>
              {slides.map((slide,index)=><article className="storefront-slideshow__slide" key={index}>
                {slide.imageUrl && <div className="storefront-slideshow__image" role="img" aria-label={slide.imageAlt || slide.title || "YOI KIJI collection"} style={{ backgroundImage: `url("${slide.imageUrl}")` }} /> }
                <div className="storefront-slideshow__shade"/>
                <div className="storefront-slideshow__content">
                  {slide.eyebrow && <p className="editorial-eyebrow"><span/>{slide.eyebrow}</p>}
                  {slide.title && <h2>{slide.title}</h2>}
                  {slide.body && <p>{slide.body}</p>}
                  {slide.ctaLabel && slide.ctaHref && <a className="editorial-cta" href={slide.ctaHref}>{slide.ctaLabel}</a>}
                </div>
              </article>)}
            </section>
          );
        }
        if (key === "hero") {
          const eyebrow = getValue(section, "eyebrow", "A QUIETER KIND OF LUXURY");
          const title = getValue(section, "title", "");
          const body = getValue(section, "body", "Thoughtful textiles. Natural textures. A softer way to come home.");
          const imageUrl = section?.imageUrl ?? "";
          const imageAlt = getValue(section, "imageAlt", "YOI KIJI home textiles");
          const ctaLabel = getValue(section, "ctaLabel", "Explore the collection");
          const ctaHref = getValue(section, "ctaHref", "/shop");
          return (
            <section className="editorial-hero" aria-label={imageAlt || title} key={key}>
              {imageUrl && <div className="editorial-hero__image" style={{ backgroundImage: "url(\"" + imageUrl + "\")" }} />}
              <div className="editorial-hero__shade" />
              <div className="editorial-hero__topline"><span>YOI KIJI — THE ART OF TEXTILE LIVING</span></div>
              <div className="editorial-hero__content">
                <p className="editorial-eyebrow"><span />{eyebrow}</p>
                <h1>{title}</h1>
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
                <h2>{title}</h2>
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
                <div><p className="editorial-eyebrow editorial-eyebrow--dark">{eyebrow}</p><h2>{title}</h2></div>
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
          const imageUrl = section?.imageUrl ?? "";
          const imageAlt = getValue(section, "imageAlt", "Softly layered natural bed linen in a sunlit bedroom");
          const ctaLabel = getValue(section, "ctaLabel", "Shop bedsheets");
          const ctaHref = getValue(section, "ctaHref", "/shop?category=bedsheets");
          return (
            <section className="editorial-feature" key={key}>
              {imageUrl && <div className="editorial-feature__image" role="img" aria-label={imageAlt} style={{ backgroundImage: "url(\"" + imageUrl + "\")" }} />}
              <div className="editorial-feature__copy">
                <p className="editorial-eyebrow"><span />{eyebrow}</p>
                <h2>{title}</h2>
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
              <p>{title}</p>
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
              <div><p className="editorial-eyebrow"><span />{eyebrow}</p><h2>{title}</h2></div>
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
