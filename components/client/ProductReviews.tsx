"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../contexts/AuthContext";
import { reviewApi } from "../../lib/api/reviews";
import { subscribeMockData, USE_MOCK } from "../../lib/mock/config";
import type { ReviewDetails } from "../../lib/types/reviews";
import { RATING_LABELS, reviewDate, reviewStats } from "../../lib/utils/reviews";
import Pagination from "../ui/Pagination";
import ReviewStars from "../reviews/ReviewStars";
import styles from "../reviews/reviews.module.css";

const PAGE_SIZE = 5;

export default function ProductReviews({ bookId }: { bookId: string }) {
  const { user, isLoading: authLoading } = useAuth();
  const [reviews, setReviews] = useState<ReviewDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState(0);
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  const load = useCallback(async (isActive: () => boolean = () => true) => {
    try {
      const items = await reviewApi.getForBook(bookId);
      if (isActive()) { setReviews(items); setError(""); }
    } catch (caught) {
      if (isActive()) setError(caught instanceof Error ? caught.message : "Không thể tải đánh giá.");
    } finally {
      if (isActive()) setLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    let active = true;
    const refresh = () => { void load(() => active); };
    refresh();
    const off = USE_MOCK ? subscribeMockData(refresh) : () => {};
    return () => { active = false; off(); };
  }, [load]);

  const stats = reviewStats(reviews);
  const filtered = reviews.filter((review) => !filter || review.Rating === filter).sort((a, b) => {
    const newest = b.CreatedAt.localeCompare(a.CreatedAt) || b.ReviewID - a.ReviewID;
    return sort === "highest" ? b.Rating - a.Rating || newest : sort === "lowest" ? a.Rating - b.Rating || newest : newest;
  });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(1, totalPages));
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function selectRating(value: number) { setFilter(value); setPage(1); }

  return (
    <section id="product-reviews" className={styles.section} aria-labelledby="product-reviews-title" aria-busy={loading}>
      <div className={styles.heading}>
        <div>
          <span className="eyebrow">TỪ NHỮNG NGƯỜI ĐỌC</span>
          <h2 id="product-reviews-title">Đánh giá & cảm nhận<span className={styles.count}>{reviews.length}</span></h2>
          <p>Mỗi góc nhìn giúp bạn tìm được cuốn sách phù hợp.</p>
        </div>
        <a href="#review-form" className="outline-button"><i className="fa fa-pencil" aria-hidden="true" /> Viết đánh giá</a>
      </div>
      {USE_MOCK && <p className={styles.demoNote}><i className="fa fa-info-circle" aria-hidden="true" /> Dữ liệu minh họa · Đánh giá được lưu trên trình duyệt này.</p>}
      {error && <div className={styles.error} role="alert">{error} <button className="text-button" type="button" onClick={() => { void load(); }}>Thử lại</button></div>}
      {loading ? <p className={styles.empty} role="status">Đang tải đánh giá...</p> : <>
        <div className={styles.summary}>
          <div className={styles.score}>
            <div><strong>{stats.total ? stats.average.toLocaleString("vi-VN", { maximumFractionDigits: 1, minimumFractionDigits: 1 }) : "—"}</strong><span>/ 5</span></div>
            <ReviewStars rating={stats.average} />
            <p>{stats.total ? `Từ ${stats.total} đánh giá của người đọc` : "Chưa có đánh giá"}</p>
          </div>
          <div className={styles.distribution} aria-label="Phân bố số sao">
            {[5, 4, 3, 2, 1].map((rating) => <button key={rating} type="button" className={styles.barRow} onClick={() => selectRating(filter === rating ? 0 : rating)} aria-pressed={filter === rating} aria-label={`Lọc ${rating} sao, ${stats.counts[rating]} đánh giá`}>
              <span>{rating} <i className="fa fa-star" aria-hidden="true" /></span>
              <span className={styles.track}><span style={{ width: `${stats.total ? stats.counts[rating] / stats.total * 100 : 0}%` }} /></span>
              <span>{stats.counts[rating]}</span>
            </button>)}
          </div>
          <div className={styles.summaryNote}><i className="fa fa-comments-o" aria-hidden="true" /><strong>Bạn đã đọc cuốn sách này?</strong><p>Chia sẻ điều bạn thích, điều còn băn khoăn và trải nghiệm đọc của riêng bạn.</p></div>
        </div>
        <div className={styles.contentGrid}>
          <div className={styles.listPanel}>
            <div className={styles.listHeading}><h3>Cảm nhận của người đọc</h3><label className={styles.sortLabel}>Sắp xếp
              <select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }}>
                <option value="newest">Mới nhất</option><option value="highest">Sao cao nhất</option><option value="lowest">Sao thấp nhất</option>
              </select>
            </label></div>
            <div className={styles.filters} aria-label="Lọc theo số sao">
              {[0, 5, 4, 3, 2, 1].map((rating) => <button key={rating} type="button" aria-pressed={filter === rating} onClick={() => selectRating(rating)}>{rating ? `${rating} sao` : "Tất cả"} <span>({rating ? stats.counts[rating] : stats.total})</span></button>)}
            </div>
            {visible.length === 0 ? <div className={styles.empty}><i className="fa fa-comment-o" aria-hidden="true" /><h4>{stats.total ? "Chưa có đánh giá với số sao này" : "Mở đầu cuộc trò chuyện về cuốn sách"}</h4><p>{stats.total ? "Thử chọn số sao khác để xem thêm cảm nhận." : "Hãy là người đầu tiên chia sẻ cảm nhận của bạn."}</p>{filter > 0 && <button type="button" className="text-button" onClick={() => selectRating(0)}>Xem tất cả đánh giá</button>}</div> :
              <div>{visible.map((review) => <article key={review.ReviewID} className={styles.review}>
                <div className={styles.reviewHeader}><span className={styles.avatar} aria-hidden="true">{review.user.username.charAt(0).toLocaleUpperCase("vi-VN")}</span><div><strong>{review.user.username} {review.UserID === user?.id && <span className={styles.you}>Bạn</span>}</strong><time dateTime={review.CreatedAt}>{reviewDate(review.CreatedAt)}</time></div><ReviewStars rating={review.Rating} /></div>
                <p className={review.Comment ? styles.comment : styles.noComment}>{review.Comment || "Người đọc chỉ chấm sao, không để lại nhận xét."}</p>
              </article>)}</div>}
            <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
          </div>
          <aside id="review-form" className={styles.formPanel}>
            <span className="eyebrow">GÓC NHÌN CỦA BẠN</span><h3>Viết đôi dòng cảm nhận</h3>
            {authLoading ? <p role="status">Đang kiểm tra đăng nhập...</p> : user ?
              <ReviewForm key={`${bookId}-${user.id}`} bookId={bookId} username={user.username} onCreated={(review) => { setReviews((items) => [review, ...items.filter((item) => item.ReviewID !== review.ReviewID)]); selectRating(0); setSort("newest"); }} /> :
              <div className={styles.guest}><i className="fa fa-user-o" aria-hidden="true" /><p>Đăng nhập để chấm sao và chia sẻ cảm nhận về cuốn sách này.</p><Link className="solid-button" href="/client/auth/login">Đăng nhập để đánh giá <i className="fa fa-long-arrow-right" aria-hidden="true" /></Link></div>}
          </aside>
        </div>
      </>}
    </section>
  );
}

