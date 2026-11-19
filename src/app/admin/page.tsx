import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = { title: "YOI KIJI · Operations" };

const navigation = [
  { title: "Catalogue", description: "Products, collections and product specifications", links: [{ label: "Products", href: "/admin/products" }, { label: "Categories", href: "/admin/categories" }, { label: "Product types & attributes", href: "/admin/product-types" }, { label: "Media library", href: "/admin/media" }] },
  { title: "Fulfilment", description: "Orders, stock movement and fulfilment operations", links: [{ label: "Orders", href: "/admin/orders" }, { label: "Inventory ledger", href: "/admin/inventory" }, { label: "Back-in-stock alerts", href: "/admin/stock-alerts" }] },
  { title: "Storefront", description: "Homepage storytelling and product merchandising", links: [{ label: "Content studio", href: "/admin/storefront" }, { label: "Categories", href: "/admin/categories" }, { label: "Products", href: "/admin/products" }] },
  { title: "Growth", description: "Promotions and customer relationships", links: [{ label: "Promotions & coupons", href: "/admin/promotions" }, { label: "Customer intelligence", href: "/admin/customers" }, { label: "Reviews & social proof", href: "/admin/reviews" }, { label: "Blog studio", href: "/admin/blog" }] },
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

  return <main className="commerce-page admin-page">
    <div className="commerce-breadcrumb"><Link href="/">YOI KIJI</Link><span>/</span> Operations</div>
    <header className="commerce-heading">
      <p className="eyebrow">YOI KIJI / STORE OPERATIONS</p>
      <h1>Good work,<br/><em>well managed.</em></h1>
      <p>One clear view of your store, its customers and the work that needs attention.</p>
      <p>Signed in as {admin.email} · {admin.role}</p>
    </header>

    <section className="admin-stats" aria-label="Store performance">
      {metrics.map(metric => <article key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.note}</small></article>)}
    </section>

    <section className="admin-control-alerts" aria-label="Items requiring attention">
      <div className="admin-section-heading"><h2>Needs attention</h2><span>Live operational signals</span></div>
      <div className="admin-stats">
        <article><span>LOW STOCK</span><strong>{lowStock}</strong><small>Published products with 5 or fewer units</small></article>
        <article><span>FAILED PAYMENTS</span><strong>{failedPayments}</strong><small>Payment attempts requiring review</small></article>
        <article><span>PENDING ORDERS</span><strong>{pendingOrders}</strong><small>Orders not yet confirmed</small></article>
      </div>
      {stockAlerts.length > 0 && <div className="inventory-list">{stockAlerts.map(product => <article key={product.id}><div><strong>{product.name}</strong><p>{product.sku}</p></div><strong className="stock-negative">{product.inventoryQty} left</strong></article>)}</div>}
      <p><Link className="text-link" href="/admin/inventory">Review inventory ledger ↗</Link></p>
    </section>

    <section className="admin-control-navigation">
      <div className="admin-section-heading"><h2>Manage your store</h2><span>Administration workspace</span></div>
      <div className="admin-links">
        {navigation.map(group => <section key={group.title}><h3>{group.title}</h3><p>{group.description}</p>{group.links.map(link => <Link className="text-link" href={link.href} key={link.href}>{link.label} <span>↗</span></Link>)}</section>)}
      </div>
    </section>

    <section className="admin-recent-orders">
      <div className="admin-section-heading"><h2>Recent orders</h2><Link href="/admin/orders">View all orders ↗</Link></div>
      <div className="orders-list">{recentOrders.map(order => <article className="order-card" key={order.id}>
        <div><p className="order-number">{order.orderNumber}</p><p>{order.user?.name ?? order.user?.email ?? order.guestName ?? order.guestEmail ?? "Guest customer"}</p><small>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(order.createdAt)}</small></div>
        <div><strong>{formatINR(order.totalPaise)}</strong><p>{order.items.length} item(s)</p></div>
        <span className="order-status">{order.status.toLowerCase()}</span>
      </article>)}</div>
    </section>
    <section className="admin-control-navigation admin-insights-navigation">
      <div className="admin-section-heading"><h2>Insights & optimisation</h2><span>Performance and discoverability</span></div>
      <div className="admin-links">
        <section><h3>Business intelligence</h3><p>Revenue trends, best sellers and downloadable reports.</p><Link className="text-link" href="/admin/reports">Sales reports & exports <span>↗</span></Link></section>
        <section><h3>Search visibility</h3><p>Find missing product metadata and improve catalogue discoverability.</p><Link className="text-link" href="/admin/seo">SEO audit & metadata <span>↗</span></Link></section>
      </div>
    </section>
  </main>;
}
