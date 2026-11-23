import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/money";
import { AdminOrderActions } from "@/components/admin-order-actions";
import { AdminFulfillmentForm } from "@/components/admin-fulfillment-form";

export const dynamic = "force-dynamic";

function AddressBlock({ title, value }: { title: string; value: unknown }) {
  const address = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const lines = [address.fullName, address.company, address.line1, address.line2, [address.city, address.state, address.postalCode].filter(Boolean).join(", "), address.country, address.phone, address.email].filter(Boolean);
  return <section className="admin-detail-card"><div className="admin-detail-card-heading"><div><p className="eyebrow">DELIVERY DETAILS</p><h2>{title}</h2></div></div>{lines.length ? <address className="admin-order-address">{lines.map((line, index) => <span key={index}>{String(line)}</span>)}</address> : <pre className="admin-order-json">{JSON.stringify(value, null, 2)}</pre>}</section>;
}

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      items: { include: { product: { select: { slug: true } }, variant: { select: { label: true, sku: true } } } },
      payment: true,
      notifications: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!order) notFound();

  const customerName = order.user?.name ?? order.guestName ?? "Guest customer";
  const customerEmail = order.user?.email ?? order.guestEmail ?? "No email supplied";
  const paymentStatus = order.payment?.status.toLowerCase() ?? "none";
  const paymentProvider = order.payment?.provider ?? "none";

  return (
    <main className="commerce-page admin-order-detail">
      <div className="commerce-breadcrumb"><Link href="/admin">Admin</Link><span>/</span><Link href="/admin/orders">Orders</Link><span>/</span>{order.orderNumber}</div>
      <header className="admin-detail-header">
        <div><p className="eyebrow">SALES / ORDER RECORD</p><h1>{order.orderNumber}</h1><p>Placed {new Intl.DateTimeFormat("en-IN", { dateStyle: "full", timeStyle: "short" }).format(order.createdAt)} · Updated {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(order.updatedAt)}</p></div>
        <div className="admin-detail-header-actions"><span className="order-status">{order.status.toLowerCase()}</span><Link className="admin-secondary-link" href="/admin/orders">Back to orders</Link></div>
      </header>

      <section className="admin-detail-metrics">
        <article><span>Order total</span><strong>{formatINR(order.totalPaise)}</strong><small>{order.currency}</small></article>
        <article><span>Order status</span><strong className="admin-order-metric-status">{order.status}</strong><small>Current fulfilment state</small></article>
        <article><span>Payment</span><strong className="admin-order-metric-status">{order.payment?.status ?? "UNPAID"}</strong><small>{order.payment?.provider ?? "No payment record"}</small></article>
        <article><span>Line items</span><strong>{order.items.length}</strong><small>{order.items.reduce((sum, item) => sum + item.quantity, 0)} units ordered</small></article>
      </section>

      <div className="admin-order-detail-grid">
        <div className="admin-product-detail-main">
          <section className="admin-detail-card">
            <div className="admin-detail-card-heading"><div><p className="eyebrow">ORDER CONTENTS</p><h2>Items ordered</h2></div><span>{order.items.length} line items</span></div>
            <div className="admin-order-items">{order.items.map(item => <article key={item.id}>
              <div><strong>{item.productName}</strong><p>{item.variantLabel ?? item.variant?.label ?? "Standard"} · SKU {item.sku}</p><small>HSN {item.hsnCode ?? "—"} · GST {(item.gstRateBps / 100).toFixed(2)}%</small></div>
              <div><span>{item.quantity} × {formatINR(item.unitPricePaise)}</span><strong>{formatINR(item.quantity * item.unitPricePaise)}</strong></div>
            </article>)}</div>
            <dl className="admin-order-totals">
              <div><dt>Subtotal</dt><dd>{formatINR(order.subtotalPaise)}</dd></div>
              <div><dt>Tax</dt><dd>{formatINR(order.taxPaise)}</dd></div>
              <div><dt>Shipping</dt><dd>{formatINR(order.shippingPaise)}</dd></div>
              <div><dt>Discount {order.couponCode ? "(" + order.couponCode + ")" : ""}</dt><dd>−{formatINR(order.discountPaise)}</dd></div>
              <div className="is-total"><dt>Total</dt><dd>{formatINR(order.totalPaise)}</dd></div>
            </dl>
          </section>

          <AddressBlock title="Shipping address" value={order.shippingAddress} />
          <AddressBlock title="Billing address" value={order.billingAddress} />

          <section className="admin-detail-card">
            <div className="admin-detail-card-heading"><div><p className="eyebrow">CUSTOMER COMMUNICATION</p><h2>Notification history</h2></div><span>Latest {order.notifications.length}</span></div>
            {order.notifications.length ? <div className="admin-detail-timeline">{order.notifications.map(item => <article key={item.id}><span className={item.status === "SENT" ? "is-positive" : "is-negative"}>{item.status}</span><div><strong>{item.channel} · {item.event.replaceAll("_", " ").toLowerCase()}</strong><p>{item.providerId ?? item.error ?? "No provider reference"}</p><small>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(item.createdAt)}</small></div></article>)}</div> : <p className="admin-detail-empty">No notification attempts recorded for this order.</p>}
          </section>
        </div>

        <aside className="admin-product-detail-aside">
          <section className="admin-detail-card">
            <div className="admin-detail-card-heading"><div><p className="eyebrow">CUSTOMER</p><h2>{customerName}</h2></div></div>
            <p className="admin-order-customer-email">{customerEmail}</p>
            {order.guestPhone && <p className="admin-order-customer-email">{order.guestPhone}</p>}
            {order.user?.id && <Link className="admin-product-open-link" href={"/admin/customers/" + order.user.id}>Open customer profile</Link>}
          </section>

          <section className="admin-detail-card">
            <div className="admin-detail-card-heading"><div><p className="eyebrow">ORDER MANAGEMENT</p><h2>Update status</h2></div></div>
            <AdminOrderActions id={order.id} status={order.status} paymentStatus={paymentStatus} paymentProvider={paymentProvider} />
          </section>

          <section className="admin-detail-card">
            <div className="admin-detail-card-heading"><div><p className="eyebrow">FULFILMENT</p><h2>Shipping & tracking</h2></div></div>
            <dl className="admin-detail-definition admin-detail-definition--stacked">
              <div><dt>Courier</dt><dd>{order.fulfillmentProvider ?? "Not assigned"}</dd></div>
              <div><dt>Tracking number</dt><dd>{order.trackingNumber ?? "Not added"}</dd></div>
              <div><dt>Tracking URL</dt><dd>{order.trackingUrl ? <a href={order.trackingUrl} target="_blank" rel="noreferrer">Open tracking page</a> : "Not added"}</dd></div>
            </dl>
            <AdminFulfillmentForm id={order.id} initialProvider={order.fulfillmentProvider} initialTracking={order.trackingNumber} />
          </section>

          <section className="admin-detail-card">
            <div className="admin-detail-card-heading"><div><p className="eyebrow">PAYMENT RECORD</p><h2>Transaction</h2></div></div>
            {order.payment ? <dl className="admin-detail-definition admin-detail-definition--stacked">
              <div><dt>Provider</dt><dd>{order.payment.provider}</dd></div>
              <div><dt>Payment status</dt><dd>{order.payment.status}</dd></div>
              <div><dt>Provider order ID</dt><dd>{order.payment.providerOrderId ?? "—"}</dd></div>
              <div><dt>Payment ID</dt><dd>{order.payment.providerPaymentId ?? "—"}</dd></div>
              <div><dt>Refund status</dt><dd>{order.payment.refundStatus ?? "—"}</dd></div>
              <div><dt>Refund amount</dt><dd>{order.payment.refundAmountPaise != null ? formatINR(order.payment.refundAmountPaise) : "—"}</dd></div>
            </dl> : <p className="admin-detail-empty">No payment record exists for this order.</p>}
          </section>
        </aside>
      </div>
    </main>
  );
}
