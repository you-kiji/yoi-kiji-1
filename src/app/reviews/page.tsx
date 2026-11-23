import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 9;

export const metadata: Metadata = {
  title: "Customer Reviews",
  description: "Read customer stories and reviews from the YOI KIJI community.",
  alternates: { canonical: "/reviews" },
};

type SearchParams = Promise<{ page?: string }>;

export default async function ReviewsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const currentPage = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
  const where = { status: "APPROVED" as const };
  const totalReviews = await prisma.review.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalReviews / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const reviews = await prisma.review.findMany({
    where,
    select: {
      id: true, rating: true, title: true, body: true, verifiedPurchase: true, createdAt: true,
      user: { select: { name: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  return (
    <main className="public-reviews-page">
      <div className="commerce-breadcrumb"><Link href="/">Home</Link><span>/</span> Customer Reviews</div>
      <header className="public-reviews-hero">
        <p className="eyebrow">THE YOI KIJI COMMUNITY</p>
        <h1>Stories from <em>your homes.</em></h1>
        <p>Thoughts, experiences and moments shared by customers who live with YOI KIJI.</p>
        <span className="public-reviews-total">{totalReviews} {totalReviews === 1 ? "approved review" : "approved reviews"}</span>
      </header>

      {reviews.length ? (
        <section className="public-reviews-grid" aria-label="Customer reviews">
          {reviews.map((review) => (
            <article className="public-review-card" key={review.id}>
              <div className="public-review-card__top">
                <span className="public-review-card__stars" aria-label={review.rating + " out of 5 stars"}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
                {review.verifiedPurchase ? <span className="public-review-card__verified">VERIFIED PURCHASE</span> : null}
              </div>
              {review.title ? <h2>{review.title}</h2> : null}
              <p className="public-review-card__body">“{review.body}”</p>
              <footer>
                <strong>{review.user.name || "YOI KIJI customer"}</strong>
                <time dateTime={review.createdAt.toISOString()}>{review.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</time>
              </footer>
            </article>
          ))}
        </section>
      ) : (
        <section className="public-reviews-empty">
          <h2>Customer stories are on their way.</h2>
          <p>Approved reviews will appear here as customers share their experiences.</p>
          <Link href="/">Return to homepage</Link>
        </section>
      )}

      {totalPages > 1 ? (
        <nav className="public-reviews-pagination" aria-label="Reviews pagination">
          {page > 1 ? <Link href={page === 2 ? "/reviews" : "/reviews?page=" + (page - 1)} rel="prev">Previous</Link> : <span aria-disabled="true">Previous</span>}
          <div>{Array.from({ length: totalPages }, (_, index) => index + 1).map(number => (
            <Link key={number} href={number === 1 ? "/reviews" : "/reviews?page=" + number} aria-current={number === page ? "page" : undefined}>{number}</Link>
          ))}</div>
          {page < totalPages ? <Link href={"/reviews?page=" + (page + 1)} rel="next">Next</Link> : <span aria-disabled="true">Next</span>}
        </nav>
      ) : null}
      <div className="public-reviews-back"><Link href="/">Back to YOI KIJI</Link></div>
    </main>
  );
}
