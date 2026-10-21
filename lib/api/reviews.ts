import { api } from "./client";
import type { CreateReviewBody, ReviewDetails } from "../types/reviews";

export const reviewApi = {
  getForBook: (bookId: string) =>
    api.get<ReviewDetails[]>(`/products/${bookId}/reviews`),
  create: (bookId: string, body: CreateReviewBody) =>
    api.post<ReviewDetails>(`/products/${bookId}/reviews`, body),
  getAll: () => api.get<ReviewDetails[]>("/admin/reviews"),
  remove: (reviewId: number) => api.delete<void>(`/admin/reviews/${reviewId}`),
};
