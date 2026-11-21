import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/money";
import { RetryPaymentButton } from "@/components/retry-payment-button";
import { CancelOrderButton } from "@/components/cancel-order-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your orders" };

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    include: { items: true, payment: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <main className="commerce-page account-orders-page">
      <div className="commerce-breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href="/account">Account</Link>
        <span>/</span>
        Orders
      </div>

      <header className="commerce-heading account-subpage-heading">
        <p className="eyebrow">YOUR YOI KIJI ACCOUNT</p>
        <h1>Orders,<br /><em>thoughtfully kept.</em></h1>
        <p>A record of the pieces making their way into your home.</p>
      </header>

      {orders.length ? (
        <section className="orders-list" aria-label="Your recent orders">
          {orders.map((order) => (
            <article key={order.id} className="order-card">
              <div className="order-card-primary">
                <p className="order-card-label">ORDER REFERENCE</p>
                <p className="order-number">{order.orderNumber}</p>
                <p className="order-card-date">
                  Placed {new Intl.DateTimeFormat("en-IN", { dateStyle: "long" }).format(order.createdAt)}
                </p>
              </div>

              <div className="order-card-total">
                <p className="order-card-label">ORDER TOTAL</p>
                <strong>{formatINR(order.totalPaise)}</strong>
                <p>{order.items.length} {order.items.length === 1 ? "item" : "items"}</p>
              </div>

              <div className="order-card-actions">
                <span className={"order-status order-status--" + order.status.toLowerCase()}>
                  {order.status.toLowerCase().replaceAll("_", " ")}
                </span>
                <div className="order-action-links">
                  <Link href={"/account/orders/" + order.id}>Track order</Link>
                  <Link href={"/account/orders/" + order.id + "/invoice"}>View order summary</Link>
                  <a href={"/api/account/orders/" + order.id + "/invoice"}>Download PDF</a>
                </div>
                {order.status === "PENDING" &&
                  (order.payment?.status === "FAILED" || order.payment?.status === "CREATED") && (
                    <RetryPaymentButton orderId={order.id} />
                  )}
                {["PENDING","CONFIRMED","PROCESSING"].includes(order.status) && order.payment?.status !== "CAPTURED" && order.payment?.status !== "REFUNDED" && <CancelOrderButton orderId={order.id} compact />}
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="catalogue-empty account-empty-state">
          <p className="eyebrow">A FIRST FOR EVERYTHING</p>
          <h2>Your story with us starts here.</h2>
          <p>You have not placed an order yet. When you do, its details and progress will be kept here.</p>
          <Link className="primary-link" href="/shop">Explore collections</Link>
        </section>
      )}
    </main>
  );
}
