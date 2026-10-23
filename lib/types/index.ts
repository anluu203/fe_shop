// =============================================
// TypeScript Interfaces — BookStore / nhà sách trực tuyến
// Dựa theo FE_API_HANDOFF.md
// =============================================

// ---------- Auth ----------
export interface User {
  id: string;
  username: string;
  email: string;
  role: "USER" | "ADMIN";
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface RegisterBody {
  username: string;
  email: string;
  password: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface UpdateUserBody {
  username?: string;
  avatarUrl?: string | null;
}

// ---------- Category ----------
export interface CategoryParent {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryParentBody {
  name: string;
  description?: string;
  imageUrl?: string | null;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string;
  parent: CategoryParent;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryBody {
  name: string;
  description?: string;
  parentId: string;
  imageUrl?: string | null;
}

// ---------- Product ----------
export interface Product {
  isbn?: string;
  discount?: number; // percentage; price is the final selling price
  author?: string;
  publisher?: string;
  publicationYear?: number | null;
  pageCount?: number | null;
  language?: string;
  coverType?: string;
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: string; // bigint string, VND
  categoryId: string;
  isActive: boolean;
  category: {
    id: string;
    name: string;
    description: string | null;
    parentId: string;
    parent: {
      id: string;
      name: string;
      description: string | null;
    };
    createdAt: string;
    updatedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ProductBody {
  isbn?: string;
  discount?: number;
  author?: string;
  publisher?: string;
  publicationYear?: number | null;
  pageCount?: number | null;
  language?: string;
  coverType?: string;
  name: string;
  description?: string;
  imageUrl?: string;
  price: string; // string số nguyên
  categoryId: string;
}

export interface ProductQuery {
  includeInactive?: boolean;
  parentId?: string;
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
}

// ---------- Pagination ----------
export interface Page<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

// ---------- Order / Cart ----------
export type OrderStatus =
  | "AddingItem"
  | "Processing"
  | "Preparing"
  | "Shipping"
  | "Done";

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: string; // bigint string
  product: {
    id: string;
    name: string;
    price: string;
    imageUrl?: string | null;
    isActive: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  completedAt?: string; // immutable revenue recognition date when status becomes Done
  id: string | null;
  userId?: string;
  status: OrderStatus;
  totalPrice: string;
  items: OrderItem[];
  user?: User; // chỉ có trong admin response
  createdAt?: string;
  updatedAt?: string;
}

export interface AddCartItemBody {
  productId: string;
  quantity: number;
}

export interface UpdateCartItemBody {
  quantity: number;
}

// ---------- Admin Orders ----------
export interface AdminOrderQuery {
  page?: number;
  pageSize?: number;
  status?: Exclude<OrderStatus, "AddingItem">;
}

export interface UpdateOrderStatusBody {
  status: OrderStatus;
}

// ---------- Store ----------
export interface Store {
  id: string;
  name: string;
  description: string;
  address: string;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoreBody {
  name: string;
  description: string;
  address: string;
  imageUrl: string;
}

// ---------- API Error ----------
export interface ApiError {
  message: string | string[];
  error: string;
  statusCode: number;
}

// ---------- Status flow ----------
export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "AddingItem",
  "Processing",
  "Preparing",
  "Shipping",
  "Done",
];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  AddingItem: "Đang chọn hàng",
  Processing: "Đang xử lý",
  Preparing: "Đang đóng gói",
  Shipping: "Đang giao",
  Done: "Hoàn thành",
};
