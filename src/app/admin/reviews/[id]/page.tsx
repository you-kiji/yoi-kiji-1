import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { AdminReviewDetailActions } from "@/components/admin-review-detail-actions";

export const dynamic = "force-dynamic";

export default async function AdminReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");
  if (admin.role !== "ADMIN") redirect("/admin");
  const { id } = await params;
  const review = await prisma.review.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      product: { select: { id: true, name: true, slug: true, sku: true } },
    },
  });
  if (!review) notFound();
  return (
    <main className="commerce-page admin-review-detail">
      <div className="commerce-breadcrumb"><Link href="/admin">Admin</Link><span>/</span><Link href="/admin/reviews">Reviews</Link><span>/</span>{review.product.name}</div>
      <header className="admin-detail-header">
        <div><p className="eyebrow">CUSTOMER VOICE / REVIEW RECORD</p><h1>{review.title || "Product review"}</h1><p>{review.product.name} · {review.product.sku} · Submitted {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(review.createdAt)}</p></div>
        <div className="admin-detail-header-actions"><span className="order-status">{review.status.toLowerCase()}</span><Link className="admin-secondary-link" href="/admin/reviews">Back to reviews</Link></div>
      </header>
      <section className="admin-detail-metrics">
        <article><span>Rating</span><strong>{review.rating} / 5</strong><small>{"★".repeat(review.rating)}{"☆".repeat(5-review.rating)}</small></article>
        <article><span>Purchase verification</span><strong>{review.verifiedPurchase ? "Verified" : "Unverified"}</strong><small>Order-linked review status</small></article>
        <article><span>Moderation status</span><strong>{review.status}</strong><small>Storefront visibility</small></article>
        <article><span>Last updated</span><strong>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(review.updatedAt)}</strong><small>Review record</small></article>
      </section>
      <div className="admin-review-detail-grid">
        <section className="admin-detail-card">
          <div className="admin-detail-card-heading"><div><p className="eyebrow">CUSTOMER FEEDBACK</p><h2>Review content</h2></div><span>{review.verifiedPurchase ? "Verified purchase" : "Not verified"}</span></div>
          <p className="admin-review-detail-stars">{"★".repeat(review.rating)}{"☆".repeat(5-review.rating)}</p>
          {review.title && <h2 className="admin-review-detail-title">{review.title}</h2>}
          <p className="admin-review-detail-body">{review.body}</p>
          <div className="admin-review-detail-customer"><strong>{review.user.name || "Customer"}</strong><span>{review.user.email}</span><Link className="admin-product-open-link" href={"/admin/customers/" + review.user.id}>Open customer profile</Link></div>
        </section>
        <aside className="admin-detail-card">
          <div className="admin-detail-card-heading"><div><p className="eyebrow">MODERATION WORKFLOW</p><h2>Review decision</h2></div></div>
          <AdminReviewDetailActions id={review.id} initialStatus={review.status} initialNote={review.adminNote}/>
          <div className="admin-review-product-link"><p className="eyebrow">RELATED PRODUCT</p><Link href={"/admin/products/" + review.product.id}>{review.product.name}</Link><small>{review.product.sku} · /{review.product.slug}</small></div>
        </aside>
      </div>
    </main>
  );
}
