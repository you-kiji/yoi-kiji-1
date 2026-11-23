import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminProductTypeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");
  if (admin.role !== "ADMIN") redirect("/admin");
  const { id } = await params;
  const type = await prisma.productType.findUnique({
    where: { id },
    include: {
      attributes: { include: { attribute: true }, orderBy: { sortOrder: "asc" } },
      products: { select: { id: true, name: true, sku: true, slug: true, isActive: true, inventoryQty: true }, orderBy: { name: "asc" }, take: 200 },
    },
  });
  if (!type) notFound();
  const variantAxes = type.attributes.filter(link => link.attribute.isVariantAxis);
  const filterable = type.attributes.filter(link => link.isFilterable || link.attribute.isFilterable);
  return (
    <main className="commerce-page admin-product-type-detail">
      <div className="commerce-breadcrumb"><Link href="/admin">Admin</Link><span>/</span><Link href="/admin/product-types">Product types</Link><span>/</span>{type.name}</div>
      <header className="admin-detail-header"><div><p className="eyebrow">PRODUCT DATA / TYPE BLUEPRINT</p><h1>{type.name}</h1><p>/{type.slug} · Updated {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(type.updatedAt)}</p></div><div className="admin-detail-header-actions"><Link className="admin-secondary-link" href="/admin/product-types">Back to product types</Link></div></header>
      <section className="admin-detail-metrics"><article><span>Products using type</span><strong>{type.products.length}</strong><small>Assigned catalogue records</small></article><article><span>Attributes</span><strong>{type.attributes.length}</strong><small>Reusable field definitions</small></article><article><span>Variant axes</span><strong>{variantAxes.length}</strong><small>SKU option dimensions</small></article><article><span>Filterable fields</span><strong>{filterable.length}</strong><small>Storefront discovery filters</small></article></section>
      <div className="admin-product-detail-grid"><div className="admin-product-detail-main">
        <section className="admin-detail-card"><div className="admin-detail-card-heading"><div><p className="eyebrow">TYPE DEFINITION</p><h2>Product family</h2></div></div><p className="admin-detail-description">{type.description || "No description has been added."}</p><dl className="admin-detail-definition"><div><dt>Name</dt><dd>{type.name}</dd></div><div><dt>Slug</dt><dd>/{type.slug}</dd></div><div><dt>Created</dt><dd>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(type.createdAt)}</dd></div><div><dt>Last updated</dt><dd>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(type.updatedAt)}</dd></div></dl></section>
        <section className="admin-detail-card"><div className="admin-detail-card-heading"><div><p className="eyebrow">FIELD BLUEPRINT</p><h2>Attributes & rules</h2></div><span>{type.attributes.length} fields</span></div>{type.attributes.length?<div className="admin-detail-timeline">{type.attributes.map(link=><article key={link.id}><span>{link.attribute.type.slice(0,3)}</span><div><strong>{link.attribute.name} <small>({link.attribute.key})</small></strong><p>{[link.isRequired?"Required":null,link.isFilterable||link.attribute.isFilterable?"Filterable":null,link.attribute.isVariantAxis?"Variant option":null,link.attribute.unit].filter(Boolean).join(" · ")||"Optional product attribute"}</p></div></article>)}</div>:<p className="admin-detail-empty">No attributes have been configured.</p>}</section>
      </div><aside className="admin-product-detail-aside"><section className="admin-detail-card"><div className="admin-detail-card-heading"><div><p className="eyebrow">CATALOGUE</p><h2>Products using this type</h2></div><span>{type.products.length}</span></div>{type.products.length?type.products.map(product=><p className="admin-related-product" key={product.id}><Link href={"/admin/products/"+product.id}>{product.name}</Link><small>{product.sku} · {product.inventoryQty} in stock</small></p>):<p className="admin-detail-empty">No products use this type yet.</p>}</section><section className="admin-detail-card"><div className="admin-detail-card-heading"><div><p className="eyebrow">MANAGEMENT</p><h2>Type manager</h2></div></div><p className="admin-detail-description">Create product-type blueprints and their field definitions in the product type manager.</p><Link className="primary-link" href="/admin/product-types">Open product type manager</Link></section></aside></div>
    </main>
  );
}
