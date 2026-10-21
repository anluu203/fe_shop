import parentSeed from "../../mock-data/category-parents.json";
import categorySeed from "../../mock-data/categories.json";
import productSeed from "../../mock-data/products.json";
import userSeed from "../../mock-data/users.json";
import orderSeed from "../../mock-data/orders.json";
import storeSeed from "../../mock-data/stores.json";
import serviceSeed from "../../mock-data/customer-services.json";
import borrowingSeed from "../../mock-data/borrowing.json";
import reviewSeed from "../../mock-data/reviews.json";
import type { Review } from "../types/reviews";
import type { BorrowingData } from "../types/borrowing";
import { LOAN_STATUS_LABEL } from "../types/borrowing";
import type { ManagedConsultationProduct } from "../types/customer-services";
import type {
  CategoryParent,
  Category,
  Product,
  User,
  Order,
  Store,
} from "../types";
import { MOCK_EVENT, MOCK_STORAGE_KEY, MOCK_WARNING_EVENT } from "./config";

export type DemoUser = User & { password: string };
export interface MockState {
  version: 1;
  parents: CategoryParent[];
  categories: Category[];
  products: Product[];
  users: DemoUser[];
  orders: Order[];
  stores: Store[];
  consultation: ManagedConsultationProduct[];
  borrowing: BorrowingData;
  reviews: Review[];
  nextReviewId: number;
}

const seed = {
  version: 1,
  parents: parentSeed,
  categories: categorySeed,
  products: productSeed,
  users: userSeed,
  orders: orderSeed,
  stores: storeSeed,
  consultation: serviceSeed.products.map((p) => ({ ...p, isActive: true })),
  borrowing: borrowingSeed,
  reviews: reviewSeed,
  nextReviewId: Math.max(0, ...reviewSeed.map((review) => review.ReviewID)) + 1,
} as MockState;
let warning = "";

function setWarning(message: string) {
  if (warning === message) return;
  warning = message;
  if (typeof window !== "undefined")
    queueMicrotask(() => window.dispatchEvent(new Event(MOCK_WARNING_EVENT)));
}

export const getMockWarning = () => warning;
export const cloneSeed = (): MockState => structuredClone(seed);

function isValid(value: unknown): value is MockState {
  if (!value || typeof value !== "object") return false;
  const state = value as MockState;
  const collections = [
    state.parents,
    state.categories,
    state.products,
    state.users,
    state.orders,
    state.stores,
  ];
  if (
    state.version !== 1 ||
    collections.some(
      (items) =>
        !Array.isArray(items) ||
        items.some((item) => !item || typeof item.id !== "string") ||
        new Set(items.map((item) => item.id)).size !== items.length,
    )
  )
    return false;
  return (
    state.parents.every((p) => typeof p.name === "string") &&
    state.categories.every(
      (c) =>
        typeof c.name === "string" &&
        state.parents.some((p) => p.id === c.parentId),
    ) &&
    state.products.every(
      (p) =>
        typeof p.name === "string" &&
        typeof p.price === "string" &&
        /^\d+$/.test(p.price) &&
        typeof p.isActive === "boolean" &&
        state.categories.some((c) => c.id === p.categoryId),
    ) &&
    state.users.every(
      (u) =>
        typeof u.email === "string" &&
        typeof u.username === "string" &&
        typeof u.password === "string" &&
        ["USER", "ADMIN"].includes(u.role),
    ) &&
    state.orders.every(
      (o) =>
        ["AddingItem", "Processing", "Preparing", "Shipping", "Done"].includes(
          o.status,
        ) &&
        state.users.some((u) => u.id === o.userId) &&
        typeof o.totalPrice === "string" &&
        /^\d+$/.test(o.totalPrice) &&
        Array.isArray(o.items) &&
        o.items.every(
          (i) =>
            typeof i.id === "string" &&
            typeof i.productId === "string" &&
            Number.isSafeInteger(i.quantity) &&
            i.quantity > 0 &&
            typeof i.unitPrice === "string" &&
            /^\d+$/.test(i.unitPrice) &&
            !!i.product &&
            typeof i.product.name === "string",
        ),
    ) &&
    state.stores.every(
      (s) => typeof s.name === "string" && typeof s.address === "string",
    ) &&
    Array.isArray(state.consultation) &&
    state.consultation.every(
      (p) =>
        typeof p.id === "string" &&
        typeof p.isActive === "boolean" &&
        Array.isArray(p.usages) &&
        Array.isArray(p.specs) &&
        p.reasons &&
        typeof p.reasons === "object",
    ) &&
    isValidBorrowing(state) &&
    isValidReviews(state)
  );
}

