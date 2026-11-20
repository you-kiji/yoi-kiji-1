import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = { title: "YOI KIJI · Operations" };

const navigation = [
  { title: "Catalogue", description: "Products, categories, product specifications and media.", links: [{ label: "Products", href: "/admin/products", detail: "Manage listings, pricing and availability" }, { label: "Categories", href: "/admin/categories", detail: "Organise the store catalogue" }, { label: "Product types & attributes", href: "/admin/product-types", detail: "Maintain product specifications" }, { label: "Media library", href: "/admin/media", detail: "Organise images and creative assets" }] },
  { title: "Fulfilment", description: "Orders, stock movement and fulfilment operations.", links: [{ label: "Orders", href: "/admin/orders", detail: "Review and process customer orders" }, { label: "Inventory ledger", href: "/admin/inventory", detail: "Track stock and adjustments" }, { label: "Back-in-stock alerts", href: "/admin/stock-alerts", detail: "Review availability requests" }] },
  { title: "Storefront", description: "Homepage storytelling and product merchandising.", links: [{ label: "Content studio", href: "/admin/storefront", detail: "Manage homepage sections and collections" }, { label: "Legal pages", href: "/admin/legal", detail: "Edit and publish store policies" }, { label: "Languages & translations", href: "/admin/languages", detail: "Manage locales and translated content" }, { label: "SEO audit & metadata", href: "/admin/seo", detail: "Improve catalogue discoverability" }] },
  { title: "Growth", description: "Promotions, customer relationships and editorial content.", links: [{ label: "Promotions & coupons", href: "/admin/promotions", detail: "Create and manage offers" }, { label: "Customer intelligence", href: "/admin/customers", detail: "Understand customer activity" }, { label: "Reviews & social proof", href: "/admin/reviews", detail: "Moderate product feedback" }, { label: "Blog studio", href: "/admin/blog", detail: "Publish editorial content" }, { label: "Sales reports & exports", href: "/admin/reports", detail: "Review store performance" }] },
];

export default async function AdminPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const [products, activeProducts, customers, orders, pendingOrders, lowStock, failedPayments, revenue, recentOrders, stockAlerts] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.product.count({ where: { isActive: true, inventoryQty: { lte: 5 } } }),
    prisma.payment.count({ where: { status: "FAILED" } }),
    prisma.order.aggregate({ where: { status: { in: ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] } }, _sum: { totalPaise: true } }),
    prisma.order.findMany({ include: { user: { select: { name: true, email: true } }, items: true, payment: true }, orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.product.findMany({ where: { isActive: true, inventoryQty: { lte: 5 } }, select: { id: true, name: true, sku: true, inventoryQty: true }, orderBy: { inventoryQty: "asc" }, take: 5 }),
  ]);

  const metrics = [
    { label: "Gross order value", value: formatINR(revenue._sum.totalPaise ?? 0), note: "Confirmed orders onwards" },
    { label: "Orders", value: String(orders), note: `${pendingOrders} awaiting action` },
    { label: "Customers", value: String(customers), note: "Registered customer accounts" },
    { label: "Published products", value: String(activeProducts), note: `${products} products in catalogue` },
  ];

  return (
    <main className="commerce-page admin-page admin-workspace">
      <div className="commerce-breadcrumb"><Link href="/">YOI KIJI</Link><span>/</span> Operations</div>
      <header className="admin-welcome">
        <div>
          <p className="eyebrow">YOI KIJI / STORE OPERATIONS</p>
          <h1>Your store,<br /><em>at a glance.</em></h1>
          <p>A clear workspace for the catalogue, customers and daily operations.</p>
        </div>
        <div className="admin-account-chip"><span className="admin-account-dot" /> Signed in as <strong>{admin.email}</strong></div>
      </header>

      <section className="admin-metric-grid" aria-label="Store performance">
        {metrics.map((metric, index) => (
          <article className="admin-metric-card" key={metric.label}>
            <span className="admin-metric-index">0{index + 1}</span>
            <p>{metric.label}</p>
            <strong>{metric.value}</strong>
            <small>{metric.note}</small>
          </article>
        ))}
      </section>

      <section className="admin-attention">
        <div className="admin-workspace-heading"><div><p className="eyebrow">DAILY OPERATIONS</p><h2>Needs attention</h2></div><span>Live operational signals</span></div>
        <div className="admin-attention-grid">
          <article><span>Low stock</span><strong>{lowStock}</strong><small>Published products with 5 or fewer units</small></article>
          <article><span>Failed payments</span><strong>{failedPayments}</strong><small>Payment attempts requiring review</small></article>
          <article><span>Pending orders</span><strong>{pendingOrders}</strong><small>Orders awaiting confirmation</small></article>
        </div>
        {stockAlerts.length > 0 && <div className="admin-stock-list">{stockAlerts.map(product => <article key={product.id}><div><strong>{product.name}</strong><small>{product.sku}</small></div><strong>{product.inventoryQty} left</strong></article>)}</div>}
        <Link className="admin-text-action" href="/admin/inventory">Open inventory ledger</Link>
      </section>

      <section className="admin-management">
        <div className="admin-workspace-heading"><div><p className="eyebrow">WORKSPACE</p><h2>Manage your store</h2></div><span>Choose an area to continue</span></div>
        <div className="admin-module-grid">
          {navigation.map((group, index) => (
            <section className="admin-module-card" key={group.title}>
              <span className="admin-module-number">0{index + 1}</span>
              <h3>{group.title}</h3>
              <p>{group.description}</p>
              <div className="admin-module-links">
                {group.links.map(item => <Link href={item.href} key={item.href}><span><strong>{item.label}</strong><small>{item.detail}</small></span><span className="admin-link-indicator" aria-hidden="true" /></Link>)}
              </div>
            </section>
          ))}
        </div>
      </section>

      <section className="admin-recent-orders admin-recent-orders-refined">
        <div className="admin-workspace-heading"><div><p className="eyebrow">LATEST ACTIVITY</p><h2>Recent orders</h2></div><Link className="admin-text-action" href="/admin/orders">View all orders</Link></div>
        <div className="admin-recent-list">{recentOrders.map(order => (
          <article key={order.id}>
            <div><strong>{order.orderNumber}</strong><p>{order.user?.name ?? order.user?.email ?? order.guestName ?? order.guestEmail ?? "Guest customer"}</p><small>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(order.createdAt)}</small></div>
            <div><strong>{formatINR(order.totalPaise)}</strong><small>{order.items.length} item(s)</small></div>
            <span className="admin-order-status">{order.status.toLowerCase()}</span>
          </article>
        ))}</div>
      </section>
    </main>
  );
}
