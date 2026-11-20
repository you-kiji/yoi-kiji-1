import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getLocaleData } from "@/lib/i18n";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Journal",
  description: "Care guides, textile stories and considered ideas for making everyday spaces feel like home.",
  alternates: { canonical: "/journal" },
};

type SearchParams = Promise<{ category?: string; tag?: string }>;

export default async function JournalPage({ searchParams }: { searchParams: SearchParams }) {
  const filters = await searchParams;
  const category = filters.category?.trim();
  const tag = filters.tag?.trim();
  const now = new Date();
  const where = {
    status: "PUBLISHED" as const,
    publishedAt: { lte: now },
    noIndex: false,
    ...(category ? { categories: { some: { category: { slug: category } } } } : {}),
    ...(tag ? { tags: { some: { tag: { slug: tag } } } } : {}),
  };
  const [posts, categories, tags] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      select: {
        id: true, title: true, slug: true, excerpt: true, coverImageUrl: true,
        coverImageAlt: true, publishedAt: true,
        author: { select: { name: true } },
        categories: { include: { category: { select: { name: true, slug: true } } } },
      },
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      take: 48,
    }).catch(() => []),
    prisma.blogCategory.findMany({ where: { posts: { some: { post: { status: "PUBLISHED", publishedAt: { lte: now }, noIndex: false } } } }, orderBy: { name: "asc" } }).catch(() => []),
    prisma.blogTag.findMany({ where: { posts: { some: { post: { status: "PUBLISHED", publishedAt: { lte: now }, noIndex: false } } } }, orderBy: { name: "asc" } }).catch(() => []),
  ]);
  const locale = await getLocaleData();
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
    categories: post.categories.map(link => ({ ...link, category: { ...link.category, name: localized.get(`blogCategory:${link.category.slug}:name`) ?? link.category.name } })),
  }));
  const localizedCategories = categories.map(item => ({ ...item, name: localized.get(`blogCategory:${item.id}:name`) ?? item.name }));
  const localizedTags = tags.map(item => ({ ...item, name: localized.get(`blogTag:${item.id}:name`) ?? item.name }));
  const selectedLabel = category ? localizedCategories.find(item => item.slug === category)?.name : tag ? localizedTags.find(item => item.slug === tag)?.name : null;

  return <main className="journal-page">
    <div className="commerce-breadcrumb"><Link href="/">Home</Link><span>/</span> Journal</div>
    <header className="journal-hero">
      <p className="eyebrow">NOTES ON MAKING A HOME</p>
      <h1>Live well.<br/><em>Feel at home.</em></h1>
      <p>Care guides, textile stories and ideas for making everyday spaces feel more considered.</p>
    </header>
    <nav className="journal-filters" aria-label="Filter journal articles">
      <Link className={!category && !tag ? "is-active" : ""} href="/journal">All stories</Link>
      {localizedCategories.map(item => <Link className={category === item.slug ? "is-active" : ""} href={"/journal?category=" + encodeURIComponent(item.slug)} key={item.id}>{item.name}</Link>)}
      {localizedTags.map(item => <Link className={tag === item.slug ? "is-active" : ""} href={"/journal?tag=" + encodeURIComponent(item.slug)} key={"tag-" + item.id}># {item.name}</Link>)}
    </nav>
    <div className="journal-results-heading">
      <h2>{selectedLabel ? "Stories: " + selectedLabel : "The journal"}</h2>
      <span>{posts.length} {posts.length === 1 ? "story" : "stories"}</span>
    </div>
    {posts.length ? <section className="journal-grid" aria-label="Journal articles">
      {localizedPosts.map((post, index) => <article className={"journal-card" + (index === 0 && !category && !tag ? " journal-card-featured" : "")} key={post.id}>
        <Link className="journal-card-image" href={"/journal/" + post.slug} aria-label={"Read " + post.title}>
          {post.coverImageUrl ? <img src={post.coverImageUrl} alt={post.coverImageAlt ?? ""} loading={index > 2 ? "lazy" : "eager"}/> : <span>YOI KIJI · JOURNAL</span>}
        </Link>
        <div className="journal-card-copy">
          <div className="journal-card-categories">{post.categories.map(link => <Link href={"/journal?category=" + encodeURIComponent(link.category.slug)} key={link.category.slug}>{link.category.name}</Link>)}</div>
          <h3><Link href={"/journal/" + post.slug}>{post.title}</Link></h3>
          {post.excerpt && <p>{post.excerpt}</p>}
          <div className="journal-card-meta"><span>{post.author?.name ?? "YOI KIJI Editorial"}</span><time dateTime={post.publishedAt?.toISOString()}>{post.publishedAt?.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</time></div>
          <Link className="journal-read-link" href={"/journal/" + post.slug}>Read story</Link>
        </div>
      </article>)}
    </section> : <section className="journal-empty"><span>✳</span><h2>No stories here just yet.</h2><p>Try another category or return to all journal stories.</p><Link href="/journal">View all stories</Link></section>}
  </main>;
}
