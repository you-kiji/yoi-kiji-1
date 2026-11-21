import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/money";
import { AdminProductEditForm } from "@/components/admin-product-edit-form";
import { AdminProductRow } from "@/components/admin-product-row";
import { AdminProductImages } from "@/components/admin-product-images";
import { AdminVariantForm } from "@/components/admin-variant-form";

export const dynamic = "force-dynamic";

export default async function AdminProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      categoryLinks: { include: { category: true } },
      attributeValues: true,
      images: { orderBy: [{ isPrimary: "desc" }, { position: "asc" }] },
      variants: { orderBy: { createdAt: "asc" } },
      productType: { include: { attributes: { include: { attribute: true }, orderBy: { sortOrder: "asc" } } } },
    },
  });
  if (!product) notFound();

  const [reviewCount, movements] = await Promise.all([
    prisma.review.count({ where: { productId: id } }),
    prisma.inventoryMovement.findMany({
      where: { productId: id },
      include: { variant: { select: { label: true, sku: true } } },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  const axes = product.productType?.attributes.filter(link => link.attribute.isVariantAxis).map(link => ({
    id: link.attribute.id,
    key: link.attribute.key,
    name: link.attribute.name,
    type: link.attribute.type,
    unit: link.attribute.unit,
    options: link.attribute.options,
  })) ?? [];

  const editable = {
    id: product.id, name: product.name, slug: product.slug, description: product.description, sku: product.sku,
    hsnCode: product.hsnCode, material: product.material, color: product.color, careInstructions: product.careInstructions,
    weightGrams: product.weightGrams, lengthMm: product.lengthMm, widthMm: product.widthMm, heightMm: product.heightMm,
    pricePaise: product.pricePaise, compareAtPaise: product.compareAtPaise, gstRateBps: product.gstRateBps,
    inventoryQty: product.inventoryQty, isActive: product.isActive, hasVariants: product.hasVariants,
    productTypeId: product.productTypeId, categoryId: product.categoryId,
    seoTitle: product.seoTitle, seoDescription: product.seoDescription, seoKeywords: product.seoKeywords,
    canonicalUrl: product.canonicalUrl, noIndex: product.noIndex,
    categoryLinks: product.categoryLinks.map(link => ({ categoryId: link.categoryId, isPrimary: link.isPrimary })),
    attributeValues: product.attributeValues.map(value => ({ attributeId: value.attributeId, value: value.value })),
  };

  return (
    <main className="commerce-page admin-product-detail">
      <div className="commerce-breadcrumb"><Link href="/admin">Admin</Link><span>/</span><Link href="/admin/products">Products</Link><span>/</span>{product.name}</div>
      <header className="admin-detail-header">
        <div>
          <p className="eyebrow">CATALOGUE / PRODUCT RECORD</p>
          <h1>{product.name}</h1>
          <p>{product.sku} · Updated {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(product.updatedAt)}</p>
        </div>
        <div className="admin-detail-header-actions">
          <span className={product.isActive ? "active-state" : "inactive-state"}>{product.isActive ? "Published" : "Draft"}</span>
          <Link className="primary-link" href={"/shop?search=" + encodeURIComponent(product.name)} target="_blank">Preview in store</Link>
          <Link className="admin-secondary-link" href="/admin/products">Back to products</Link>
        </div>
      </header>

      <section className="admin-detail-metrics" aria-label="Product overview">
        <article><span>Price</span><strong>{formatINR(product.pricePaise)}</strong><small>{product.compareAtPaise ? "Compare at " + formatINR(product.compareAtPaise) : "Current selling price"}</small></article>
        <article><span>Available stock</span><strong>{product.inventoryQty}</strong><small>{product.inventoryQty <= 0 ? "Out of stock" : product.inventoryQty <= 5 ? "Low stock" : "In stock"}</small></article>
        <article><span>SKU variants</span><strong>{product.variants.length}</strong><small>{product.hasVariants ? "Variant-based product" : "Single product SKU"}</small></article>
        <article><span>Reviews</span><strong>{reviewCount}</strong><small>Customer feedback records</small></article>
      </section>

      <div className="admin-product-detail-grid">
        <div className="admin-product-detail-main">
          <section className="admin-detail-card">
            <div className="admin-detail-card-heading"><div><p className="eyebrow">PRODUCT CONTENT</p><h2>Product information</h2></div><span>{product.isActive ? "Live" : "Unpublished"}</span></div>
            <p className="admin-detail-description">{product.description}</p>
            <dl className="admin-detail-definition">
              <div><dt>URL handle</dt><dd>/{product.slug}</dd></div>
              <div><dt>Primary category</dt><dd>{product.category?.name ?? "Uncategorised"}</dd></div>
              <div><dt>All categories</dt><dd>{product.categoryLinks.map(link => link.category.name).join(", ") || product.category?.name || "—"}</dd></div>
              <div><dt>Product type</dt><dd>{product.productType?.name ?? "Not assigned"}</dd></div>
              <div><dt>Material / colour</dt><dd>{[product.material, product.color].filter(Boolean).join(" · ") || "—"}</dd></div>
              <div><dt>HSN / GST</dt><dd>{product.hsnCode ?? "—"} · {(product.gstRateBps / 100).toFixed(2)}%</dd></div>
              <div><dt>Dimensions</dt><dd>{[product.lengthMm, product.widthMm, product.heightMm].some(Boolean) ? [product.lengthMm, product.widthMm, product.heightMm].map(v => v ? v + " mm" : "—").join(" × ") : "—"}</dd></div>
              <div><dt>Weight</dt><dd>{product.weightGrams ? product.weightGrams + " g" : "—"}</dd></div>
            </dl>
          </section>

          <section className="admin-detail-card">
            <div className="admin-detail-card-heading"><div><p className="eyebrow">MEDIA & ASSETS</p><h2>Product media</h2></div><span>{product.images.length} assets</span></div>
            <AdminProductImages productId={product.id} initialImages={product.images} variants={product.variants.map(v => ({ id: v.id, label: v.label, sku: v.sku }))} />
          </section>

          <section className="admin-detail-card">
            <div className="admin-detail-card-heading"><div><p className="eyebrow">SKU MANAGEMENT</p><h2>Variants</h2></div><span>{product.variants.length} variants</span></div>
            <AdminVariantForm productId={product.id} productSku={product.sku} axes={axes} initialVariants={product.variants.map(v => ({ id: v.id, sku: v.sku, label: v.label, inventoryQty: v.inventoryQty, pricePaise: v.pricePaise, isActive: v.isActive, swatchHex: v.swatchHex, attributes: v.attributes }))} />
          </section>

          <section className="admin-detail-card">
            <div className="admin-detail-card-heading"><div><p className="eyebrow">INVENTORY AUDIT</p><h2>Recent stock movements</h2></div><Link href="/admin/inventory">Open inventory</Link></div>
            {movements.length ? <div className="admin-detail-timeline">{movements.map(m => <article key={m.id}><span className={m.quantityDelta < 0 ? "is-negative" : "is-positive"}>{m.quantityDelta > 0 ? "+" : ""}{m.quantityDelta}</span><div><strong>{m.reason.replaceAll("_", " ").toLowerCase()}</strong><p>{m.variant?.label ?? product.sku}{m.reference ? " · " + m.reference : ""}</p><small>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(m.createdAt)}</small></div></article>)}</div> : <p className="admin-detail-empty">No stock movements recorded for this product yet.</p>}
          </section>
        </div>

        <aside className="admin-product-detail-aside">
          <section className="admin-detail-card">
            <div className="admin-detail-card-heading"><div><p className="eyebrow">QUICK ACTIONS</p><h2>Product status</h2></div></div>
            <AdminProductRow id={product.id} initiallyActive={product.isActive} initialStock={product.inventoryQty} />
          </section>
          <section className="admin-detail-card">
            <div className="admin-detail-card-heading"><div><p className="eyebrow">EDIT RECORD</p><h2>Product details</h2></div></div>
            <AdminProductEditForm product={editable} />
          </section>
          <section className="admin-detail-card">
            <div className="admin-detail-card-heading"><div><p className="eyebrow">SEARCH VISIBILITY</p><h2>SEO settings</h2></div></div>
            <dl className="admin-detail-definition admin-detail-definition--stacked">
              <div><dt>SEO title</dt><dd>{product.seoTitle || product.name}</dd></div>
              <div><dt>SEO description</dt><dd>{product.seoDescription || "Not configured"}</dd></div>
              <div><dt>Canonical URL</dt><dd>{product.canonicalUrl || "Default product URL"}</dd></div>
              <div><dt>Indexing</dt><dd>{product.noIndex ? "No index" : "Indexable"}</dd></div>
            </dl>
          </section>
        </aside>
      </div>
    </main>
  );
}
