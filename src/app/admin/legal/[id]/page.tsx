import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminLegalPageDetail({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");
  if (admin.role !== "ADMIN") redirect("/admin");
  const { id } = await params;
  const page = await prisma.legalPage.findUnique({
    where: { id },
    include: { revisions: { orderBy: { createdAt: "desc" }, take: 50 } },
  });
  if (!page) notFound();
  return (
    <main className="commerce-page admin-legal-detail">
      <div className="commerce-breadcrumb"><Link href="/admin">Admin</Link><span>/</span><Link href="/admin/legal">Legal pages</Link><span>/</span>{page.title}</div>
      <header className="admin-detail-header"><div><p className="eyebrow">POLICY / CONTENT RECORD</p><h1>{page.title}</h1><p>/legal/{page.slug} · Updated {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(page.updatedAt)}</p></div><div className="admin-detail-header-actions"><span className="order-status">{page.status.toLowerCase()}</span><Link className="admin-secondary-link" href="/admin/legal">Back to legal pages</Link></div></header>
      <section className="admin-detail-metrics"><article><span>Publication state</span><strong>{page.status}</strong><small>{page.publishedAt ? "Published " + new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(page.publishedAt) : "Not published"}</small></article><article><span>Saved revisions</span><strong>{page.revisions.length}</strong><small>Latest 50 revisions</small></article><article><span>SEO title</span><strong className="admin-order-metric-status">{page.seoTitle || page.title}</strong><small>Search metadata</small></article><article><span>Last updated</span><strong>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(page.updatedAt)}</strong><small>Policy record</small></article></section>
      <div className="admin-blog-detail-grid"><section className="admin-detail-card"><div className="admin-detail-card-heading"><div><p className="eyebrow">POLICY CONTENT</p><h2>Current published text</h2></div><span>{page.content.length.toLocaleString()} characters</span></div><pre className="admin-blog-markdown-preview">{page.content}</pre></section><aside className="admin-product-detail-aside"><section className="admin-detail-card"><div className="admin-detail-card-heading"><div><p className="eyebrow">SEARCH METADATA</p><h2>SEO settings</h2></div></div><dl className="admin-detail-definition admin-detail-definition--stacked"><div><dt>SEO title</dt><dd>{page.seoTitle || page.title}</dd></div><div><dt>SEO description</dt><dd>{page.seoDescription || "Not configured"}</dd></div><div><dt>Public URL</dt><dd>/legal/{page.slug}</dd></div></dl><Link className="admin-product-open-link" href="/admin/legal">Open legal page manager</Link></section><section className="admin-detail-card"><div className="admin-detail-card-heading"><div><p className="eyebrow">VERSION HISTORY</p><h2>Saved revisions</h2></div><span>{page.revisions.length}</span></div>{page.revisions.length?<div className="admin-detail-timeline">{page.revisions.map(revision=><article key={revision.id}><span>{revision.status.slice(0,3)}</span><div><strong>{revision.title}</strong><p>{revision.content.length.toLocaleString()} characters</p><small>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(revision.createdAt)}</small></div></article>)}</div>:<p className="admin-detail-empty">No revision snapshots are available.</p>}</section></aside></div>
    </main>
  );
}
