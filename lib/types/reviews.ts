import type { Product, User } from "../types";

// Mirrors Reviews. The current frontend's user/book IDs are strings (e.g.
// user-reader, book-01); map them to integer foreign keys when wiring the DB API.
export interface Review {
  ReviewID: number;
  UserID: string;
  BookID: string;
  Rating: number;
  Comment: string | null;
  CreatedAt: string;
}

export interface ReviewDetails extends Review {
  user: Pick<User, "id" | "username">;
  book: Pick<Product, "id" | "name" | "imageUrl">;
}

export interface CreateReviewBody {
  Rating: number;
  Comment?: string | null;
}
