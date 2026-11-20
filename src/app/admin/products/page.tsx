import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/money";
import { AdminProductForm } from "@/components/admin-product-form";
import { AdminProductEditForm } from "@/components/admin-product-edit-form";
import { AdminProductRow } from "@/components/admin-product-row";
import { AdminVariantForm } from "@/components/admin-variant-form";
import { AdminProductImages } from "@/components/admin-product-images";
import { AdminProductCsvTools } from "@/components/admin-product-csv-tools";

export const dynamic = "force-dynamic";

export default async function AdminProducts() {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");
  const products = await prisma.product.findMany({
    include: {
      category: true,
      categoryLinks: true,
      attributeValues: true,
      images: true,
      variants: { orderBy: { createdAt: "asc" } },
      productType: { include: { attributes: { include: { attribute: true }, orderBy: { sortOrder: "asc" } } } },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return <main className="commerce-page">
    <div className="commerce-breadcrumb"><Link href="/admin">Admin</Link><span>/</span> Products</div>
    <header className="commerce-heading"><p className="eyebrow">CATALOGUE MANAGEMENT</p><h1>Products,<br/><em>beautifully presented.</em></h1><p>Review product visibility, pricing and inventory.</p></header>
    <AdminProductForm />
    <AdminProductCsvTools />
    <div className="admin-product-list">{products.map(product => {
      const axes = product.productType?.attributes.filter(link => link.attribute.isVariantAxis).map(link => ({
        id: link.attribute.id, key: link.attribute.key, name: link.attribute.name,
        type: link.attribute.type, unit: link.attribute.unit, options: link.attribute.options,
      })) ?? [];
      return <article key={product.id}>
        <div><h2><Link href={`/admin/products/${product.id}`}>{product.name}</Link></h2><p>{product.sku} · {product.category?.name ?? "Uncategorised"}{product.productType ? ` · ${product.productType.name}` : ""}</p><Link className="admin-product-open-link" href={`/admin/products/${product.id}`}>Open product details</Link></div>
        <div><strong>{formatINR(product.pricePaise)}</strong><p>{product.inventoryQty} in stock · {product.variants.length} SKU variant(s)</p></div>
        <div>
          <span className={product.isActive ? "active-state" : "inactive-state"}>{product.isActive ? "Published" : "Draft"}</span>
          <AdminProductRow id={product.id} initiallyActive={product.isActive} initialStock={product.inventoryQty}/>
          <AdminProductEditForm product={{
            id: product.id, name: product.name, slug: product.slug, description: product.description, sku: product.sku,
            hsnCode: product.hsnCode, material: product.material, color: product.color, careInstructions: product.careInstructions,
            weightGrams: product.weightGrams, lengthMm: product.lengthMm, widthMm: product.widthMm, heightMm: product.heightMm,
            pricePaise: product.pricePaise, compareAtPaise: product.compareAtPaise, gstRateBps: product.gstRateBps,
            inventoryQty: product.inventoryQty, isActive: product.isActive, hasVariants: product.hasVariants,
            productTypeId: product.productTypeId, categoryId: product.categoryId,
            seoTitle: product.seoTitle, seoDescription: product.seoDescription, seoKeywords: product.seoKeywords, canonicalUrl: product.canonicalUrl, noIndex: product.noIndex,
            categoryLinks: product.categoryLinks.map(link => ({ categoryId: link.categoryId, isPrimary: link.isPrimary })),
            attributeValues: product.attributeValues.map(value => ({ attributeId: value.attributeId, value: value.value })),
          }}/>
          <AdminProductImages productId={product.id} initialImages={product.images} variants={product.variants.map(v=>({id:v.id,label:v.label,sku:v.sku}))}/>
          <AdminVariantForm productId={product.id} productSku={product.sku} axes={axes} initialVariants={product.variants.map(v=>({id:v.id,sku:v.sku,label:v.label,inventoryQty:v.inventoryQty,pricePaise:v.pricePaise,isActive:v.isActive,swatchHex:v.swatchHex,attributes:v.attributes}))}/>
        </div>
      </article>;
    })}</div>
  </main>;
}
