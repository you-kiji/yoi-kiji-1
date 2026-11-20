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
  const canonical = post.canonicalUrl || "/journal/" + post.slug;
  return {
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt || undefined,
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
  const translationTargets = [
    { entityType: "blogPost", entityId: post.id },
    ...post.categories.map(item => ({ entityType: "blogCategory", entityId: item.category.id })),
    ...post.tags.map(item => ({ entityType: "blogTag", entityId: item.tag.id })),
    ...post.relatedProducts.map(item => ({ entityType: "product", entityId: item.product.id })),
  ];
  const translations = locale.code === "en" || !translationTargets.length ? [] : await prisma.contentTranslation.findMany({
    where: { localeCode: locale.code, OR: translationTargets.map(target => ({ entityType: target.entityType, entityId: target.entityId })) },
    select: { entityType: true, entityId: true, fieldKey: true, value: true },
  }).catch(() => []);
  const localized = new Map(translations.map(item => [`${item.entityType}:${item.entityId}:${item.fieldKey}`, item.value]));
  const displayPost = {
    ...post,
    title: localized.get(`blogPost:${post.id}:title`) ?? post.title,
    excerpt: localized.get(`blogPost:${post.id}:excerpt`) ?? post.excerpt,
    contentMarkdown: localized.get(`blogPost:${post.id}:contentMarkdown`) ?? post.contentMarkdown,
    categories: post.categories.map(item => ({ ...item, category: { ...item.category, name: localized.get(`blogCategory:${item.category.id}:name`) ?? item.category.name } })),
    tags: post.tags.map(item => ({ ...item, tag: { ...item.tag, name: localized.get(`blogTag:${item.tag.id}:name`) ?? item.tag.name } })),
    relatedProducts: post.relatedProducts.map(item => ({ ...item, product: { ...item.product, name: localized.get(`product:${item.product.id}:name`) ?? item.product.name } })),
  };

  return <main className="journal-article-page">
    <div className="commerce-breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/journal">Journal</Link><span>/</span>{displayPost.title}</div>
    <article>
      <header className="journal-article-header">
        <div className="journal-article-categories">{displayPost.categories.map(item => <Link href={"/journal?category=" + encodeURIComponent(item.category.slug)} key={item.category.slug}>{item.category.name}</Link>)}</div>
        <h1>{displayPost.title}</h1>
        {displayPost.excerpt && <p className="journal-article-excerpt">{displayPost.excerpt}</p>}
        <div className="journal-article-byline"><span>Words by {post.author?.name ?? "YOI KIJI Editorial"}</span><time dateTime={post.publishedAt?.toISOString()}>{post.publishedAt?.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</time></div>
      </header>
      {post.coverImageUrl && <figure className="journal-article-cover"><img src={post.coverImageUrl} alt={post.coverImageAlt ?? ""}/></figure>}
      <BlogMarkdown content={displayPost.contentMarkdown}/>
      {displayPost.tags.length > 0 && <nav className="journal-article-tags" aria-label="Article tags">{displayPost.tags.map(item => <Link href={"/journal?tag=" + encodeURIComponent(item.tag.slug)} key={item.tag.slug}># {item.tag.name}</Link>)}</nav>}
      {displayPost.relatedProducts.length > 0 && <section className="journal-related-products"><p className="eyebrow">DISCOVER THE DETAILS</p><h2>Pieces in this story</h2><div>{displayPost.relatedProducts.map(({ product }) => <Link href={"/products/" + product.slug} key={product.slug}>
        {product.images[0] ? <img src={product.images[0].url} alt={product.images[0].alt}/> : <span className="journal-related-placeholder">YOI KIJI</span>}
        <strong>{product.name}</strong><small>₹{(product.pricePaise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</small>
      </Link>)}</div></section>}
    </article>
    <div className="journal-article-back"><Link href="/journal">← Back to the journal</Link></div>
  </main>;
}
