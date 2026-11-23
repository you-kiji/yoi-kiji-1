import { getLocaleData } from "@/lib/i18n";
import { AdvancedSearch } from "@/components/advanced-search";
import { getActiveCategories } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";
import { LazyBackground } from "@/components/lazy-background";

export const dynamic = "force-dynamic";

const defaultSectionOrder = ["hero", "intro", "collections", "feature", "manifesto", "journal"] as const;

function paragraphs(value: string) {
  return value.split(/\n+/).map((part) => part.trim()).filter(Boolean);
}

export default async function HomePage() {
  const locale = await getLocaleData();
  const localeCode = locale.code;
  const [allSections, collectionRecords, categoryRecords, featuredProducts, recentArticles, approvedReviews, approvedReviewCount] = await Promise.all([
    prisma.homepageSection.findMany({ orderBy: [{ position: "asc" }, { key: "asc" }] }).catch(() => []),
    prisma.storeCollection.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }).catch(() => []),
    getActiveCategories(),
    prisma.product.findMany({where:{isActive:true},select:{id:true,name:true,slug:true,pricePaise:true,images:{where:{isPrimary:true},take:1,select:{url:true,alt:true}}},orderBy:{updatedAt:"desc"},take:8}).catch(()=>[]),
    prisma.blogPost.findMany({where:{status:"PUBLISHED",noIndex:false},select:{id:true,title:true,slug:true,excerpt:true,coverImageUrl:true,coverImageAlt:true,publishedAt:true},orderBy:{publishedAt:"desc"},take:3}).catch(()=>[]),
    prisma.review.findMany({where:{status:"APPROVED"},select:{id:true,rating:true,title:true,body:true,verifiedPurchase:true,user:{select:{name:true}}},orderBy:{createdAt:"desc"},take:6}).catch(()=>[]),
    prisma.review.count({ where: { status: "APPROVED" } }).catch(() => 0),
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
        const settings = section.settings && typeof section.settings === "object" && !Array.isArray(section.settings)
          ? section.settings as Record<string, unknown>
          : {};
        const slides = Array.isArray(section.slides) ? section.slides as Array<{imageUrl?:string;imageAlt?:string;title?:string;body?:string;eyebrow?:string;ctaHref?:string}> : [];

        if (section.sectionType === "media-only" || section.sectionType === "hero-video" || key === "hero") {
          const mediaType = settings.mediaType === "video" || (section.sectionType === "hero-video" && typeof settings.videoUrl === "string" && settings.videoUrl)
            ? "video"
            : "image";
          const mediaUrl = mediaType === "video" && typeof settings.videoUrl === "string" && settings.videoUrl
            ? settings.videoUrl
            : section.imageUrl || "";
          if (!mediaUrl) return null;
          return (
            <section className="storefront-media-only" key={section.id} aria-label="Homepage media">
              {mediaType === "video"
                ? <video autoPlay muted loop playsInline preload="metadata"><source src={mediaUrl} /></video>
                : <img src={mediaUrl} alt="" loading="eager" fetchPriority="high" decoding="async" />}
            </section>
          );
        }

        if (section.sectionType === "photo-collage") {
          return <section className="storefront-gallery-section" aria-label={section.title || "YOI KIJI Gallery"} key={section.id}>
            <div className="storefront-gallery-heading"><h2>{section.title || "Gallery"}</h2></div>
            <div className="storefront-photo-collage">
              {slides.filter((slide)=>Boolean(slide.imageUrl)).slice(0,8).map((slide,index)=><a href={slide.ctaHref || "/shop"} key={slide.imageUrl} aria-label={slide.imageAlt || slide.title || `YOI KIJI image ${index+1}`}>
                <img src={slide.imageUrl} alt={slide.imageAlt || slide.title || "YOI KIJI home textiles"} loading="lazy" decoding="async" />
              </a>)}
            </div>
          </section>;
        }

        if (section.sectionType === "text-strip") {
          return <section className="storefront-text-strip" key={section.id}><h2>{section.title || section.body || "Feel the warmth of Home"}</h2></section>;
        }

        if (section.sectionType === "trust-bar") {
          const defaults=[{title:"1 Lakh+",body:"Happy Customers"},{title:"Easy Exchange and Return",body:""},{title:"Secure Payment",body:""},{title:"100% Cotton",body:""}];
          const items=slides.length?defaults.map((fallback,index)=>({title:slides[index]?.title||fallback.title,body:slides[index]?.body||fallback.body})):defaults;
          const icons=[
            <><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/><path d="M9 12h6M12 9v6"/></>,
            <><path d="M3 7h13v11H3zM16 11h3l2 3v4h-5"/><circle cx="7.5" cy="18" r="1.8"/><circle cx="18.5" cy="18" r="1.8"/><path d="m7 11 2 2 4-4"/></>,
            <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/></>,
            <><path d="M12 3 19 6v5c0 4.5-3 7.8-7 10-4-2.2-7-5.5-7-10V6z"/><path d="m8.5 12 2.2 2.2 4.8-4.8"/></>
          ];
          return <section className="storefront-trust-bar" aria-label="YOI KIJI promises" key={section.id}>{items.map((item,index)=><div key={index}><svg className="storefront-trust-icon" viewBox="0 0 24 24" aria-hidden="true">{icons[index]}</svg><strong>{item.title}</strong>{item.body&&<span>{item.body}</span>}</div>)}</section>;
        }

        if (section.sectionType === "product-grid") {
          const productLimit = 2; // Homepage product-pair sections always render exactly two cards.
          const productOffset = typeof settings.offset === "number" ? Math.max(0, settings.offset) : 0;
          const visibleProducts = featuredProducts.slice(productOffset, productOffset + productLimit);
          return (
            <section className="storefront-dynamic-grid storefront-product-pair" key={section.id}>
              <div className="editorial-section-heading">
                <div>
                  {section.eyebrow ? <p className="editorial-eyebrow editorial-eyebrow--dark">{section.eyebrow}</p> : null}
                  <h2>{section.title || "Considered essentials"}</h2>
                </div>
                {section.ctaHref ? <a className="editorial-text-link" href={section.ctaHref}>{section.ctaLabel || "Discover"}</a> : null}
              </div>
              <div className="storefront-product-grid">
                {visibleProducts.map((product) => (
                  <a className="storefront-product-card" href={`/products/${product.slug}`} key={product.id}>
                    {product.images[0]?.url ? (
                      <img src={product.images[0].url} alt={product.images[0].alt || product.name} loading="lazy" />
                    ) : (
                      <span className="storefront-product-card__placeholder" />
                    )}
                    <span className="storefront-product-card__name">{product.name}</span>
                    <span className="storefront-product-card__price">
                      {new Intl.NumberFormat(localeCode === "ja" ? "ja-JP" : "en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(product.pricePaise / 100)}
                    </span>
                  </a>
                ))}
              </div>
            </section>
          );
        }
        if (section.sectionType === "featured-collections") {
          return (
            <section className="editorial-collections" key={section.id}>
              <div className="editorial-section-heading"><div><p className="editorial-eyebrow editorial-eyebrow--dark">{section.eyebrow || "EXPLORE"}</p><h2>{section.title || "Shop by collection"}</h2></div>{section.ctaHref && <a className="editorial-text-link" href={section.ctaHref}>{section.ctaLabel || "View all"}</a>}</div>
              <div className="editorial-collection-grid">{categories.map((item,index)=><a className={"editorial-collection editorial-collection--"+(index+1)} href={item.href} key={item.id}><LazyBackground className="editorial-collection__photo" backgroundImage={`url("${item.image}")`} /><div className="editorial-collection__shade"/><div className="editorial-collection__copy"><span>{item.note}</span><h3>{item.name}</h3><b>DISCOVER</b></div></a>)}</div>
            </section>
          );
        }
        if (section.sectionType === "blog-grid") {
          return (
            <section className="storefront-dynamic-grid storefront-journal-section" key={section.id}>
              <div className="editorial-section-heading">
                <div><h2>{section.title || "IDEAS of YOI KIJI"}</h2></div>
                <a className="editorial-text-link" href={section.ctaHref || "/journal"}>{section.ctaLabel || "View All"}</a>
              </div>
              <div className="storefront-article-grid">
                {recentArticles.slice(0,3).map((article,index)=><a className="storefront-article-card" href={"/journal/"+article.slug} key={article.id}>
                  <div className="storefront-article-card__image">{article.coverImageUrl&&<img src={article.coverImageUrl} alt={article.coverImageAlt||article.title} loading="lazy"/>}<span>0{index+1}</span></div>
                  <div className="storefront-article-card__copy"><h3>{article.title}</h3>{article.excerpt&&<p>{article.excerpt}</p>}<span className="storefront-article-card__read">READ STORY</span></div>
                </a>)}
              </div>
            </section>
          );
        }
        if (section.sectionType === "testimonial") {
          const quotes = approvedReviews.map(review=>({body:review.body,title:review.title||"",name:review.user.name || "YOI KIJI customer",rating:review.rating}));
          const reviewPhotos = slides.slice(0,6);
          return (
            <section className="storefront-living-reviews" key={section.id} aria-label={section.title || "Customer reviews"}>
              <header className="storefront-living-reviews__heading">
                <h2>{section.title || "LIVING WITH YOIKIJI"}</h2>
              </header>
              {quotes.length ? (
                <div className="storefront-living-reviews__grid">
                  {quotes.slice(0,6).map((quote,index)=>(
                    <article className="storefront-living-review" key={index}>
                      <div className="storefront-living-review__photo">
                        {reviewPhotos[index]?.imageUrl ? <img src={reviewPhotos[index].imageUrl} alt={reviewPhotos[index].imageAlt || "YOI KIJI customer home"} loading="lazy"/> : <div aria-hidden="true"/>}
                        <span aria-label={quote.rating + " out of 5 stars"}>{"★".repeat(quote.rating)}</span>
                      </div>
                      <div className="storefront-living-review__copy">
                        <p>“{quote.body || quote.title}”</p>
                        <footer><strong>{quote.name}</strong><small>{quote.title || "Customer story"} · Sample review</small></footer>
                      </div>
                    </article>
                  ))}
                </div>
              ) : <p className="storefront-living-reviews__empty">Customer stories will appear here as reviews are approved.</p>}
              {approvedReviewCount > 0 ? <div className="storefront-living-reviews__actions"><a href="/reviews" className="storefront-living-reviews__view-all">VIEW ALL REVIEWS</a></div> : null}
            </section>
          );
        }
        if (section.sectionType === "slideshow") {
          const slides = Array.isArray(section.slides) ? section.slides as Array<{imageUrl:string;imageAlt?:string;eyebrow?:string;title?:string;body?:string;ctaLabel?:string;ctaHref?:string}> : [];
          if (!slides.length) return null;
          return (
            <section className="storefront-slideshow" aria-label={section.title || "Featured stories"} key={section.id}>
              {slides.map((slide,index)=><article className="storefront-slideshow__slide" key={index}>
                {slide.imageUrl && <LazyBackground className="storefront-slideshow__image" role="img" ariaLabel={slide.imageAlt || slide.title || "YOI KIJI collection"} backgroundImage={`url("${slide.imageUrl}")`} /> }
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
        if (section.sectionType === "spacer") {
          return <div className="storefront-spacer" aria-hidden="true" key={section.id} />;
        }

        if (section.sectionType === "image-banner") {
          const eyebrow = getValue(section, "eyebrow", "");
          const title = getValue(section, "title", "");
          const body = getValue(section, "body", "");
          const imageUrl = section.imageUrl ?? "";
          const imageAlt = getValue(section, "imageAlt", title || "YOI KIJI editorial banner");
          const ctaLabel = getValue(section, "ctaLabel", "");
          const ctaHref = getValue(section, "ctaHref", "");
          return (
            <section className="storefront-image-banner" aria-label={imageAlt} key={section.id}>
              {imageUrl && <LazyBackground className="storefront-image-banner__background" backgroundImage={`linear-gradient(90deg, rgba(8, 25, 13, .68), rgba(8, 25, 13, .12)), url("${imageUrl}")`} /> }
              <div className="storefront-image-banner__content">
                {eyebrow && <p className="editorial-eyebrow"><span />{eyebrow}</p>}
                {title && <h2>{title}</h2>}
                {body && <p>{body}</p>}
                {ctaLabel && ctaHref && <a className="editorial-cta" href={ctaHref}>{ctaLabel}</a>}
              </div>
            </section>
          );
        }

        if (section.sectionType === "image-with-text") {
          const eyebrow = getValue(section, "eyebrow", "");
          const title = getValue(section, "title", "");
          const body = getValue(section, "body", "");
          const imageUrl = section.imageUrl ?? "";
          const imageAlt = getValue(section, "imageAlt", title || "YOI KIJI textile story");
          const ctaLabel = getValue(section, "ctaLabel", "");
          const ctaHref = getValue(section, "ctaHref", "");
          return (
            <section className="editorial-custom-section storefront-image-with-text" key={section.id}>
              {imageUrl && <LazyBackground className="editorial-custom-section__image" role="img" ariaLabel={imageAlt} backgroundImage={`url("${imageUrl}")`} />}
              <div>
                {eyebrow && <p className="editorial-eyebrow editorial-eyebrow--dark">{eyebrow}</p>}
                {title && <h2>{title}</h2>}
                {paragraphs(body).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
                {ctaLabel && ctaHref && <a className="editorial-text-link" href={ctaHref}>{ctaLabel}</a>}
              </div>
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
                    <LazyBackground className="editorial-collection__photo" backgroundImage={`url("${item.image}")`} />
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
              <LazyBackground className="editorial-feature__image" role="img" ariaLabel={imageAlt} backgroundImage={imageUrl ? `url("${imageUrl}")` : 'url("https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=1800&q=92")'} />
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
            {imageUrl && <LazyBackground className="editorial-custom-section__image" role="img" ariaLabel={imageAlt} backgroundImage={`url("${imageUrl}")`} />}
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
