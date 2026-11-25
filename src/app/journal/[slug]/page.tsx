import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogMarkdown } from "@/components/blog-markdown";
import { prisma } from "@/lib/prisma";
import { getLocaleData } from "@/lib/i18n";

export const revalidate = 300;
type Params = Promise<{ slug: string }>;

async function getPost(slug: string) {
  return prisma.blogPost.findFirst({
    where: { slug, status: "PUBLISHED", publishedAt: { lte: new Date() }, noIndex: false },
    select: {
      id: true, title: true, slug: true, excerpt: true, contentMarkdown: true,
      coverImageUrl: true, coverImageAlt: true, seoTitle: true, seoDescription: true,
      canonicalUrl: true, publishedAt: true, updatedAt: true,
      author: { select: { name: true } },
      categories: { include: { category: { select: { id: true, name: true, slug: true } } } },
      tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
      relatedProducts: {
        include: { product: { select: { id: true, name: true, slug: true, pricePaise: true, images: { where: { isPrimary: true }, take: 1, select: { url: true, alt: true } } } } },
        orderBy: { sortOrder: "asc" },
      },
    },
  }).catch(() => null);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Story not found", robots: { index: false, follow: false } };
  const locale = await getLocaleData();
  const translations = locale.code === "en" ? [] : await prisma.contentTranslation.findMany({ where: { localeCode: locale.code, entityType: "blogPost", entityId: post.id, fieldKey: { in: ["title", "excerpt", "seoTitle", "seoDescription"] } } });
  const text = new Map(translations.map(item => [item.fieldKey, item.value]));
  const canonical = post.canonicalUrl || "/journal/" + post.slug;
  return {
    title: text.get("seoTitle") || text.get("title") || post.seoTitle || post.title,
    description: text.get("seoDescription") || text.get("excerpt") || post.seoDescription || post.excerpt || undefined,
    alternates: { canonical },
    openGraph: {
      type: "article",
      title: post.seoTitle || post.title,
      description: post.seoDescription || post.excerpt || undefined,
      url: canonical,
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      images: post.coverImageUrl ? [{ url: post.coverImageUrl, alt: post.coverImageAlt || post.title }] : [],
    },
  };
}

