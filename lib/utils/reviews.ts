import type { Review } from "../types/reviews";

export const RATING_LABELS = ["", "Rất không hài lòng", "Không hài lòng", "Bình thường", "Hài lòng", "Rất hài lòng"];

export function reviewStats(reviews: Review[]) {
  const counts = [0, 0, 0, 0, 0, 0];
  let total = 0;
  for (const review of reviews) {
    counts[review.Rating]++;
    total += review.Rating;
  }
  return { counts, total: reviews.length, average: reviews.length ? total / reviews.length : 0 };
}

export function reviewDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric",
  }).format(new Date(value));
}
