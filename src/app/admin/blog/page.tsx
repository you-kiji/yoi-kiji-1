import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { AdminBlogManager } from "@/components/admin-blog-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Blog studio · YOI KIJI" };

export default async function AdminBlogPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");
  if (admin.role !== "ADMIN") redirect("/admin");
  const [posts, categories, tags, products] = await Promise.all([
    prisma.blogPost.findMany({ include: { author: { select: { name: true, email: true } }, _count: { select: { categories: true, tags: true, relatedProducts: true } } }, orderBy: { updatedAt: "desc" }, take: 100 }),
    prisma.blogCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.blogTag.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { isActive: true }, select: { id: true, name: true, slug: true, sku: true }, orderBy: { name: "asc" }, take: 300 }),
  ]);
  return <main className="commerce-page">
    <div className="commerce-breadcrumb"><Link href="/admin">Admin</Link><span>/</span> Blog studio</div>
    <header className="commerce-heading"><p className="eyebrow">EDITORIAL / CONTENT OPERATIONS</p><h1>Stories that<br/><em>make a home.</em></h1><p>Create, schedule and publish editorial content, connect stories to products and manage search metadata.</p></header>
    <AdminBlogManager initialPosts={posts.map(post => ({...post, publishedAt: post.publishedAt?.toISOString() ?? null, scheduledAt: post.scheduledAt?.toISOString() ?? null, updatedAt: post.updatedAt.toISOString()}))} categories={categories} tags={tags} products={products}/>
  </main>;
}
