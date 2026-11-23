import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function AdminCouponDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");
  if (admin.role !== "ADMIN") redirect("/admin");
  const { id } = await params;
  const coupon = await prisma.coupon.findUnique({
    where: { id },
    include: {
      _count: { select: { redemptions: true } },
      redemptions: {
        include: { order: { select: { id: true, orderNumber: true, status: true, totalPaise: true, createdAt: true } }, user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
      },
    },
  });
  if (!coupon) notFound();
  const now = new Date();
  const state = !coupon.isActive ? "Disabled" : coupon.startsAt && coupon.startsAt > now ? "Scheduled" : coupon.endsAt && coupon.endsAt < now ? "Expired" : coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit ? "Usage limit reached" : "Active";
  return (
    <main className="commerce-page admin-coupon-detail">
      <div className="commerce-breadcrumb"><Link href="/admin">Admin</Link><span>/</span><Link href="/admin/promotions">Promotions</Link><span>/</span>{coupon.code}</div>
      <header className="admin-detail-header">
        <div><p className="eyebrow">GROWTH / PROMOTION RECORD</p><h1>{coupon.code}</h1><p>{coupon.description || "Promotion code"} · Created {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(coupon.createdAt)}</p></div>
        <div className="admin-detail-header-actions"><span className="order-status">{state}</span><Link className="admin-secondary-link" href="/admin/promotions">Back to promotions</Link></div>
      </header>
      <section className="admin-detail-metrics">
        <article><span>Discount</span><strong>{coupon.discountType === "PERCENTAGE" ? (coupon.discountValue / 100).toFixed(2) + "%" : formatINR(coupon.discountValue)}</strong><small>{coupon.discountType === "PERCENTAGE" ? "Percentage off" : "Fixed amount off"}</small></article>
        <article><span>Redemptions</span><strong>{coupon.usageCount}</strong><small>{coupon.usageLimit == null ? "No usage cap" : coupon.usageLimit + " total allowed"}</small></article>
        <article><span>Minimum cart</span><strong>{formatINR(coupon.minimumSubtotalPaise)}</strong><small>Merchandise subtotal</small></article>
        <article><span>Recorded savings</span><strong>{formatINR(coupon.redemptions.reduce((sum, item) => sum + item.discountPaise, 0))}</strong><small>From latest {coupon.redemptions.length} redemption records</small></article>
      </section>
      <div className="admin-product-detail-grid">
        <section className="admin-detail-card">
          <div className="admin-detail-card-heading"><div><p className="eyebrow">REDEMPTION ACTIVITY</p><h2>Orders using this code</h2></div><span>{coupon._count.redemptions} total</span></div>
          {coupon.redemptions.length ? <div className="admin-detail-timeline">{coupon.redemptions.map(item => <article key={item.id}><span className="is-positive">−{formatINR(item.discountPaise)}</span><div><strong><Link href={"/admin/orders/" + item.order.id}>{item.order.orderNumber}</Link></strong><p>{item.user?.name ?? item.user?.email ?? "Guest checkout"} · {item.order.status.toLowerCase()}</p><small>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(item.createdAt)}</small></div></article>)}</div> : <p className="admin-detail-empty">No orders have redeemed this promotion yet.</p>}
        </section>
        <aside className="admin-product-detail-aside">
          <section className="admin-detail-card">
            <div className="admin-detail-card-heading"><div><p className="eyebrow">PROMOTION RULES</p><h2>Configuration</h2></div></div>
            <dl className="admin-detail-definition admin-detail-definition--stacked">
              <div><dt>Status</dt><dd>{state}</dd></div>
              <div><dt>Maximum discount</dt><dd>{coupon.maximumDiscountPaise == null ? "No cap" : formatINR(coupon.maximumDiscountPaise)}</dd></div>
              <div><dt>Starts</dt><dd>{coupon.startsAt ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(coupon.startsAt) : "Immediately"}</dd></div>
              <div><dt>Ends</dt><dd>{coupon.endsAt ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(coupon.endsAt) : "No expiry"}</dd></div>
              <div><dt>Usage limit</dt><dd>{coupon.usageLimit ?? "Unlimited"}</dd></div>
              <div><dt>Usage count</dt><dd>{coupon.usageCount}</dd></div>
              <div><dt>Last updated</dt><dd>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(coupon.updatedAt)}</dd></div>
            </dl>
          </section>
          <section className="admin-detail-card">
            <div className="admin-detail-card-heading"><div><p className="eyebrow">CHECKOUT BEHAVIOUR</p><h2>Discount application</h2></div></div>
            <p className="admin-detail-description">Discounts are applied to the merchandise subtotal. Delivery charges are excluded. The checkout validates active status, schedule, minimum subtotal and remaining usage capacity.</p>
          </section>
        </aside>
      </div>
    </main>
  );
}
