import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/money";
import { RetryPaymentButton } from "@/components/retry-payment-button";
import { CancelOrderButton } from "@/components/cancel-order-button";
import { getLocaleData } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your orders" };

export default async function OrdersPage() {
  const user = await getCurrentUser();
  const locale = await getLocaleData();
  const t = (key: string, fallback: string) => locale.labels[key] ?? fallback;
  if (!user) redirect("/login");

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    include: { items: true, payment: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <main className="page">
      <div className="page-content">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span className="separator">/</span>
          <Link href="/account">{t("account.title","Account")}</Link>
          <span className="separator">/</span>
          <span className="current">{t("account.orders","Orders")}</span>
        </nav>

        <header className="page-header" style={{ marginBottom: 'var(--space-2xl)' }}>
          <p className="section-eyebrow">YOUR YOI KIJI ACCOUNT</p>
          <h1>Orders,<br /><em>thoughtfully kept.</em></h1>
          <p>A record of the pieces making their way into your home.</p>
        </header>

        {orders.length ? (
          <section aria-label="Your recent orders">
            {orders.map((order: typeof orders[0]) => (
              <article key={order.id} className="card" style={{ marginBottom: 'var(--space-lg)', overflow: 'hidden' }}>
                <div className="p-lg" style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 'var(--space-lg)', alignItems: 'start' }}>
                  <div className="order-card-primary">
                    <p style={{ fontSize: '0.75rem', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-moss)', marginBottom: 'var(--space-xs)' }}>ORDER REFERENCE</p>
                    <p style={{ fontSize: '1.125rem', fontWeight: '500', color: 'var(--color-deep-green)', marginBottom: 'var(--space-xs)' }}>{order.orderNumber}</p>
                    <p style={{ color: 'var(--color-sage)', fontSize: '0.9375rem' }}>Placed {new Intl.DateTimeFormat("en-IN", { dateStyle: "long" }).format(order.createdAt)}</p>
                  </div>

                  <div className="order-card-total" style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-moss)', marginBottom: 'var(--space-xs)' }}>ORDER TOTAL</p>
                    <strong style={{ fontSize: '1.25rem', color: 'var(--color-deep-green)' }}>{formatINR(order.totalPaise)}</strong>
                    <p style={{ color: 'var(--color-sage)', fontSize: '0.875rem', marginTop: 'var(--space-xs)' }}>{order.items.length} {order.items.length === 1 ? "item" : "items"}</p>
                  </div>

                  <div className="order-card-actions" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', alignItems: 'flex-end' }}>
                    <span className="badge badge-info" style={{ fontSize: '0.75rem', textTransform: 'capitalize' }}>{order.status.toLowerCase().replaceAll("_", " ")}</span>
                    <div className="flex flex-col gap-sm" style={{ width: '100%' }}>
                      <Link href={"/account/orders/" + order.id} className="btn btn-secondary btn-sm" style={{ textAlign: 'center' }}>{t("account.trackOrder","Track order")}</Link>
                      <Link href={"/account/orders/" + order.id + "/invoice"} className="btn btn-secondary btn-sm" style={{ textAlign: 'center' }}>{t("account.viewSummary","View order summary")}</Link>
                      <a href={"/api/account/orders/" + order.id + "/invoice"} className="btn btn-ghost btn-sm" style={{ textAlign: 'center' }}>{t("account.downloadPDF","Download PDF")}</a>
                    </div>
                    {order.status === "PENDING" &&
                      (order.payment?.status === "FAILED" || order.payment?.status === "CREATED") && (
                        <RetryPaymentButton orderId={order.id} />
                      )}
                    {["PENDING","CONFIRMED","PROCESSING"].includes(order.status) && order.payment?.status !== "CAPTURED" && order.payment?.status !== "REFUNDED" && !order.fulfillmentOrderId && !order.trackingNumber && <CancelOrderButton orderId={order.id} compact />}
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="empty-state" style={{ marginTop: 'var(--space-xl)' }}>
            <div className="empty-state-icon">✳</div>
            <p className="section-eyebrow">A FIRST FOR EVERYTHING</p>
            <h2>Your story with us starts here.</h2>
            <p>You have not placed an order yet. When you do, its details and progress will be kept here.</p>
            <Link href="/shop" className="btn btn-primary mt-lg">{t("account.exploreCollections","Explore collections")}</Link>
          </section>
        )}
      </div>
    </main>
  );
}