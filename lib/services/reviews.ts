import type { ProductReview, User } from "../types";

// Temporary browser-only repository. Replace with the reviews API when available.
const STORAGE_PREFIX = "techparts:reviews:v1:";
export const REVIEW_COMMENT_MAX_LENGTH = 1000;

export function getSampleReviews(productId: string): ProductReview[] {
  return [
    { rating: 5, username: "Nguyễn Minh Anh", comment: "Sản phẩm hoạt động ổn định, đóng gói cẩn thận. Mình khá hài lòng với chất lượng." },
    { rating: 4, username: "Trần Hoàng Nam", comment: "Chất lượng tốt, đúng mô tả. Giao hàng hơi lâu một chút nhưng sản phẩm được bảo vệ kỹ." },
    { rating: 5, username: "Lê Thu Hà", comment: "Sản phẩm chính hãng, dễ lắp đặt. Nhân viên tư vấn nhiệt tình, sẽ tiếp tục ủng hộ." },
  ].map(({ rating, username, comment }, index) => {
    const userId = `demo-review-user-${index + 1}`;
    return {
      id: `demo-review:${productId}:${index + 1}`,
      rating, comment, productId, userId,
      user: { id: userId, username },
    };
  });
}

export function validateReview(rating: number, comment: string): string {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return "Vui lòng chọn từ 1 đến 5 sao.";
  }
  if (!comment.trim()) return "Vui lòng nhập nội dung nhận xét.";
  if (comment.trim().length > REVIEW_COMMENT_MAX_LENGTH) {
    return `Nội dung nhận xét tối đa ${REVIEW_COMMENT_MAX_LENGTH} ký tự.`;
  }
  return "";
}

function isReview(value: unknown, productId: string): value is ProductReview {
  if (!value || typeof value !== "object") return false;
  const review = value as Partial<ProductReview>;
  return typeof review.id === "string" && !!review.id.trim() &&
    review.productId === productId &&
    typeof review.userId === "string" && !!review.userId.trim() &&
    typeof review.rating === "number" && typeof review.comment === "string" &&
    !validateReview(review.rating, review.comment) &&
    !!review.user && review.user.id === review.userId &&
    typeof review.user.username === "string" && !!review.user.username.trim();
}

export const reviewService = {
  getAll(productId: string): { reviews: ProductReview[]; warning: string } {
    const samples = getSampleReviews(productId);
    try {
      const saved = localStorage.getItem(`${STORAGE_PREFIX}${productId}`);
      if (!saved) return { reviews: samples, warning: "" };
      const parsed: unknown = JSON.parse(saved);
      if (!Array.isArray(parsed)) throw new Error("Invalid reviews");
      const reviews = parsed.filter((item): item is ProductReview => isReview(item, productId));
      return {
        reviews: [...new Map([...reviews, ...samples].map((review) => [review.id, review])).values()],
        warning: reviews.length !== parsed.length ? "Một số đánh giá đã lưu không hợp lệ nên không được hiển thị." : "",
      };
    } catch {
      return { reviews: samples, warning: "Không đọc được đánh giá đã lưu trên trình duyệt. Đang hiển thị đánh giá mẫu." };
    }
  },

  create(productId: string, user: Pick<User, "id" | "username"> | null, rating: number, comment: string): ProductReview[] {
    if (!user?.id.trim() || !user.username.trim()) throw new Error("Vui lòng đăng nhập để gửi đánh giá.");
    if (!productId.trim()) throw new Error("Không tìm thấy sản phẩm.");
    const error = validateReview(rating, comment);
    if (error) throw new Error(error);

    const review: ProductReview = {
      id: crypto.randomUUID(), rating, comment: comment.trim(),
      userId: user.id, productId,
      user: { id: user.id, username: user.username },
    };
    const reviews = [review, ...this.getAll(productId).reviews];
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${productId}`, JSON.stringify(reviews));
    } catch {
      throw new Error("Không thể lưu đánh giá trên trình duyệt. Vui lòng kiểm tra dung lượng hoặc quyền lưu trữ rồi thử lại.");
    }
    return reviews;
  },
};