function ReviewForm({ bookId, username, onCreated }: { bookId: string; username: string; onCreated: (review: ReviewDetails) => void }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError(""); setSuccess("");
    if (!rating) { setError("Vui lòng chọn số sao từ 1 đến 5."); return; }
    setSaving(true);
    try {
      const review = await reviewApi.create(bookId, { Rating: rating, Comment: comment.trim() || null });
      onCreated(review); setRating(0); setComment("");
      setSuccess("Đã gửi đánh giá. Cảm ơn bạn đã chia sẻ!");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể gửi đánh giá. Vui lòng thử lại.");
    } finally { setSaving(false); }
  }

  return <form onSubmit={submit} className={styles.form} noValidate>
    <p>Chia sẻ với tên <strong>{username}</strong></p>
    <fieldset disabled={saving} aria-describedby="review-rating-hint"><legend>Bạn chấm cuốn sách này mấy sao? <span aria-hidden="true">*</span></legend>
      <div className={styles.ratingPicker}>{[1, 2, 3, 4, 5].map((value) => <label key={value} className={value <= rating ? styles.starSelected : undefined}>
        <input type="radio" name="review-rating" value={value} checked={rating === value} onChange={() => { setRating(value); setSuccess(""); }} aria-label={`${value} sao — ${RATING_LABELS[value]}`} />
        <i className={`fa ${value <= rating ? "fa-star" : "fa-star-o"}`} aria-hidden="true" />
      </label>)}</div>
      <p id="review-rating-hint" className={styles.ratingHint}>{rating ? RATING_LABELS[rating] : "Chọn từ 1 đến 5 sao"}</p>
    </fieldset>
    <label htmlFor="review-comment">Cảm nhận của bạn <span className={styles.optional}>(không bắt buộc)</span></label>
    <textarea id="review-comment" rows={5} maxLength={2000} value={comment} disabled={saving} onChange={(event) => { setComment(event.target.value); setSuccess(""); }} placeholder="Điều gì khiến bạn nhớ đến cuốn sách này?" aria-describedby="review-comment-hint" />
    <p id="review-comment-hint" className={styles.counter}>{comment.length.toLocaleString("vi-VN")} / 2.000 ký tự</p>
    {error && <p role="alert" className={styles.error}>{error}</p>}{success && <p role="status" className={styles.success}>{success}</p>}
    <button type="submit" className="solid-button" disabled={saving}>{saving ? "Đang gửi..." : "Gửi đánh giá"}<i className={`fa ${saving ? "fa-spinner fa-spin" : "fa-paper-plane-o"}`} aria-hidden="true" /></button>
  </form>;
}
