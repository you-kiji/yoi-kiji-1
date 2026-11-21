import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { AdminStockAlertManager } from "@/components/admin-stock-alert-manager";

export const dynamic = "force-dynamic";

export default async function AdminStockAlertDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");
  if (admin.role !== "ADMIN") redirect("/admin");
  const { id } = await params;
  const alert = await prisma.stockAlert.findUnique({
    where: { id },
    include: { product: { select: { id: true, name: true, slug: true, sku: true, inventoryQty: true, hasVariants: true, variants: { where: { isActive: true }, select: { inventoryQty: true } } } } },
  });
  if (!alert) notFound();
  const serialised = [{ ...alert, createdAt: alert.createdAt.toISOString(), sentAt: alert.sentAt?.toISOString() ?? null }];
  return (
    <main className="commerce-page admin-stock-alert-detail">
      <div className="commerce-breadcrumb"><Link href="/admin">Admin</Link><span>/</span><Link href="/admin/stock-alerts">Back-in-stock alerts</Link><span>/</span>{alert.email}</div>
      <header className="admin-detail-header"><div><p className="eyebrow">CUSTOMER CARE / RESTOCK REQUEST</p><h1>{alert.product.name}</h1><p>{alert.product.sku} · Requested {new Intl.DateTimeFormat("en-IN", { dateStyle: "full", timeStyle: "short" }).format(alert.createdAt)}</p></div><div className="admin-detail-header-actions"><span className="order-status">{alert.status.toLowerCase()}</span><Link className="admin-secondary-link" href="/admin/stock-alerts">Back to alerts</Link></div></header>
      <section className="admin-detail-metrics"><article><span>Requested product</span><strong>{alert.product.name}</strong><small>{alert.product.sku}</small></article><article><span>Available stock</span><strong>{alert.product.inventoryQty}</strong><small>{alert.product.hasVariants ? "Parent product inventory" : "Tracked stock"}</small></article><article><span>Request status</span><strong>{alert.status}</strong><small>{alert.sentAt ? "Sent " + new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(alert.sentAt) : "Awaiting notification"}</small></article><article><span>Customer email</span><strong className="admin-order-metric-status">{alert.email}</strong><small>Restock notification recipient</small></article></section>
      <div className="admin-product-detail-grid"><section className="admin-detail-card"><div className="admin-detail-card-heading"><div><p className="eyebrow">NOTIFICATION DELIVERY</p><h2>Restock email workflow</h2></div></div><AdminStockAlertManager initialAlerts={serialised}/></section><aside className="admin-product-detail-aside"><section className="admin-detail-card"><div className="admin-detail-card-heading"><div><p className="eyebrow">PRODUCT RECORD</p><h2>{alert.product.name}</h2></div></div><dl className="admin-detail-definition admin-detail-definition--stacked"><div><dt>SKU</dt><dd>{alert.product.sku}</dd></div><div><dt>URL handle</dt><dd>/{alert.product.slug}</dd></div><div><dt>Current stock</dt><dd>{alert.product.inventoryQty}</dd></div><div><dt>Variant inventory</dt><dd>{alert.product.variants.map(v=>v.inventoryQty).join(", ") || "No active variants"}</dd></div></dl><Link className="admin-product-open-link" href={"/admin/products/"+alert.product.id}>Open product details</Link></section><section className="admin-detail-card"><div className="admin-detail-card-heading"><div><p className="eyebrow">DELIVERY STATUS</p><h2>Last attempt</h2></div></div><p className="admin-detail-description">{alert.error || (alert.sentAt ? "Notification sent successfully." : "No successful notification has been recorded.")}</p></section></aside></div>
    </main>
  );
}
