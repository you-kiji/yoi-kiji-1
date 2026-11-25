import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getLocaleData } from "@/lib/i18n";

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

  const locale = await getLocaleData();
  const t = (key: string, fallback: string) => locale.labels[key] ?? fallback;

  return (
    <main className="page">
      <div className="page-content">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span className="separator">/</span>
          <span className="current">Customer Reviews</span>
        </nav>

        <header className="page-header">
          <p className="section-eyebrow">THE YOI KIJI COMMUNITY</p>
          <h1>Stories from <em>your homes.</em></h1>
          <p>Thoughts, experiences and moments shared by customers who live with YOI KIJI.</p>
          <p style={{ color: 'var(--color-moss)', marginTop: 'var(--space-md)' }}>{totalReviews} {totalReviews === 1 ? "approved review" : "approved reviews"}</p>
        </header>

        {reviews.length ? (
          <section className="grid-3" aria-label="Customer reviews" style={{ marginTop: 'var(--space-xl)' }}>
            {reviews.map((review: typeof reviews[0]) => (
              <article key={review.id} className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div className="p-lg" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div className="flex items-center justify-between mb-md">
                    <span aria-label={review.rating + " out of 5 stars"} style={{ color: 'var(--color-gold)', fontSize: '1.125rem' }}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
                    {review.verifiedPurchase && <span className="badge badge-success" style={{ fontSize: '0.6875rem' }}>VERIFIED PURCHASE</span>}
                  </div>
                  {review.title && <h3 style={{ marginBottom: 'var(--space-sm)', lineHeight: 1.3 }}>{review.title}</h3>}
                  <p style={{ color: 'var(--color-forest)', lineHeight: 1.7, flex: 1, marginBottom: 'var(--space-lg)' }}>&ldquo;{review.body}&rdquo;</p>
                  <footer className="flex flex-col gap-xs" style={{ paddingTop: 'var(--space-md)', borderTop: '1px solid var(--color-line)' }}>
                    <strong style={{ color: 'var(--color-deep-green)' }}>{review.user.name || "YOI KIJI customer"}</strong>
                    <time dateTime={review.createdAt.toISOString()} style={{ color: 'var(--color-sage)', fontSize: '0.875rem' }}>{review.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</time>
                  </footer>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="empty-state" style={{ marginTop: 'var(--space-2xl)' }}>
            <div className="empty-state-icon">✳</div>
            <h2>Customer stories are on their way.</h2>
            <p>Approved reviews will appear here as customers share their experiences.</p>
            <Link href="/" className="btn btn-primary mt-lg">Return to homepage</Link>
          </section>
        )}

        {totalPages > 1 && (
          <nav className="pagination" aria-label="Reviews pagination" style={{ marginTop: 'var(--space-3xl)' }}>
            {page > 1 ? <Link href={page === 2 ? "/reviews" : "/reviews?page=" + (page - 1)} rel="prev" className="btn btn-secondary">Previous</Link> : <span className="btn btn-secondary disabled">Previous</span>}
            <div className="flex gap-sm">
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((number: number) => (
                <Link key={number} href={number === 1 ? "/reviews" : "/reviews?page=" + number} aria-current={number === page ? "page" : undefined} className={`btn ${number === page ? "btn-primary" : "btn-secondary"}`}>{number}</Link>
              ))}
            </div>
            {page < totalPages ? <Link href={"/reviews?page=" + (page + 1)} rel="next" className="btn btn-secondary">Next</Link> : <span className="btn btn-secondary disabled">Next</span>}
          </nav>
        )}

        <div className="flex justify-center mt-2xl">
          <Link href="/" className="btn btn-ghost">Back to YOI KIJI</Link>
        </div>
      </div>
    </main>
  );
}