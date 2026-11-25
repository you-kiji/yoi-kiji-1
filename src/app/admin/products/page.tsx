import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { AdminProductForm } from "@/components/admin-product-form";
import { AdminProductCsvTools } from "@/components/admin-product-csv-tools";
import { AdminProductCatalogTable } from "@/components/admin-product-catalog-table";
import { getLocaleData } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AdminProducts() {
  const admin = await requireAdmin();
  const locale = await getLocaleData();
  const t = (key: string, fallback: string) => locale.labels[key] ?? fallback;
  if (!admin) redirect("/admin/login");
  const products = await prisma.product.findMany({
    select: {
      id: true, name: true, slug: true, sku: true, pricePaise: true,
      inventoryQty: true, isActive: true, updatedAt: true,
      category: { select: { name: true } },
      _count: { select: { variants: true, images: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 1000,
  });

  return (
    <main className="page" style={{ background: 'var(--color-off-white)' }}>
      <div className="page-content">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/admin">{t("admin.admin","Admin")}</Link>
          <span className="separator">/</span>
          <span className="current">{t("admin.products","Products")}</span>
        </nav>

        <header className="page-header" style={{ marginBottom: 'var(--space-2xl)', textAlign: 'left' }}>
          <p className="section-eyebrow">CATALOGUE MANAGEMENT</p>
          <h1>Products,<br /><em>beautifully presented.</em></h1>
          <p>Manage product records, publication, pricing and inventory from one catalogue. Open any product to edit its content, media, variants and SEO.</p>
        </header>

        <AdminProductForm />
        <AdminProductCsvTools />
        <AdminProductCatalogTable initialProducts={products.map(product => ({ ...product, updatedAt: product.updatedAt.toISOString() }))} />
      </div>
    </main>
  );
}