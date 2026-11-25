import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/money";
import { CancelOrderButton } from "@/components/cancel-order-button";
import { getLocaleData } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const metadata = { title: "Track your order" };

const milestones = [
  { status: "CONFIRMED", title: "Order confirmed", description: "Your order has been confirmed and is being prepared." },
  { status: "PROCESSING", title: "Preparing your order", description: "Our team is carefully preparing your selected pieces." },
  { status: "SHIPPED", title: "On its way", description: "Your parcel has been handed over for delivery." },
  { status: "DELIVERED", title: "Delivered", description: "Your order has reached its destination." }
];
const rank: Record<string, number> = { CONFIRMED: 0, PROCESSING: 1, SHIPPED: 2, DELIVERED: 3 };

export default async function OrderTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const locale = await getLocaleData();
  const t = (key: string, fallback: string) => locale.labels[key] ?? fallback;
  if (!user) redirect("/login");
  const { id } = await params;
  const order = await prisma.order.findFirst({ where: { id, userId: user.id }, include: { items: true, payment: true } });
  if (!order) notFound();
  const currentRank = rank[order.status] ?? -1;
  const address = order.shippingAddress as Record<string, string>;
  const terminal = order.status === "CANCELLED" || order.status === "REFUNDED";

  return (
    <main className="page">
      <div className="page-content">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span className="separator">/</span>
          <Link href="/account">{t("account.title","Account")}</Link>
          <span className="separator">/</span>
          <Link href="/account/orders">{t("account.orders","Orders")}</Link>
          <span className="separator">/</span>
          <span className="current">{order.orderNumber}</span>
        </nav>

        <header className="page-header" style={{ marginBottom: 'var(--space-2xl)' }}>
          <p className="section-eyebrow">YOUR YOI KIJI ORDER</p>
          <h1>Every detail,<br /><em>thoughtfully tracked.</em></h1>
          <p>Order {order.orderNumber} · Placed {new Intl.DateTimeFormat("en-IN", { dateStyle: "long" }).format(order.createdAt)}</p>
        </header>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2xl)', marginBottom: 'var(--space-2xl)' }}>
          <article>
            <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
              <div className="p-lg flex items-center justify-between">
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-moss)', marginBottom: 'var(--space-xs)' }}>CURRENT STATUS</p>
                  <h2 style={{ textTransform: 'capitalize' }}>{order.status.replaceAll("_", " ").toLowerCase()}</h2>
                </div>
                <strong style={{ fontSize: '1.5rem', color: 'var(--color-deep-green)' }}>{formatINR(order.totalPaise)}</strong>
              </div>
            </div>

            {["PENDING","CONFIRMED","PROCESSING"].includes(order.status) && order.payment?.status !== "CAPTURED" && order.payment?.status !== "REFUNDED" && !order.fulfillmentOrderId && !order.trackingNumber && (
              <div style={{ marginBottom: 'var(--space-lg)' }}>
                <CancelOrderButton orderId={order.id} />
              </div>
            )}

            {terminal ? (
              <div className="card">
                <div className="p-xl text-center">
                  <h3 style={{ marginBottom: 'var(--space-md)' }}>{order.status === "CANCELLED" ? "This order was cancelled" : "This order was refunded"}</h3>
                  <p style={{ color: 'var(--color-forest)' }}>For any questions about this order, please contact the store team.</p>
                </div>
              </div>
            ) : order.status === "PENDING" ? (
              <div className="card">
                <div className="p-xl text-center">
                  <h3 style={{ marginBottom: 'var(--space-md)' }}>Payment confirmation pending</h3>
                  <p style={{ color: 'var(--color-forest)' }}>We&apos;ll begin preparing your order once payment is confirmed.</p>
                </div>
              </div>
            ) : (
              <ol style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                {milestones.map((step, index) => {
                  const complete = index <= currentRank;
                  const active = index === currentRank;
                  return (
                    <li key={step.status} style={{ display: 'flex', gap: 'var(--space-md)', padding: 'var(--space-lg)', background: complete ? 'var(--color-success-bg)' : 'var(--color-white)', border: '1px solid ' + (complete ? 'var(--color-success)' : 'var(--color-line)'), borderRadius: 'var(--radius-lg)', position: 'relative' }}>
                      <span style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.875rem', flexShrink: 0, background: complete ? 'var(--color-success)' : 'var(--color-cream)', color: complete ? 'var(--color-white)' : 'var(--color-deep-green)' }}>{complete ? "✓" : String(index + 1).padStart(2, "0")}</span>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ marginBottom: 'var(--space-xs)' }}>{step.title}</h3>
                        <p style={{ color: 'var(--color-forest)', margin: 0 }}>{step.description}</p>
                        {active && <small style={{ color: 'var(--color-gold)', fontWeight: 500 }}>Current stage</small>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}

            {order.status === "SHIPPED" && (
              <div className="card" style={{ marginTop: 'var(--space-lg)' }}>
                <div className="p-lg">
                  <h3 style={{ marginBottom: 'var(--space-lg)' }}>Shipment details</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 'var(--space-md) var(--space-lg)' }}>
                    <span style={{ color: 'var(--color-moss)', fontWeight: 500 }}>Carrier</span>
                    <strong>{order.fulfillmentProvider ?? "Shipping partner"}</strong>
                    {order.trackingNumber && <>
                      <span style={{ color: 'var(--color-moss)', fontWeight: 500 }}>Tracking / AWB number</span>
                      <strong>{order.trackingNumber}</strong>
                    </>}
                    {order.trackingUrl && (
                      <a href={order.trackingUrl} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ gridColumn: '1 / -1', justifySelf: 'start', marginTop: 'var(--space-md)' }}>Track with carrier ↗</a>
                    )}
                  </div>
                </div>
              </div>
            )}
          </article>

          <aside style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            <section className="card">
              <div className="p-lg">
                <h3 style={{ marginBottom: 'var(--space-lg)' }}>Items in this order</h3>
                {order.items.map((item: typeof order.items[0]) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-md)', padding: 'var(--space-md) 0', borderBottom: '1px solid var(--color-line)' }}>
                    <div>
                      <strong style={{ color: 'var(--color-deep-green)', display: 'block', marginBottom: 'var(--space-xs)' }}>{item.productName}</strong>
                      {item.variantLabel && <p style={{ color: 'var(--color-forest)', fontSize: '0.9375rem', margin: 0 }}>{item.variantLabel}</p>}
                      <small style={{ color: 'var(--color-sage)' }}>Qty {item.quantity}</small>
                    </div>
                    <strong style={{ color: 'var(--color-deep-green)', whiteSpace: 'nowrap' }}>{formatINR(item.unitPricePaise * item.quantity)}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="card">
              <div className="p-lg">
                <h3 style={{ marginBottom: 'var(--space-lg)' }}>Delivering to</h3>
                <address style={{ fontStyle: 'normal', color: 'var(--color-forest)', lineHeight: 1.8 }}>
                  <p>{address.fullName}</p>
                  <p>{address.line1}</p>
                  {address.line2 && <p>{address.line2}</p>}
                  <p>{address.city}, {address.state} {address.postalCode}</p>
                  <p>{address.phone}</p>
                </address>
              </div>
            </section>

            <section className="card">
              <div className="p-lg">
                <h3 style={{ marginBottom: 'var(--space-lg)' }}>Payment</h3>
                <p style={{ color: 'var(--color-forest)', marginBottom: 'var(--space-xs)' }}>{order.payment?.status ?? "Not available"}</p>
                <strong style={{ fontSize: '1.25rem', color: 'var(--color-deep-green)' }}>{formatINR(order.totalPaise)}</strong>
              </div>
            </section>
          </aside>
        </section>

        <div className="flex flex-wrap gap-md justify-center" style={{ paddingTop: 'var(--space-xl)', borderTop: '1px solid var(--color-line)' }}>
          <Link href="/account/orders" className="btn btn-secondary">← Back to all orders</Link>
          <Link href={"/account/orders/" + order.id + "/invoice"} className="btn btn-primary">View order summary ↗</Link>
        </div>
      </div>
    </main>
  );
}