import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getLocaleData } from "@/lib/i18n";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocaleData();
  return { title: locale.labels["seo.journalTitle"] ?? "Journal", description: locale.labels["seo.journalDescription"] ?? "Care guides, textile stories and considered ideas for making everyday spaces feel like home.", alternates: { canonical: "/journal" } };
}

type SearchParams = Promise<{ category?: string; tag?: string; page?: string }>;

const PAGE_SIZE = 9;

export default async function JournalPage({ searchParams }: { searchParams: SearchParams }) {
  const filters = await searchParams;
  const category = filters.category?.trim();
  const tag = filters.tag?.trim();
  const requestedPage = Number.parseInt(filters.page ?? "1", 10);
  const currentPage = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
  const now = new Date();
  const where = {
    status: "PUBLISHED" as const,
    publishedAt: { lte: now },
    noIndex: false,
    ...(category ? { categories: { some: { category: { slug: category } } } } : {}),
    ...(tag ? { tags: { some: { tag: { slug: tag } } } } : {}),
  };
  const [totalPosts, categories, tags] = await Promise.all([
    prisma.blogPost.count({ where }).catch(() => 0),
    prisma.blogCategory.findMany({ where: { posts: { some: { post: { status: "PUBLISHED", publishedAt: { lte: now }, noIndex: false } } } }, orderBy: { name: "asc" } }).catch(() => []),
    prisma.blogTag.findMany({ where: { posts: { some: { post: { status: "PUBLISHED", publishedAt: { lte: now }, noIndex: false } } } }, orderBy: { name: "asc" } }).catch(() => []),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalPosts / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const posts = await prisma.blogPost.findMany({
    where,
    select: {
      id: true, title: true, slug: true, excerpt: true, coverImageUrl: true,
      coverImageAlt: true, publishedAt: true,
      author: { select: { name: true } },
      categories: { include: { category: { select: { id: true, name: true, slug: true } } } },
    },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  }).catch(() => []);
  const locale = await getLocaleData();
  const t = (key: string, fallback: string) => locale.labels[key] ?? fallback;
  const translationTargets = [
    ...posts.map(post => ({ entityType: "blogPost", entityId: post.id })),
    ...categories.map(item => ({ entityType: "blogCategory", entityId: item.id })),
    ...tags.map(item => ({ entityType: "blogTag", entityId: item.id })),
  ];
  const translations = locale.code === "en" || !translationTargets.length ? [] : await prisma.contentTranslation.findMany({
    where: { localeCode: locale.code, OR: translationTargets.map(target => ({ entityType: target.entityType, entityId: target.entityId })) },
    select: { entityType: true, entityId: true, fieldKey: true, value: true },
  }).catch(() => []);
  const localized = new Map(translations.map(entry => [`${entry.entityType}:${entry.entityId}:${entry.fieldKey}`, entry.value]));
  const localizedPosts = posts.map(post => ({
    ...post,
    title: localized.get(`blogPost:${post.id}:title`) ?? post.title,
    excerpt: localized.get(`blogPost:${post.id}:excerpt`) ?? post.excerpt,
    categories: post.categories.map(link => ({ ...link, category: { ...link.category, name: localized.get(`blogCategory:${link.category.id}:name`) ?? link.category.name } })),
  }));
  const localizedCategories = categories.map(item => ({ ...item, name: localized.get(`blogCategory:${item.id}:name`) ?? item.name }));
  const localizedTags = tags.map(item => ({ ...item, name: localized.get(`blogTag:${item.id}:name`) ?? item.name }));
  const selectedLabel = category ? localizedCategories.find(item => item.slug === category)?.name : tag ? localizedTags.find(item => item.slug === tag)?.name : null;
  const paginationHref = (targetPage: number) => {
    const query = new URLSearchParams();
    if (category) query.set("category", category);
    if (tag) query.set("tag", tag);
    if (targetPage > 1) query.set("page", String(targetPage));
    const value = query.toString();
    return value ? "/journal?" + value : "/journal";
  };

  return (
    <main className="page">
      <div className="page-content">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span className="separator">/</span>
          <span className="current">{t("common.journal","Journal")}</span>
        </nav>

        <header className="page-header">
          <p className="section-eyebrow">{t("journal.eyebrow","NOTES ON MAKING A HOME")}</p>
          <h1>{t("journal.title","Live well.")}<br/><em>{t("journal.titleAccent","Feel at home.")}</em></h1>
          <p>{t("journal.description","Care guides, textile stories and ideas for making everyday spaces feel more considered.")}</p>
        </header>

        <nav className="journal-filters flex flex-wrap gap-sm mt-xl mb-xl" aria-label={t("journal.filterAria","Filter journal articles")} style={{ justifyContent: 'center' }}>
          <Link href="/journal" className={`btn ${!category && !tag ? "btn-primary" : "btn-secondary"}`}>{t("journal.allStories","All stories")}</Link>
          {localizedCategories.map((item: typeof localizedCategories[0]) => <Link key={item.id} href={"/journal?category=" + encodeURIComponent(item.slug)} className={`btn ${category === item.slug ? "btn-primary" : "btn-secondary"}`}>{item.name}</Link>)}
          {localizedTags.map((item: typeof localizedTags[0]) => <Link key={"tag-" + item.id} href={"/journal?tag=" + encodeURIComponent(item.slug)} className={`btn ${tag === item.slug ? "btn-primary" : "btn-secondary"}`}># {item.name}</Link>)}
        </nav>

        <div className="section-header" style={{ marginBottom: 'var(--space-xl)' }}>
          <h2>{selectedLabel ? t("journal.stories","Stories: ") + selectedLabel : t("journal.heading","The journal")}</h2>
          <p style={{ color: 'var(--color-moss)', fontSize: '1rem' }}>{totalPosts} {totalPosts === 1 ? "story" : "stories"}</p>
        </div>

        {posts.length ? (
          <section className="grid-3" aria-label="Journal articles" style={{ marginTop: 'var(--space-xl)' }}>
            {localizedPosts.map((post: typeof localizedPosts[0], index: number) => (
              <article key={post.id} className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Link href={"/journal/" + post.slug} aria-label={"Read " + post.title} className="block">
                  {post.coverImageUrl ? (
                    <img src={post.coverImageUrl} alt={post.coverImageAlt ?? ""} loading={index > 2 ? "lazy" : "eager"} style={{ width: '100%', height: '240px', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '240px', background: 'var(--color-cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-sage)', fontWeight: 500 }}>YOI KIJI · JOURNAL</div>
                  )}
                </Link>
                <div className="p-lg" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div className="flex flex-wrap gap-sm mb-sm" style={{ fontSize: '0.75rem' }}>
                    {post.categories.map((link: typeof post.categories[0]) => (
                      <Link key={link.category.slug} href={"/journal?category=" + encodeURIComponent(link.category.slug)} className="badge badge-info">{link.category.name}</Link>
                    ))}
                  </div>
                  <h3 style={{ marginBottom: 'var(--space-sm)', lineHeight: 1.3 }}>
                    <Link href={"/journal/" + post.slug} style={{ color: 'var(--color-deep-green)' }}>{post.title}</Link>
                  </h3>
                  {post.excerpt && <p style={{ color: 'var(--color-forest)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: 'var(--space-md)', flex: 1 }}>{post.excerpt}</p>}
                  <div className="flex items-center justify-between text-sm" style={{ color: 'var(--color-sage)', marginTop: 'auto', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--color-line)' }}>
                    <span>{post.author?.name ?? "YOI KIJI Editorial"}</span>
                    <time dateTime={post.publishedAt?.toISOString()}>{post.publishedAt?.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</time>
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="empty-state" style={{ marginTop: 'var(--space-2xl)' }}>
            <div className="empty-state-icon">✳</div>
            <h2>{t("journal.noStories","No stories here just yet.")}</h2>
            <p>{t("journal.noStoriesHint","Try another category or return to all journal stories.")}</p>
            <Link href="/journal" className="btn btn-primary mt-lg">{t("journal.allStories","View all stories")}</Link>
          </section>
        )}

        {totalPages > 1 && (
          <nav className="pagination" aria-label="Journal pagination" style={{ marginTop: 'var(--space-3xl)' }}>
            {page > 1 ? <Link href={paginationHref(page - 1)} rel="prev" className="btn btn-secondary">Previous</Link> : <span className="btn btn-secondary disabled">Previous</span>}
            <div className="flex gap-sm">
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((number: number) => (
                <Link key={number} href={paginationHref(number)} aria-current={number === page ? "page" : undefined} className={`btn ${number === page ? "btn-primary" : "btn-secondary"}`}>{number}</Link>
              ))}
            </div>
            {page < totalPages ? <Link href={paginationHref(page + 1)} rel="next" className="btn btn-secondary">Next</Link> : <span className="btn btn-secondary disabled">Next</span>}
          </nav>
        )}
      </div>
    </main>
  );
}