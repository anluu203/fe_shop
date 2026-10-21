"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { reviewApi } from "../../../lib/api/reviews";
import { subscribeMockData, USE_MOCK } from "../../../lib/mock/config";
import type { ReviewDetails } from "../../../lib/types/reviews";
import { reviewDate, reviewStats } from "../../../lib/utils/reviews";
import { adminServiceClasses as ui, ServiceFeedback } from "../../../components/admin/customer-service-ui";
import ReviewStars from "../../../components/reviews/ReviewStars";
import Pagination from "../../../components/ui/Pagination";
import styles from "../../../components/reviews/reviews.module.css";

const PAGE_SIZE = 10;
const normalize = (value: string) => value.toLocaleLowerCase("vi-VN").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ReviewDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [bookId, setBookId] = useState("");
  const [rating, setRating] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [selection, setSelection] = useState<{ id: number; mode: "view" | "delete" } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const load = useCallback(async (isActive: () => boolean = () => true) => {
    try {
      const items = await reviewApi.getAll();
      if (isActive()) { setReviews(items); setError(""); }
    } catch (caught) {
      if (isActive()) setError(caught instanceof Error ? caught.message : "Không thể tải danh sách đánh giá.");
    } finally { if (isActive()) setLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;
    const refresh = () => { void load(() => active); };
    refresh();
    const off = USE_MOCK ? subscribeMockData(refresh) : () => {};
    return () => { active = false; off(); };
  }, [load]);

  const stats = reviewStats(reviews);
  const books = [...new Map(reviews.map((review) => [review.BookID, review.book])).values()].sort((a, b) => a.name.localeCompare(b.name, "vi"));
  const keyword = normalize(search.trim());
  const filtered = reviews.filter((review) =>
    (!bookId || review.BookID === bookId) && (!rating || review.Rating === Number(rating)) &&
    normalize([review.ReviewID, review.user.username, review.UserID, review.book.name, review.Comment ?? ""].join(" ")).includes(keyword),
  ).sort((a, b) => {
    const newest = b.CreatedAt.localeCompare(a.CreatedAt) || b.ReviewID - a.ReviewID;
    return sort === "oldest" ? -newest : sort === "lowest" ? a.Rating - b.Rating || newest : sort === "highest" ? b.Rating - a.Rating || newest : newest;
  });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(1, totalPages));
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const selected = reviews.find((review) => review.ReviewID === selection?.id);

  function open(review: ReviewDetails, mode: "view" | "delete") {
    setSelection({ id: review.ReviewID, mode }); setDeleteError(""); setSuccess("");
  }

  async function remove() {
    if (!selected || deleting) return;
    const id = selected.ReviewID;
    setDeleting(true); setDeleteError("");
    try {
      await reviewApi.remove(id);
      setReviews((items) => items.filter((review) => review.ReviewID !== id));
      setSelection(null); setSuccess(`Đã xóa đánh giá #${id}. Điểm trung bình của sách đã được cập nhật.`);
    } catch (caught) {
      setDeleteError(caught instanceof Error ? caught.message : "Không thể xóa đánh giá.");
    } finally { setDeleting(false); }
  }

  function resetFilters() { setSearch(""); setBookId(""); setRating(""); setSort("newest"); setPage(1); }

  return <div>
    <div className={styles.adminIntro}>
      <div>{USE_MOCK && <span className={styles.mockBadge}>Dữ liệu minh họa</span>}<h2>Lắng nghe người đọc</h2><p>Theo dõi cảm nhận về từng cuốn sách và xóa các đánh giá không phù hợp.{USE_MOCK && " Thay đổi được đồng bộ với trang sản phẩm trên cùng trình duyệt."}</p></div>
      <button type="button" className="outline-button" disabled={loading} onClick={() => { setLoading(true); void load(); }}><i className="fa fa-refresh" aria-hidden="true" /> Làm mới</button>
    </div>
    <ServiceFeedback error={error} success={success} />
    <div className={styles.adminStats}>
      <article><span><i className="fa fa-comments-o" aria-hidden="true" /> Tổng đánh giá</span><strong>{stats.total}</strong><small>Tất cả cảm nhận của người đọc</small></article>
      <article><span><i className="fa fa-star-o" aria-hidden="true" /> Điểm trung bình</span><strong>{stats.total ? stats.average.toLocaleString("vi-VN", { maximumFractionDigits: 1 }) : "—"}<em> / 5</em></strong><small>Trên toàn bộ sách được đánh giá</small></article>
      <article><span><i className="fa fa-flag-o" aria-hidden="true" /> Đánh giá 1–2 sao</span><strong>{stats.counts[1] + stats.counts[2]}</strong><small>Cảm nhận cần được quan tâm</small></article>
      <article><span><i className="fa fa-book" aria-hidden="true" /> Sách có đánh giá</span><strong>{books.length}</strong><small>Đầu sách đã nhận phản hồi</small></article>
    </div>
    <section className={styles.adminPanel} aria-labelledby="admin-reviews-list" aria-busy={loading}>
      <div className={styles.adminFilters}>
        <label className={ui.label} htmlFor="review-search">Tìm kiếm đánh giá<input id="review-search" className={ui.control} type="search" placeholder="Mã đánh giá, người dùng, tên sách, nội dung..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label>
        <label className={ui.label} htmlFor="review-book">Sách<select id="review-book" className={ui.control} value={bookId} onChange={(event) => { setBookId(event.target.value); setPage(1); }}><option value="">Tất cả sách</option>{books.map((book) => <option key={book.id} value={book.id}>{book.name}</option>)}</select></label>
        <label className={ui.label} htmlFor="review-stars-filter">Số sao<select id="review-stars-filter" className={ui.control} value={rating} onChange={(event) => { setRating(event.target.value); setPage(1); }}><option value="">Tất cả số sao</option>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} sao</option>)}</select></label>
        <label className={ui.label} htmlFor="review-sort">Sắp xếp<select id="review-sort" className={ui.control} value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }}><option value="newest">Mới nhất</option><option value="oldest">Cũ nhất</option><option value="lowest">Sao thấp nhất</option><option value="highest">Sao cao nhất</option></select></label>
      </div>
      <div className={styles.tableHeading}><h3 id="admin-reviews-list">Danh sách đánh giá <span>({filtered.length})</span></h3>{(search || bookId || rating || sort !== "newest") && <button type="button" className="text-button" onClick={resetFilters}>Đặt lại bộ lọc</button>}</div>
      {loading ? <p role="status" className={styles.empty}>Đang tải đánh giá...</p> : visible.length === 0 ? <div className={styles.empty}><i className="fa fa-comments-o" aria-hidden="true" /><h4>{reviews.length ? "Không tìm thấy đánh giá phù hợp" : "Chưa có đánh giá nào"}</h4><p>{reviews.length ? "Thử thay đổi từ khóa hoặc bộ lọc." : "Đánh giá người dùng gửi từ trang sản phẩm sẽ xuất hiện tại đây."}</p></div> : <>
        <div className={styles.tableScroll} role="region" aria-label="Bảng đánh giá, cuộn ngang để xem thêm" tabIndex={0}>
          <table className={styles.table}><thead><tr><th scope="col">Mã / Người đọc</th><th scope="col">Sách</th><th scope="col">Đánh giá</th><th scope="col">Ngày gửi</th><th scope="col">Thao tác</th></tr></thead>
            <tbody>{visible.map((review) => <tr key={review.ReviewID}>
              <td><small>#{review.ReviewID}</small><strong>{review.user.username}</strong><small>{review.UserID}</small></td>
              <td><Link href={`/client/products/${review.BookID}`} className={styles.bookLink}>{review.book.name}</Link><small>{review.BookID}</small></td>
              <td><ReviewStars rating={review.Rating} /><p className={styles.commentPreview}>{review.Comment || "Chỉ chấm sao, không có nhận xét."}</p></td>
              <td><time dateTime={review.CreatedAt}>{reviewDate(review.CreatedAt)}</time></td>
              <td><div className={styles.rowActions}><button type="button" className="outline-button" aria-label={`Xem đánh giá #${review.ReviewID}`} onClick={() => open(review, "view")}><i className="fa fa-eye" aria-hidden="true" /></button><button type="button" className="danger-button" aria-label={`Xóa đánh giá #${review.ReviewID}`} onClick={() => open(review, "delete")}><i className="fa fa-trash-o" aria-hidden="true" /></button></div></td>
            </tr>)}</tbody>
          </table>
        </div>
        <div className={styles.tableFooter}><p>Hiển thị {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} / {filtered.length} đánh giá</p><Pagination page={currentPage} totalPages={totalPages} onChange={setPage} /></div>
      </>}
    </section>
    {selected && selection && <ReviewDialog review={selected} mode={selection.mode} deleting={deleting} error={deleteError} onClose={() => { if (!deleting) setSelection(null); }} onRequestDelete={() => setSelection({ id: selected.ReviewID, mode: "delete" })} onDelete={() => { void remove(); }} />}
  </div>;
}