function isValidReviews(state: MockState): boolean {
  return (
    Array.isArray(state.reviews) &&
    Number.isSafeInteger(state.nextReviewId) &&
    state.nextReviewId > 0 &&
    new Set(state.reviews.map((review) => review?.ReviewID)).size === state.reviews.length &&
    state.reviews.every((review) =>
      review &&
      Number.isSafeInteger(review.ReviewID) &&
      review.ReviewID > 0 &&
      review.ReviewID < state.nextReviewId &&
      state.users.some((user) => user.id === review.UserID) &&
      state.products.some((book) => book.id === review.BookID) &&
      Number.isInteger(review.Rating) &&
      review.Rating >= 1 && review.Rating <= 5 &&
      (review.Comment === null || typeof review.Comment === "string") &&
      typeof review.CreatedAt === "string" &&
      Number.isFinite(Date.parse(review.CreatedAt)),
    )
  );
}

function migrateReviews(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const state = value as MockState;
  if (state.version === 1 && state.reviews === undefined &&
      Array.isArray(state.products) && Array.isArray(state.users)) {
    state.reviews = structuredClone(seed.reviews).filter((review) =>
      state.products.some((book) => book?.id === review.BookID) &&
      state.users.some((user) => user?.id === review.UserID),
    );
    state.nextReviewId = seed.nextReviewId;
  }
  return state;
}

function isValidBorrowing(state: MockState): boolean {
  const data = state.borrowing;
  if (!data || !Array.isArray(data.inventory) || !Array.isArray(data.loans))
    return false;
  if (
    new Set(data.inventory.map((i) => i?.productId)).size !==
      data.inventory.length ||
    new Set(data.loans.map((l) => l?.id)).size !== data.loans.length
  )
    return false;
  return (
    data.inventory.every(
      (i) =>
        i &&
        typeof i.productId === "string" &&
        state.products.some((p) => p.id === i.productId) &&
        Number.isSafeInteger(i.totalCopies) &&
        i.totalCopies >= 0 &&
        typeof i.borrowable === "boolean",
    ) &&
    data.loans.every(
      (l) =>
        l &&
        typeof l.id === "string" &&
        state.users.some((u) => u.id === l.userId) &&
        state.products.some((p) => p.id === l.productId) &&
        Object.hasOwn(LOAN_STATUS_LABEL, l.status) &&
        typeof l.bookName === "string" &&
        typeof l.contactName === "string" &&
        typeof l.phone === "string" &&
        typeof l.pickupDate === "string" &&
        [7, 14, 30].includes(l.durationDays) &&
        Number.isFinite(Date.parse(l.createdAt)) &&
        (l.dueDate === null || /^\d{4}-\d{2}-\d{2}$/.test(l.dueDate)) &&
        Array.isArray(l.timeline) &&
        l.timeline.every(
          (e) =>
            e &&
            Object.hasOwn(LOAN_STATUS_LABEL, e.status) &&
            typeof e.note === "string" &&
            Number.isFinite(Date.parse(e.at)),
        ),
    )
  );
}

// Add the borrowing collections to previously saved v1 databases without resetting commerce data.
function migrateBorrowing(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const state = value as MockState;
  if (
    state.version === 1 &&
    state.borrowing === undefined &&
    Array.isArray(state.products) &&
    Array.isArray(state.users) &&
    Array.isArray(state.stores)
  ) {
    const data = structuredClone(seed.borrowing);
    state.borrowing = {
      inventory: data.inventory.filter((i) =>
        state.products.some((p) => p?.id === i.productId),
      ),
      loans: data.loans.filter(
        (l) =>
          state.products.some((p) => p?.id === l.productId) &&
          state.users.some((u) => u?.id === l.userId) &&
          state.stores.some((s) => s?.id === l.storeId),
      ),
    };
  }
  return state;
}

export function readMockState(): MockState {
  if (typeof window === "undefined") return cloneSeed();
  try {
    const saved = localStorage.getItem(MOCK_STORAGE_KEY);
    if (!saved) return cloneSeed();
    const parsed: unknown = migrateReviews(migrateBorrowing(JSON.parse(saved)));
    if (!isValid(parsed)) throw new Error("Invalid database");
    return parsed;
  } catch {
    setWarning(
      "Không đọc được dữ liệu đã lưu. BookStore đang dùng dữ liệu mẫu; hãy đặt lại dữ liệu demo nếu cần.",
    );
    return cloneSeed();
  }
}

export function writeMockState(state: MockState) {
  if (typeof window === "undefined")
    throw new Error("Thao tác demo cần được thực hiện trong trình duyệt.");
  try {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(state));
  } catch {
    const message =
      "Không thể lưu thay đổi: trình duyệt chặn lưu trữ hoặc đã hết dung lượng. Hãy giảm kích thước ảnh hoặc giải phóng dữ liệu demo.";
    setWarning(message);
    throw new Error(message);
  }
  setWarning("");
  window.dispatchEvent(new Event(MOCK_EVENT));
}

export function hydrateCategory(
  state: MockState,
  category: Category,
): Category {
  return {
    ...category,
    parent: state.parents.find((p) => p.id === category.parentId)!,
  };
}

export function hydrateProduct(state: MockState, product: Product): Product {
  const category = state.categories.find((c) => c.id === product.categoryId)!;
  return { ...product, category: hydrateCategory(state, category) };
}

export function publicUser(user: DemoUser): User {
  const { password: _password, ...safe } = user;
  return safe;
}
