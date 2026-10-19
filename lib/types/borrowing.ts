export type LoanStatus =
  "pending" | "approved" | "borrowed" | "returned" | "rejected" | "cancelled";
export const LOAN_STATUS_LABEL: Record<LoanStatus, string> = {
  pending: "Chờ duyệt",
  approved: "Chờ nhận sách",
  borrowed: "Đang mượn",
  returned: "Đã trả",
  rejected: "Từ chối",
  cancelled: "Đã hủy",
};
export const LOAN_DURATIONS = [7, 14, 30] as const;
export const ACTIVE_LOAN_STATUSES: LoanStatus[] = [
  "pending",
  "approved",
  "borrowed",
];
export interface BorrowingInventory {
  productId: string;
  totalCopies: number;
  borrowable: boolean;
}
export interface LoanEvent {
  status: LoanStatus;
  at: string;
  note: string;
}
export interface Loan {
  id: string;
  userId: string;
  productId: string;
  storeId: string;
  bookName: string;
  bookImage: string | null;
  author: string;
  storeName: string;
  storeAddress: string;
  contactName: string;
  phone: string;
  pickupDate: string;
  durationDays: number;
  customerNote: string;
  status: LoanStatus;
  createdAt: string;
  updatedAt: string;
  borrowedAt: string | null;
  dueDate: string | null;
  returnedAt: string | null;
  timeline: LoanEvent[];
}
export interface CreateLoanBody {
  productId: string;
  storeId: string;
  contactName: string;
  phone: string;
  pickupDate: string;
  durationDays: number;
  customerNote?: string;
}
export interface BorrowingBook {
  productId: string;
  name: string;
  author: string;
  imageUrl: string | null;
  categoryName: string;
  totalCopies: number;
  availableCopies: number;
  borrowable: boolean;
  isActive: boolean;
}
export interface LoanQuery {
  status?: LoanStatus | "overdue";
  search?: string;
}
export interface BorrowingData {
  inventory: BorrowingInventory[];
  loans: Loan[];
}

export function vietnamDate(value = new Date()): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function addCalendarDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function isLoanOverdue(loan: Loan, today = vietnamDate()): boolean {
  return loan.status === "borrowed" && !!loan.dueDate && loan.dueDate < today;
}
