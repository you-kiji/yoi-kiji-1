import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/money";
import { getLocaleData } from "@/lib/i18n";

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
  const locale = await getLocaleData();
  const t = (key: string, fallback: string) => locale.labels[key] ?? fallback;
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
    <main className="page" style={{ background: 'var(--color-off-white)' }}>
      <div className="page-content">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">YOI KIJI</Link>
          <span className="separator">/</span>
          <span className="current">{t("admin.operations","Operations")}</span>
        </nav>

        <header className="page-header" style={{ marginBottom: 'var(--space-2xl)', textAlign: 'left' }}>
          <p className="section-eyebrow">YOI KIJI / STORE OPERATIONS</p>
          <h1>Your store,<br /><em>at a glance.</em></h1>
          <p>A clear workspace for the catalogue, customers and daily operations.</p>
          <div style={{ marginTop: 'var(--space-lg)', padding: 'var(--space-md) var(--space-lg)', background: 'var(--color-cream)', borderRadius: 'var(--radius-md)', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-gold)' }} />
            <span>Signed in as <strong>{admin.email}</strong></span>
          </div>
        </header>

        <section aria-label="Store performance" className="grid-4" style={{ marginBottom: 'var(--space-2xl)' }}>
          {metrics.map((metric: typeof metrics[0], index: number) => (
            <article key={metric.label} className="card" style={{ textAlign: 'left' }}>
              <div className="p-lg">
                <span style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-gold)', marginBottom: 'var(--space-md)', display: 'block' }}>0{index + 1}</span>
                <p style={{ color: 'var(--color-moss)', marginBottom: 'var(--space-xs)' }}>{metric.label}</p>
                <strong style={{ fontSize: '1.75rem', color: 'var(--color-deep-green)', display: 'block', marginBottom: 'var(--space-xs)' }}>{metric.value}</strong>
                <small style={{ color: 'var(--color-sage)' }}>{metric.note}</small>
              </div>
            </article>
          ))}
        </section>

        <section style={{ marginBottom: 'var(--space-2xl)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
            <div>
              <p className="section-eyebrow">DAILY OPERATIONS</p>
              <h2 style={{ margin: 0 }}>Needs attention</h2>
            </div>
            <span style={{ color: 'var(--color-moss)' }}>Live operational signals</span>
          </div>
          <div className="grid-3" style={{ marginBottom: 'var(--space-lg)' }}>
            <article className="card">
              <div className="p-lg text-center">
                <span style={{ fontSize: '2.5rem', fontWeight: 600, color: 'var(--color-deep-green)', display: 'block', marginBottom: 'var(--space-xs)' }}>{lowStock}</span>
                <span style={{ color: 'var(--color-moss)', display: 'block', marginBottom: 'var(--space-xs)' }}>Low stock</span>
                <small style={{ color: 'var(--color-sage)' }}>Published products with 5 or fewer units</small>
              </div>
            </article>
            <article className="card">
              <div className="p-lg text-center">
                <span style={{ fontSize: '2.5rem', fontWeight: 600, color: 'var(--color-deep-green)', display: 'block', marginBottom: 'var(--space-xs)' }}>{failedPayments}</span>
                <span style={{ color: 'var(--color-moss)', display: 'block', marginBottom: 'var(--space-xs)' }}>Failed payments</span>
                <small style={{ color: 'var(--color-sage)' }}>Payment attempts requiring review</small>
              </div>
            </article>
            <article className="card">
              <div className="p-lg text-center">
                <span style={{ fontSize: '2.5rem', fontWeight: 600, color: 'var(--color-deep-green)', display: 'block', marginBottom: 'var(--space-xs)' }}>{pendingOrders}</span>
                <span style={{ color: 'var(--color-moss)', display: 'block', marginBottom: 'var(--space-xs)' }}>Pending orders</span>
                <small style={{ color: 'var(--color-sage)' }}>Orders awaiting confirmation</small>
              </div>
            </article>
          </div>
          {stockAlerts.length > 0 && (
            <div className="card" style={{ overflow: 'hidden' }}>
              <div className="p-lg border-b" style={{ borderBottom: '1px solid var(--color-line)' }}>
                <h3 style={{ margin: 0 }}>Low stock products</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {stockAlerts.map((product: typeof stockAlerts[0]) => (
                  <article key={product.id} className="flex items-center justify-between gap-md p-md" style={{ borderTop: '1px solid var(--color-line)' }}>
                    <div>
                      <strong style={{ color: 'var(--color-deep-green)', display: 'block' }}>{product.name}</strong>
                      <small style={{ color: 'var(--color-sage)' }}>{product.sku}</small>
                    </div>
                    <strong style={{ color: 'var(--color-error)', whiteSpace: 'nowrap' }}>{product.inventoryQty} left</strong>
                  </article>
                ))}
              </div>
            </div>
          )}
          <Link href="/admin/inventory" className="btn btn-secondary" style={{ marginTop: 'var(--space-lg)', display: 'inline-flex' }}>Open inventory ledger</Link>
        </section>

        <section style={{ marginBottom: 'var(--space-2xl)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
            <div>
              <p className="section-eyebrow">WORKSPACE</p>
              <h2 style={{ margin: 0 }}>Manage your store</h2>
            </div>
            <span style={{ color: 'var(--color-moss)' }}>Choose an area to continue</span>
          </div>
          <div className="grid-4">
            {navigation.map((group: typeof navigation[0], index: number) => (
              <section key={group.title} className="card" style={{ textAlign: 'left', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div className="p-xl" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-gold)', marginBottom: 'var(--space-md)' }}>0{index + 1}</span>
                  <h3 style={{ marginBottom: 'var(--space-sm)' }}>{group.title}</h3>
                  <p style={{ color: 'var(--color-moss)', marginBottom: 'var(--space-xl)', flex: 1 }}>{group.description}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                    {group.links.map((item: typeof group.links[0]) => (
                      <Link key={item.href} href={item.href} className="btn btn-ghost btn-sm" style={{ textAlign: 'left', justifyContent: 'space-between' }}>
                        <span>
                          <strong>{item.label}</strong>
                          <br />
                          <small style={{ color: 'var(--color-sage)' }}>{item.detail}</small>
                        </span>
                        <span aria-hidden="true">→</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            ))}
          </div>
        </section>

        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
            <div>
              <p className="section-eyebrow">LATEST ACTIVITY</p>
              <h2 style={{ margin: 0 }}>Recent orders</h2>
            </div>
            <Link href="/admin/orders" className="btn btn-secondary btn-sm">View all orders</Link>
          </div>
          <div className="card" style={{ overflow: 'hidden' }}>
            {recentOrders.length ? (
              <>
                <div className="p-lg border-b" style={{ borderBottom: '1px solid var(--color-line)', display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 'var(--space-md)', fontWeight: 600, color: 'var(--color-moss)', fontSize: '0.875rem' }}>
                  <span>Order</span>
                  <span>Total</span>
                  <span>Status</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {recentOrders.map((order: typeof recentOrders[0]) => (
                    <article key={order.id} className="flex items-center justify-between gap-md p-md" style={{ borderTop: '1px solid var(--color-line)', display: 'grid', gridTemplateColumns: '1fr 1fr auto', alignItems: 'center' }}>
                      <div>
                        <strong style={{ color: 'var(--color-deep-green)', display: 'block' }}>{order.orderNumber}</strong>
                        <p style={{ color: 'var(--color-forest)', margin: 'var(--space-xs) 0 0' }}>{order.user?.name ?? order.user?.email ?? order.guestName ?? order.guestEmail ?? "Guest customer"}</p>
                        <small style={{ color: 'var(--color-sage)' }}>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(order.createdAt)}</small>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ color: 'var(--color-deep-green)' }}>{formatINR(order.totalPaise)}</strong>
                        <small style={{ color: 'var(--color-sage)', display: 'block' }}>{order.items.length} item(s)</small>
                      </div>
                      <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>{order.status.toLowerCase()}</span>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <div className="p-xl text-center" style={{ color: 'var(--color-sage)' }}>No recent orders</div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}