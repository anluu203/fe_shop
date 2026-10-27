"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "../../contexts/AuthContext";
import type { ProductReview, User } from "../../lib/types";
import { getSampleReviews, reviewService, REVIEW_COMMENT_MAX_LENGTH } from "../../lib/services/reviews";
import Button from "../ui/Button";
import styles from "./ProductReviews.module.css";

const RATING_LABELS = ["", "Rất không hài lòng", "Không hài lòng", "Bình thường", "Hài lòng", "Rất hài lòng"];
const PAGE_SIZE = 5;

function Stars({ rating }: { rating: number }) {
  return (
    <span className={styles.stars} role="img" aria-label={`${rating} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <i key={star} aria-hidden="true" className={`fa ${rating >= star ? "fa-star" : rating >= star - 0.5 ? "fa-star-half-o" : "fa-star-o"}`} />
      ))}
    </span>
  );
}

export default function ProductReviews({ productId }: { productId: string }) {
  const { user, isLoading: authLoading } = useAuth();
  const [reviews, setReviews] = useState<ProductReview[]>(() => getSampleReviews(productId));
  const [warning, setWarning] = useState("");
  const [filter, setFilter] = useState(0);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    const load = () => {
      const snapshot = reviewService.getAll(productId);
      setReviews(snapshot.reviews);
      setWarning(snapshot.warning);
    };
    // Read browser storage after hydration; also refresh when another tab changes it.
    const timer = window.setTimeout(load, 0);
    window.addEventListener("storage", load);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", load);
    };
  }, [productId]);

  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
  const filtered = filter ? reviews.filter((review) => review.rating === filter) : reviews;

  return (
    <section id="product-reviews" aria-labelledby="product-reviews-title" className={styles.section}>
      <div className={styles.heading}>
        <h2 id="product-reviews-title">Đánh giá sản phẩm</h2>
        <span>{reviews.length} đánh giá</span>
      </div>
      <p className={styles.demoNote}>Đánh giá mẫu và đánh giá bạn gửi chỉ được lưu trên trình duyệt này.</p>

      <div className={styles.summary}>
        <div className={styles.score}>
          <div><strong>{average.toFixed(1)}</strong><span> / 5</span></div>
          <Stars rating={Math.round(average * 2) / 2} />
          <p>Dựa trên {reviews.length} đánh giá</p>
        </div>
        <div className={styles.distribution} aria-label="Phân bố số sao">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = reviews.filter((review) => review.rating === rating).length;
            return (
              <div key={rating} className={styles.distributionRow}>
                <span>{rating} <i className="fa fa-star" aria-hidden="true" /></span>
                <div className={styles.track}><div style={{ width: `${reviews.length ? count / reviews.length * 100 : 0}%` }} /></div>
                <span>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {warning && <p role="status" className={styles.warning}>{warning}</p>}
      <div className={styles.formPanel}>
        {authLoading ? <p>Đang tải thông tin đăng nhập…</p> : user ? (
          <ReviewForm
            key={user.id}
            productId={productId}
            user={user}
            onSubmitted={(nextReviews) => {
              setReviews(nextReviews);
              setWarning("");
              setFilter(0);
              setVisibleCount(PAGE_SIZE);
            }}
          />
        ) : (
          <p><Link href="/client/auth/login" className={styles.loginLink}>Đăng nhập</Link> để chia sẻ đánh giá của bạn về sản phẩm.</p>
        )}
      </div>

      <div className={styles.filters} role="group" aria-label="Lọc đánh giá theo số sao">
        {[0, 5, 4, 3, 2, 1].map((rating) => (
          <button key={rating} type="button" aria-pressed={filter === rating}
            className={filter === rating ? styles.activeFilter : styles.filter}
            onClick={() => { setFilter(rating); setVisibleCount(PAGE_SIZE); }}>
            {rating ? `${rating} sao` : "Tất cả"} ({rating ? reviews.filter((review) => review.rating === rating).length : reviews.length})
          </button>
        ))}
      </div>

      <div aria-live="polite">
        {filtered.length ? (
          <ul className={styles.reviewList}>
            {filtered.slice(0, visibleCount).map((review) => (
              <li key={review.id} className={styles.review}>
                <div className={styles.avatar} aria-hidden="true">{review.user.username.trim().charAt(0).toUpperCase()}</div>
                <div className={styles.reviewBody}>
                  <div className={styles.author}>{review.user.username}{review.userId === user?.id && <span>Bạn</span>}</div>
                  <Stars rating={review.rating} />
                  <p className={styles.comment}>{review.comment}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className={styles.empty}>Chưa có đánh giá {filter ? `${filter} sao` : "cho sản phẩm này"}.</p>}
      </div>
      {filtered.length > visibleCount && (
        <div className={styles.loadMore}><Button type="button" variant="outline" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>Xem thêm đánh giá</Button></div>
      )}
    </section>
  );
}

function ReviewForm({ productId, user, onSubmitted }: {
  productId: string;
  user: User;
  onSubmitted: (reviews: ProductReview[]) => void;
}) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess(false);
    try {
      onSubmitted(reviewService.create(productId, user, rating, comment));
      setRating(0);
      setHoveredRating(0);
      setComment("");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể gửi đánh giá. Vui lòng thử lại.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <h3>Chia sẻ trải nghiệm của bạn</h3>
      <fieldset className={styles.ratingField} aria-describedby={error ? "review-error" : undefined}>
        <legend>Bạn đánh giá sản phẩm này thế nào?</legend>
        <div className={styles.ratingOptions} onMouseLeave={() => setHoveredRating(0)}>
          {[1, 2, 3, 4, 5].map((star) => (
            <label key={star} className={styles.ratingOption} onMouseEnter={() => setHoveredRating(star)}>
              <input type="radio" name="review-rating" value={star} checked={rating === star} aria-label={`${star} sao`} required
                onChange={() => { setRating(star); setError(""); setSuccess(false); }} />
              <i aria-hidden="true" className={`fa ${(hoveredRating || rating) >= star ? "fa-star" : "fa-star-o"}`} />
            </label>
          ))}
          <span className={styles.ratingLabel}>{RATING_LABELS[hoveredRating || rating] || "Chọn số sao"}</span>
        </div>
      </fieldset>
      <label htmlFor="review-comment">Nội dung nhận xét <span className={styles.required}>*</span></label>
      <textarea id="review-comment" rows={4} maxLength={REVIEW_COMMENT_MAX_LENGTH} required value={comment}
        placeholder="Chia sẻ cảm nhận của bạn về chất lượng và trải nghiệm sử dụng sản phẩm…"
        aria-describedby={`review-comment-limit${error ? " review-error" : ""}`} aria-invalid={!!error}
        onChange={(event) => { setComment(event.target.value); setError(""); setSuccess(false); }} />
      <div className={styles.formFooter}>
        <span id="review-comment-limit">{comment.length}/{REVIEW_COMMENT_MAX_LENGTH} ký tự</span>
        <Button type="submit" icon={<i className="fa fa-paper-plane" aria-hidden="true" />}>Gửi đánh giá</Button>
      </div>
      {error && <p id="review-error" role="alert" className={styles.error}>{error}</p>}
      {success && <p role="status" className={styles.success}>Đã lưu đánh giá của bạn trên trình duyệt này. Cảm ơn bạn đã chia sẻ!</p>}
    </form>
  );
}
