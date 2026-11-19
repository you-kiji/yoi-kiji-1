"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useState } from "react";

type Review = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  verifiedPurchase: boolean;
  createdAt: string;
  userName: string;
};

export function ProductReviewSection({
  slug,
  reviews,
  averageRating,
  reviewCount,
  canReview,
  isSignedIn,
}: {
  slug: string;
  reviews: Review[];
  averageRating: number;
  reviewCount: number;
  canReview: boolean;
  isSignedIn: boolean;
}) {
  const [rating, setRating] = useState("5");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/products/" + slug + "/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: Number(rating), title: title.trim(), body: body.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Review could not be submitted.");
      setMessage(data.message ?? "Review submitted for moderation.");
      setTitle("");
      setBody("");
      setRating("5");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Review could not be submitted.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="product-reviews" aria-labelledby="product-reviews-heading">
      <div className="product-reviews__heading">
        <div>
          <p className="eyebrow">CUSTOMER NOTES</p>
          <h2 id="product-reviews-heading">Stories from <em>your home.</em></h2>
        </div>
        <div className="product-reviews__rating" aria-label={`${averageRating ? averageRating.toFixed(1) + " out of 5 stars" : "No ratings yet"} from ${reviewCount} approved reviews`}>
          <strong>{averageRating ? averageRating.toFixed(1) : "—"}</strong>
          <span aria-hidden="true">
            {"★".repeat(Math.round(averageRating))}
            {"☆".repeat(5 - Math.round(averageRating))}
          </span>
          <small>{reviewCount} approved {reviewCount === 1 ? "review" : "reviews"}</small>
        </div>
      </div>

      {canReview ? (
        <form className="product-review-form premium-form" onSubmit={submit}>
          <div className="review-form-heading">
            <h3>Share your experience</h3>
            <p>Your feedback helps others choose with confidence.</p>
          </div>

          <label htmlFor="review-rating">
            <span>Your rating</span>
            <select id="review-rating" value={rating} onChange={(event) => setRating(event.target.value)}>
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>{value} star{value > 1 ? "s" : ""}</option>
              ))}
            </select>
          </label>

          <label htmlFor="review-title">
            <span>Headline <em>Optional</em></span>
            <input
              id="review-title"
              maxLength={120}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="A lovely addition to our home"
            />
          </label>

          <label htmlFor="review-body">
            <span>Your review</span>
            <textarea
              id="review-body"
              required
              minLength={20}
              maxLength={2000}
              rows={5}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Tell us about the quality, feel and everyday use."
            />
            <small className="field-hint">Please share at least 20 characters. Reviews are checked before publishing.</small>
          </label>

          {message && <p className="review-form-feedback" role="status">{message}</p>}

          <button type="submit" disabled={busy}>
            {busy ? "Submitting your review…" : "Submit verified review"}
          </button>
        </form>
      ) : (
        <div className="product-review-note">
          <p>
            {isSignedIn
              ? "Reviews are available after a delivered and paid order for this product."
              : "Sign in and purchase this product to leave a verified review."}
          </p>
          {!isSignedIn && <Link href="/login">Sign in</Link>}
        </div>
      )}

      <div className="product-review-list" aria-label="Customer reviews">
        {reviews.map((review) => (
          <article key={review.id}>
            <div className="product-review-meta">
              <strong>{review.userName}</strong>
              <span aria-label={`${review.rating} out of 5 stars`}>
                {"★".repeat(review.rating)}
                {"☆".repeat(5 - review.rating)}
              </span>
              <small>
                {review.verifiedPurchase ? "Verified purchase · " : ""}
                {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(review.createdAt))}
              </small>
            </div>
            {review.title && <h3>{review.title}</h3>}
            <p>{review.body}</p>
          </article>
        ))}
        {reviews.length === 0 && (
          <p className="product-review-empty">
            No approved reviews yet. Be the first verified customer to share your experience.
          </p>
        )}
      </div>
    </section>
  );
}