function ReviewDialog({ review, mode, deleting, error, onClose, onRequestDelete, onDelete }: {
  review: ReviewDetails; mode: "view" | "delete"; deleting: boolean; error: string;
  onClose: () => void; onRequestDelete: () => void; onDelete: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => { element?.close(); };
  }, []);

  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="review-dialog-title" onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={styles.dialogContent}>
      <div className={styles.dialogHeading}><h2 id="review-dialog-title">{mode === "delete" ? "Xóa đánh giá này?" : `Chi tiết đánh giá #${review.ReviewID}`}</h2><button type="button" aria-label="Đóng chi tiết đánh giá" className="text-button" disabled={deleting} onClick={onClose}><i className="fa fa-times" aria-hidden="true" /></button></div>
      {mode === "delete" && <p className={styles.deleteNotice}>Đánh giá sẽ bị xóa khỏi trang sản phẩm và điểm trung bình sẽ được tính lại. Thao tác này không thể hoàn tác.</p>}
      <dl className={styles.detailFields}><div><dt>Mã đánh giá</dt><dd>#{review.ReviewID}</dd></div><div><dt>Ngày gửi</dt><dd><time dateTime={review.CreatedAt}>{reviewDate(review.CreatedAt)}</time></dd></div><div><dt>Người đánh giá</dt><dd>{review.user.username}<small>{review.UserID}</small></dd></div><div><dt>Sách</dt><dd><Link href={`/client/products/${review.BookID}`}>{review.book.name}</Link><small>{review.BookID}</small></dd></div></dl>
      <ReviewStars rating={review.Rating} /><p className={styles.dialogComment}>{review.Comment || "Người đọc chỉ chấm sao, không để lại nhận xét."}</p>
      <ServiceFeedback error={error} />
      <div className={styles.dialogActions}><button type="button" className="outline-button" disabled={deleting} onClick={onClose}>{mode === "delete" ? "Hủy" : "Đóng"}</button><button type="button" className="danger-button" disabled={deleting} onClick={mode === "delete" ? onDelete : onRequestDelete}>{deleting ? "Đang xóa..." : mode === "delete" ? "Xác nhận xóa" : "Xóa đánh giá"}</button></div>
    </div>
  </dialog>;
}
