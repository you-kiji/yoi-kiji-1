import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminBlogPostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");
  if (admin.role !== "ADMIN") redirect("/admin");
  const { id } = await params;
  const post = await prisma.blogPost.findUnique({
    where: { id },
    include: {
      author: { select: { name: true, email: true } },
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
      relatedProducts: { include: { product: { select: { id: true, name: true, slug: true, sku: true } } }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!post) notFound();

  return (
    <main className="commerce-page admin-blog-detail">
      <div className="commerce-breadcrumb"><Link href="/admin">Admin</Link><span>/</span><Link href="/admin/blog">Blog studio</Link><span>/</span>{post.title}</div>
      <header className="admin-detail-header">
        <div><p className="eyebrow">CONTENT / ARTICLE RECORD</p><h1>{post.title}</h1><p>/{post.slug} · Updated {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(post.updatedAt)}</p></div>
        <div className="admin-detail-header-actions"><span className="order-status">{post.status.toLowerCase()}</span><Link className="admin-secondary-link" href="/admin/blog">Back to blog studio</Link></div>
      </header>
      <section className="admin-detail-metrics admin-blog-detail-metrics">
        <article><span>Publication status</span><strong>{post.status}</strong><small>{post.publishedAt ? "Published " + new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(post.publishedAt) : post.scheduledAt ? "Scheduled " + new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(post.scheduledAt) : "Not published"}</small></article>
        <article><span>Categories</span><strong>{post.categories.length}</strong><small>Editorial classifications</small></article>
        <article><span>Tags</span><strong>{post.tags.length}</strong><small>Search and discovery labels</small></article>
        <article><span>Related products</span><strong>{post.relatedProducts.length}</strong><small>Merchandising connections</small></article>
      </section>
      <div className="admin-blog-detail-grid">
        <section className="admin-detail-card">
          <div className="admin-detail-card-heading"><div><p className="eyebrow">ARTICLE BODY</p><h2>Content preview</h2></div><span>Markdown source</span></div>
          {post.excerpt && <p className="admin-detail-description">{post.excerpt}</p>}
          {post.coverImageUrl && <figure className="admin-blog-cover"><img src={post.coverImageUrl} alt={post.coverImageAlt ?? post.title}/>{post.coverImageAlt && <figcaption>{post.coverImageAlt}</figcaption>}</figure>}
          <pre className="admin-blog-markdown-preview">{post.contentMarkdown}</pre>
        </section>
        <aside className="admin-product-detail-aside">
          <section className="admin-detail-card">
            <div className="admin-detail-card-heading"><div><p className="eyebrow">PUBLISHING</p><h2>Article settings</h2></div></div>
            <dl className="admin-detail-definition admin-detail-definition--stacked">
              <div><dt>Author</dt><dd>{post.author?.name ?? post.author?.email ?? "Unassigned"}</dd></div>
              <div><dt>Created</dt><dd>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(post.createdAt)}</dd></div>
              <div><dt>Last updated</dt><dd>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(post.updatedAt)}</dd></div>
              <div><dt>Publication date</dt><dd>{post.publishedAt ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(post.publishedAt) : "Not published"}</dd></div>
              <div><dt>Scheduled date</dt><dd>{post.scheduledAt ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(post.scheduledAt) : "Not scheduled"}</dd></div>
              <div><dt>Search indexing</dt><dd>{post.noIndex ? "No index" : "Indexable"}</dd></div>
              <div><dt>Canonical URL</dt><dd>{post.canonicalUrl ?? "Default article URL"}</dd></div>
            </dl>
            <Link className="admin-product-open-link" href={"/admin/blog?edit=" + post.id}>Open editor in blog studio</Link>
          </section>
          <section className="admin-detail-card">
            <div className="admin-detail-card-heading"><div><p className="eyebrow">TAXONOMY</p><h2>Categories & tags</h2></div></div>
            <p className="admin-detail-chip-list">{post.categories.map(item => <span key={item.categoryId}>{item.category.name}</span>)}{post.categories.length === 0 && "No categories assigned"}</p>
            <p className="admin-detail-chip-list">{post.tags.map(item => <span key={item.tagId}>{item.tag.name}</span>)}{post.tags.length === 0 && "No tags assigned"}</p>
          </section>
          <section className="admin-detail-card">
            <div className="admin-detail-card-heading"><div><p className="eyebrow">MERCHANDISING</p><h2>Related products</h2></div></div>
            {post.relatedProducts.length ? post.relatedProducts.map(item => <p className="admin-related-product" key={item.productId}><Link href={"/admin/products/" + item.product.id}>{item.product.name}</Link><small>{item.product.sku}</small></p>) : <p className="admin-detail-empty">No related products connected.</p>}
          </section>
          <section className="admin-detail-card">
            <div className="admin-detail-card-heading"><div><p className="eyebrow">SEARCH PREVIEW</p><h2>SEO metadata</h2></div></div>
            <dl className="admin-detail-definition admin-detail-definition--stacked">
              <div><dt>SEO title</dt><dd>{post.seoTitle || post.title}</dd></div>
              <div><dt>SEO description</dt><dd>{post.seoDescription || post.excerpt || "Not configured"}</dd></div>
            </dl>
          </section>
        </aside>
      </div>
    </main>
  );
}
