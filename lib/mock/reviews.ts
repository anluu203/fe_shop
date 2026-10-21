import type { Review, ReviewDetails } from "../types/reviews";
import type { MockState } from "./store";

export function hydrateReview(state: MockState, review: Review): ReviewDetails {
  const user = state.users.find((item) => item.id === review.UserID)!;
  const book = state.products.find((item) => item.id === review.BookID)!;
  return {
    ...review,
    user: { id: user.id, username: user.username },
    book: { id: book.id, name: book.name, imageUrl: book.imageUrl },
  };
}

export function newestReviews(reviews: Review[]) {
  return [...reviews].sort((a, b) =>
    b.CreatedAt.localeCompare(a.CreatedAt) || b.ReviewID - a.ReviewID,
  );
}
