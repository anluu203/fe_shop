import type { MockState } from "./store";
import type { User } from "../types";
import type {
  BorrowingBook,
  CreateLoanBody,
  Loan,
  LoanStatus,
} from "../types/borrowing";
import {
  ACTIVE_LOAN_STATUSES,
  LOAN_DURATIONS,
  addCalendarDays,
  isLoanOverdue,
  vietnamDate,
} from "../types/borrowing";

export function borrowingBooks(
  state: MockState,
  admin = false,
): BorrowingBook[] {
  return state.products
    .filter((book) => admin || book.isActive)
    .map((book) => {
      const inventory = state.borrowing.inventory.find(
        (item) => item.productId === book.id,
      );
      const reserved = state.borrowing.loans.filter(
        (loan) =>
          loan.productId === book.id &&
          ["approved", "borrowed"].includes(loan.status),
      ).length;
      return {
        productId: book.id,
        name: book.name,
        author: book.author ?? "",
        imageUrl: book.imageUrl,
        categoryName:
          state.categories.find((category) => category.id === book.categoryId)
            ?.name ?? "",
        totalCopies: inventory?.totalCopies ?? 0,
        availableCopies: Math.max(0, (inventory?.totalCopies ?? 0) - reserved),
        borrowable: !!inventory?.borrowable && book.isActive,
        isActive: book.isActive,
      };
    });
}

export function createLoan(
  state: MockState,
  user: User,
  body: CreateLoanBody,
): Loan {
  const book = borrowingBooks(state).find(
    (item) => item.productId === body.productId,
  );
  if (!book?.borrowable || book.availableCopies < 1)
    throw new Error("Sách hiện chưa có bản để mượn. Vui lòng chọn sách khác.");
  const store = state.stores.find((item) => item.id === body.storeId);
  if (!store) throw new Error("Nhà sách nhận sách không tồn tại.");
  if (
    typeof body.contactName !== "string" ||
    body.contactName.trim().length < 2 ||
    body.contactName.length > 100
  )
    throw new Error("Tên liên hệ cần từ 2 đến 100 ký tự.");
  const phone =
    typeof body.phone === "string" ? body.phone.replace(/[\s.()-]/g, "") : "";
  if (!/^(?:0\d{9}|\+84\d{9})$/.test(phone))
    throw new Error("Vui lòng nhập số điện thoại Việt Nam hợp lệ.");
  if (!(LOAN_DURATIONS as readonly number[]).includes(body.durationDays))
    throw new Error("Thời hạn mượn phải là 7, 14 hoặc 30 ngày.");
  const today = vietnamDate();
  if (
    typeof body.pickupDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(body.pickupDate) ||
    Number.isNaN(Date.parse(body.pickupDate)) ||
    new Date(body.pickupDate).toISOString().slice(0, 10) !== body.pickupDate ||
    body.pickupDate < today ||
    body.pickupDate > addCalendarDays(today, 30)
  )
    throw new Error("Ngày nhận sách phải từ hôm nay đến 30 ngày tới.");
  if (
    body.customerNote !== undefined &&
    (typeof body.customerNote !== "string" || body.customerNote.length > 1000)
  )
    throw new Error("Ghi chú tối đa 1.000 ký tự.");
  const active = state.borrowing.loans.filter(
    (loan) =>
      loan.userId === user.id && ACTIVE_LOAN_STATUSES.includes(loan.status),
  );
  if (active.some((loan) => loan.productId === body.productId))
    throw new Error("Bạn đã có một phiếu mượn đang xử lý cho cuốn sách này.");
  if (active.length >= 5)
    throw new Error(
      "Mỗi tài khoản được có tối đa 5 phiếu mượn đang hoạt động.",
    );
  const at = new Date().toISOString();
  const loan: Loan = {
    id: `MUON-${crypto.randomUUID().toUpperCase()}`,
    userId: user.id,
    productId: book.productId,
    storeId: store.id,
    bookName: book.name,
    bookImage: book.imageUrl,
    author: book.author,
    storeName: store.name,
    storeAddress: store.address,
    contactName: body.contactName.trim(),
    phone,
    pickupDate: body.pickupDate,
    durationDays: body.durationDays,
    customerNote: body.customerNote?.trim() ?? "",
    status: "pending",
    createdAt: at,
    updatedAt: at,
    borrowedAt: null,
    dueDate: null,
    returnedAt: null,
    timeline: [
      {
        status: "pending",
        at,
        note: "Đã gửi đăng ký mượn sách. Vui lòng chờ nhà sách xác nhận.",
      },
    ],
  };
  state.borrowing.loans.unshift(loan);
  return loan;
}

