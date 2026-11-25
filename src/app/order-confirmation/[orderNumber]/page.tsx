import Link from "next/link";
import { createHash } from "node:crypto";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getLocaleData } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const metadata = { title: "Order confirmation", robots: { index: false, follow: false } };

export default async function GuestOrderConfirmation({ params, searchParams }: { params: Promise<{ orderNumber: string }>; searchParams: Promise<{ token?: string }> }) {
  const [{ orderNumber }, { token }] = await Promise.all([params, searchParams]);
  if (!token || token.length < 32 || token.length > 128) notFound();
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const order = await prisma.order.findFirst({ where: { orderNumber, userId: null, guestAccessTokenHash: tokenHash }, include: { items: true, payment: true } });
  if (!order) notFound();
  const address = order.shippingAddress as { fullName?: string; line1?: string; line2?: string; city?: string; state?: string; postalCode?: string };
  const locale = await getLocaleData();
  const t = (key: string, fallback: string) => locale.labels[key] ?? fallback;
  const money = (value: number) => "₹" + (value / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <main className="page">
      <div className="page-content" style={{ maxWidth: '640px' }}>
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">{t("common.home","Home")}</Link>
          <span className="separator">/</span>
          <span className="current">{t("checkout.confirmation","Order confirmation")}</span>
        </nav>

        <div className="card">
          <div className="p-xl text-center" style={{ maxWidth: '480px', margin: '0 auto' }}>
            <p className="section-eyebrow">YOI KIJI / ORDER RECEIVED</p>
            <h1>Thank you.<br /><em>Your order is in.</em></h1>
            <p style={{ color: 'var(--color-moss)', marginTop: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>We have received your Cash on Delivery order. Keep this secure page link to check your order details.</p>

            <div style={{ background: 'var(--color-cream)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-lg)', marginBottom: 'var(--space-xl)', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-moss)' }}>ORDER NUMBER</span>
                <strong style={{ fontSize: '1.25rem', color: 'var(--color-deep-green)' }}>{order.orderNumber}</strong>
              </div>
              <span className="badge badge-info" style={{ display: 'inline-block', textTransform: 'capitalize' }}>{order.status}</span>
            </div>

            <div style={{ borderTop: '1px solid var(--color-line)', paddingTop: 'var(--space-lg)', marginBottom: 'var(--space-lg)', textAlign: 'left' }}>
              {order.items.map((item: typeof order.items[0]) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-md)', padding: 'var(--space-sm) 0' }}>
                  <span style={{ color: 'var(--color-forest)' }}>{item.productName}{item.variantLabel ? " · " + item.variantLabel : ""} × {item.quantity}</span>
                  <strong style={{ color: 'var(--color-deep-green)' }}>{money(item.unitPricePaise * item.quantity)}</strong>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-deep-green)', marginBottom: 'var(--space-xl)' }}>
              <span>Order total</span>
              <strong>{money(order.totalPaise)}</strong>
            </div>

            <div style={{ background: 'var(--color-cream)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-lg)', marginBottom: 'var(--space-xl)', textAlign: 'left' }}>
              <h2 style={{ marginBottom: 'var(--space-md)' }}>Delivery address</h2>
              <p style={{ color: 'var(--color-forest)', lineHeight: 1.8, marginBottom: 'var(--space-md)' }}>
                {address.fullName}<br />
                {address.line1}{address.line2 ? ", " + address.line2 : ""}<br />
                {address.city}, {address.state} {address.postalCode}
              </p>
              <p style={{ color: 'var(--color-sage)', fontSize: '0.9375rem' }}>Confirmation email: {order.guestEmail}</p>
            </div>

            <div style={{ background: 'var(--color-cream)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-lg)', marginBottom: 'var(--space-xl)', textAlign: 'left' }}>
              <strong style={{ color: 'var(--color-deep-green)', display: 'block', marginBottom: 'var(--space-xs)' }}>Cash on Delivery</strong>
              <span style={{ color: 'var(--color-forest)' }}>Payment is due to the delivery partner when your parcel arrives.</span>
            </div>

            <p style={{ color: 'var(--color-sage)', fontSize: '0.875rem', marginBottom: 'var(--space-xl)' }}>This page is protected by a private order-access token. Do not share its URL publicly.</p>

            <Link href="/shop" className="btn btn-primary btn-full btn-lg">Continue exploring</Link>
          </div>
        </div>
      </div>
    </main>
  );
}