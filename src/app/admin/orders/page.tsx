import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { AdminOrderWorkbench } from "@/components/admin-order-workbench";
import { getLocaleData } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AdminOrders() {
  const admin = await requireAdmin();
  const locale = await getLocaleData();
  const t = (key: string, fallback: string) => locale.labels[key] ?? fallback;
  if (!admin) redirect("/admin/login");
  const [orders, total] = await Promise.all([prisma.order.findMany({ include: { user: { select: { name: true, email: true } }, items: true, payment: true }, orderBy: { createdAt: "desc" }, take: 20 }), prisma.order.count()]);
  const serialised = orders.map(order => ({ ...order, createdAt: order.createdAt.toISOString() }));

  return (
    <main className="page" style={{ background: 'var(--color-off-white)' }}>
      <div className="page-content">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/admin">{t("admin.admin","Admin")}</Link>
          <span className="separator">/</span>
          <span className="current">{t("admin.orders","Orders")}</span>
        </nav>

        <header className="page-header" style={{ marginBottom: 'var(--space-2xl)', textAlign: 'left' }}>
          <p className="section-eyebrow">STORE OPERATIONS / FULFILMENT</p>
          <h1>Every order,<br /><em>in good hands.</em></h1>
          <p>Search the order queue, filter by operational status and export order data for reconciliation.</p>
        </header>

        <AdminOrderWorkbench initialOrders={serialised} initialTotal={total} />
      </div>
    </main>
  );
}