export function changeLoanStatus(
  state: MockState,
  user: User,
  loanId: string,
  status: LoanStatus,
  note: string,
  cancellationOnly = false,
): Loan {
  const loan = state.borrowing.loans.find(
    (item) =>
      item.id === loanId && (user.role === "ADMIN" || item.userId === user.id),
  );
  if (!loan) throw new Error("Không tìm thấy phiếu mượn.");
  if (cancellationOnly || user.role !== "ADMIN") {
    if (
      loan.userId !== user.id ||
      status !== "cancelled" ||
      !["pending", "approved"].includes(loan.status)
    )
      throw new Error("Chỉ có thể hủy phiếu của bạn khi chưa nhận sách.");
  } else {
    const transitions: Partial<Record<LoanStatus, LoanStatus[]>> = {
      pending: ["approved", "rejected"],
      approved: ["borrowed", "cancelled"],
      borrowed: ["returned"],
    };
    if (!transitions[loan.status]?.includes(status))
      throw new Error(
        "Không thể chuyển sang trạng thái này. Hãy xử lý đúng thứ tự.",
      );
    if (typeof note !== "string" || !note.trim() || note.length > 1000)
      throw new Error("Vui lòng nhập ghi chú xử lý, tối đa 1.000 ký tự.");
  }
  if (status === "approved") {
    const book = borrowingBooks(state).find(
      (item) => item.productId === loan.productId,
    );
    if (!book?.borrowable || book.availableCopies < 1)
      throw new Error("Không đủ bản sách để duyệt phiếu này.");
    if (!state.stores.some((store) => store.id === loan.storeId))
      throw new Error(
        "Nhà sách nhận đã ngừng hoạt động. Vui lòng từ chối và yêu cầu đăng ký lại.",
      );
  }
  const at = new Date().toISOString();
  if (status === "borrowed") {
    if (vietnamDate() < loan.pickupDate)
      throw new Error("Chưa đến ngày nhận sách đã đăng ký.");
    loan.borrowedAt = at;
    loan.dueDate = addCalendarDays(vietnamDate(), loan.durationDays);
  }
  if (status === "returned") loan.returnedAt = at;
  loan.status = status;
  loan.updatedAt = at;
  loan.timeline.push({
    status,
    at,
    note:
      cancellationOnly || user.role !== "ADMIN"
        ? "Người đọc đã hủy đăng ký trước khi nhận sách."
        : note.trim(),
  });
  return loan;
}

export function filteredLoans(
  loans: Loan[],
  params: Record<string, string | number | undefined>,
): Loan[] {
  const keyword = String(params.search ?? "")
    .trim()
    .toLocaleLowerCase("vi");
  return loans
    .filter(
      (loan) =>
        (!params.status ||
          (params.status === "overdue"
            ? isLoanOverdue(loan)
            : loan.status === params.status)) &&
        (!keyword ||
          `${loan.id} ${loan.bookName} ${loan.contactName} ${loan.phone}`
            .toLocaleLowerCase("vi")
            .includes(keyword)),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function updateBorrowingInventory(
  state: MockState,
  productId: string,
  totalCopies: number,
  borrowable: boolean,
): BorrowingBook {
  if (!state.products.some((book) => book.id === productId))
    throw new Error("Không tìm thấy sách.");
  if (
    !Number.isSafeInteger(totalCopies) ||
    totalCopies < 0 ||
    totalCopies > 100 ||
    typeof borrowable !== "boolean"
  )
    throw new Error("Số bản sách phải là số nguyên từ 0 đến 100.");
  const occupied = state.borrowing.loans.filter(
    (loan) =>
      loan.productId === productId &&
      ["approved", "borrowed"].includes(loan.status),
  ).length;
  if (totalCopies < occupied)
    throw new Error(
      `Có ${occupied} bản đang giữ chỗ hoặc đang mượn. Không thể giảm xuống thấp hơn số này.`,
    );
  const item = state.borrowing.inventory.find(
    (entry) => entry.productId === productId,
  );
  if (item) {
    item.totalCopies = totalCopies;
    item.borrowable = borrowable;
  } else state.borrowing.inventory.push({ productId, totalCopies, borrowable });
  return borrowingBooks(state, true).find(
    (book) => book.productId === productId,
  )!;
}
