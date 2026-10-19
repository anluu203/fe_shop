import { api } from "./client";
import type {
  BorrowingBook,
  CreateLoanBody,
  Loan,
  LoanQuery,
  LoanStatus,
} from "../types/borrowing";

export const borrowingApi = {
  getBooks: (search?: string) =>
    api.get<BorrowingBook[]>("/borrowing/books", { search }),
  getMine: (query?: LoanQuery) =>
    api.get<Loan[]>("/borrowing/loans", { ...query }),
  create: (body: CreateLoanBody) => api.post<Loan>("/borrowing/loans", body),
  cancel: (id: string) => api.patch<Loan>(`/borrowing/loans/${id}/cancel`),
};
export const adminBorrowingApi = {
  getAll: (query?: LoanQuery) =>
    api.get<Loan[]>("/admin/borrowing/loans", { ...query }),
  getInventory: () => api.get<BorrowingBook[]>("/admin/borrowing/inventory"),
  updateStatus: (id: string, status: LoanStatus, note: string) =>
    api.patch<Loan>(`/admin/borrowing/loans/${id}`, { status, note }),
  updateInventory: (
    productId: string,
    totalCopies: number,
    borrowable: boolean,
  ) =>
    api.patch<BorrowingBook>(`/admin/borrowing/inventory/${productId}`, {
      totalCopies,
      borrowable,
    }),
};
