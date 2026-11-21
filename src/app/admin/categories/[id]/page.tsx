import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminCategoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");
  if (admin.role !== "ADMIN") redirect("/admin");
  const { id } = await params;
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      parent: { select: { id: true, name: true } },
      children: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, slug: true, isActive: true } },
      products: { select: { id: true, name: true, slug: true, sku: true, pricePaise: true, inventoryQty: true, isActive: true }, orderBy: { name: "asc" }, take: 100 },
      productLinks: { include: { product: { select: { id: true, name: true, slug: true, sku: true, pricePaise: true, inventoryQty: true, isActive: true } } }, orderBy: { product: { name: "asc" } }, take: 100 },
    },
  });
  if (!category) notFound();
  const products = [...category.products, ...category.productLinks.map(link => link.product)].filter((item, index, all) => all.findIndex(other => other.id === item.id) === index);
  return (
    <main className="commerce-page admin-category-detail">
      <div className="commerce-breadcrumb"><Link href="/admin">Admin</Link><span>/</span><Link href="/admin/categories">Categories</Link><span>/</span>{category.name}</div>
      <header className="admin-detail-header"><div><p className="eyebrow">CATALOGUE / CATEGORY RECORD</p><h1>{category.name}</h1><p>/{category.slug} · Updated {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(category.updatedAt)}</p></div><div className="admin-detail-header-actions"><span className={category.isActive ? "active-state" : "inactive-state"}>{category.isActive ? "Active" : "Inactive"}</span><Link className="admin-secondary-link" href="/admin/categories">Back to categories</Link></div></header>
      <section className="admin-detail-metrics"><article><span>Assigned products</span><strong>{products.length}</strong><small>Direct and additional assignments</small></article><article><span>Child categories</span><strong>{category.children.length}</strong><small>Nested taxonomy records</small></article><article><span>Menu visibility</span><strong>{category.showInMenu ? "Shown" : "Hidden"}</strong><small>Storefront navigation</small></article><article><span>Sort order</span><strong>{category.sortOrder}</strong><small>Display priority</small></article></section>
      <div className="admin-product-detail-grid"><div className="admin-product-detail-main">
        <section className="admin-detail-card"><div className="admin-detail-card-heading"><div><p className="eyebrow">CATEGORY CONTENT</p><h2>Details</h2></div></div><p className="admin-detail-description">{category.description || "No category description has been added."}</p><dl className="admin-detail-definition"><div><dt>Parent category</dt><dd>{category.parent ? <Link href={"/admin/categories/" + category.parent.id}>{category.parent.name}</Link> : "Top-level category"}</dd></div><div><dt>Slug</dt><dd>/{category.slug}</dd></div><div><dt>Status</dt><dd>{category.isActive ? "Active" : "Inactive"}</dd></div><div><dt>Show in menu</dt><dd>{category.showInMenu ? "Yes" : "No"}</dd></div><div><dt>SEO title</dt><dd>{category.seoTitle || category.name}</dd></div><div><dt>SEO description</dt><dd>{category.seoDescription || "Not configured"}</dd></div></dl></section>
        <section className="admin-detail-card"><div className="admin-detail-card-heading"><div><p className="eyebrow">MERCHANDISING</p><h2>Products in this category</h2></div><span>{products.length} records</span></div>{products.length ? <div className="admin-detail-timeline">{products.map(product=><article key={product.id}><span className={product.isActive?"is-positive":"is-negative"}>{product.inventoryQty}</span><div><strong><Link href={"/admin/products/"+product.id}>{product.name}</Link></strong><p>{product.sku} · {product.isActive?"Published":"Draft"}</p></div></article>)}</div> : <p className="admin-detail-empty">No products assigned to this category.</p>}</section>
      </div><aside className="admin-product-detail-aside"><section className="admin-detail-card"><div className="admin-detail-card-heading"><div><p className="eyebrow">TAXONOMY</p><h2>Child categories</h2></div><span>{category.children.length}</span></div>{category.children.length?category.children.map(child=><p className="admin-related-product" key={child.id}><Link href={"/admin/categories/"+child.id}>{child.name}</Link><small>/{child.slug} · {child.isActive?"Active":"Inactive"}</small></p>):<p className="admin-detail-empty">No child categories.</p>}</section><section className="admin-detail-card"><div className="admin-detail-card-heading"><div><p className="eyebrow">MANAGEMENT</p><h2>Edit category</h2></div></div><p className="admin-detail-description">Use the category manager to update name, slug, hierarchy, menu visibility, image and SEO settings.</p><Link className="primary-link" href="/admin/categories">Open category manager</Link></section></aside></div>
    </main>
  );
}