export default async function JournalArticlePage({ params }: { params: Params }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();
  const locale = await getLocaleData();
  const t = (key: string, fallback: string) => locale.labels[key] ?? fallback;
  const translationTargets = [
    { entityType: "blogPost", entityId: post.id },
    ...post.categories.map((item: typeof post.categories[0]) => ({ entityType: "blogCategory", entityId: item.category.id })),
    ...post.tags.map((item: typeof post.tags[0]) => ({ entityType: "blogTag", entityId: item.tag.id })),
    ...post.relatedProducts.map((item: typeof post.relatedProducts[0]) => ({ entityType: "product", entityId: item.product.id })),
  ];
  const translations = locale.code === "en" || !translationTargets.length ? [] : await prisma.contentTranslation.findMany({
    where: { localeCode: locale.code, OR: translationTargets.map((target: typeof translationTargets[0]) => ({ entityType: target.entityType, entityId: target.entityId })) },
    select: { entityType: true, entityId: true, fieldKey: true, value: true },
  }).catch(() => []);
  const localized = new Map(translations.map((item: typeof translations[0]) => [`${item.entityType}:${item.entityId}:${item.fieldKey}`, item.value]));
  const displayPost = {
    ...post,
    title: localized.get(`blogPost:${post.id}:title`) ?? post.title,
    excerpt: localized.get(`blogPost:${post.id}:excerpt`) ?? post.excerpt,
    contentMarkdown: localized.get(`blogPost:${post.id}:contentMarkdown`) ?? post.contentMarkdown,
    categories: post.categories.map((item: typeof post.categories[0]) => ({ ...item, category: { ...item.category, name: localized.get(`blogCategory:${item.category.id}:name`) ?? item.category.name } })),
    tags: post.tags.map((item: typeof post.tags[0]) => ({ ...item, tag: { ...item.tag, name: localized.get(`blogTag:${item.tag.id}:name`) ?? item.tag.name } })),
    relatedProducts: post.relatedProducts.map((item: typeof post.relatedProducts[0]) => ({ ...item, product: { ...item.product, name: localized.get(`product:${item.product.id}:name`) ?? item.product.name } })),
  };

  return (
    <main className="page">
      <div className="page-content" style={{ maxWidth: '800px' }}>
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span className="separator">/</span>
          <Link href="/journal">{t("common.journal","Journal")}</Link>
          <span className="separator">/</span>
          <span className="current">{displayPost.title}</span>
        </nav>

        <article>
          <header style={{ marginBottom: 'var(--space-2xl)' }}>
            <div className="flex flex-wrap gap-sm mb-md" style={{ fontSize: '0.875rem' }}>
              {displayPost.categories.map((item: typeof displayPost.categories[0]) => (
                <Link key={item.category.slug} href={"/journal?category=" + encodeURIComponent(item.category.slug)} className="badge badge-info">{item.category.name}</Link>
              ))}
            </div>
            <h1 style={{ marginBottom: 'var(--space-md)' }}>{displayPost.title}</h1>
            {displayPost.excerpt && <p style={{ fontSize: '1.125rem', color: 'var(--color-moss)', lineHeight: 1.6, marginBottom: 'var(--space-lg)' }}>{displayPost.excerpt}</p>}
            <div className="flex flex-wrap items-center gap-md text-sm" style={{ color: 'var(--color-sage)' }}>
              <span>{t("journal.wordsBy","Words by")} {post.author?.name ?? "YOI KIJI Editorial"}</span>
              <time dateTime={post.publishedAt?.toISOString()}>{post.publishedAt?.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</time>
            </div>
          </header>

          {post.coverImageUrl && (
            <figure style={{ margin: 'var(--space-2xl) calc(var(--space-lg) * -1) var(--space-2xl)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <img src={post.coverImageUrl} alt={post.coverImageAlt ?? ""} loading="lazy" decoding="async" style={{ width: '100%', height: 'auto' }} />
            </figure>
          )}

          <div style={{ fontSize: '1.0625rem', lineHeight: 1.8, color: 'var(--color-forest)' }}>
            <BlogMarkdown content={displayPost.contentMarkdown} />
          </div>

          {displayPost.tags.length > 0 && (
            <nav aria-label="Article tags" className="flex flex-wrap gap-sm mt-2xl pt-xl" style={{ borderTop: '1px solid var(--color-line)' }}>
              {displayPost.tags.map((item: typeof displayPost.tags[0]) => (
                <Link key={item.tag.slug} href={"/journal?tag=" + encodeURIComponent(item.tag.slug)} className="badge badge-neutral"># {item.tag.name}</Link>
              ))}
            </nav>
          )}

          {displayPost.relatedProducts.length > 0 && (
            <section style={{ marginTop: 'var(--space-4xl)', paddingTop: 'var(--space-2xl)', borderTop: '1px solid var(--color-line)' }}>
              <div className="section-header" style={{ textAlign: 'left', marginBottom: 'var(--space-xl)' }}>
                <p className="section-eyebrow">{t("journal.relatedEyebrow","DISCOVER THE DETAILS")}</p>
                <h2 className="section-title">{t("journal.relatedTitle","Pieces in this story")}</h2>
              </div>
              <div className="grid-4" style={{ gap: 'var(--space-lg)' }}>
                {displayPost.relatedProducts.map(({ product }: typeof displayPost.relatedProducts[0]) => (
                  <Link key={product.slug} href={"/products/" + product.slug} className="product-card">
                    <div className="product-card-image">
                      {product.images[0] ? <img src={product.images[0].url} alt={product.images[0].alt} loading="lazy" decoding="async" /> : <span>YOI KIJI</span>}
                    </div>
                    <div className="product-card-info">
                      <h3 className="product-card-title">{product.name}</h3>
                      <p className="product-card-price">₹{(product.pricePaise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <div className="flex justify-center mt-2xl pt-xl" style={{ borderTop: '1px solid var(--color-line)' }}>
            <Link href="/journal" className="btn btn-secondary">← {t("journal.backToJournal","Back to the journal")}</Link>
          </div>
        </article>
      </div>
    </main>
  );
}