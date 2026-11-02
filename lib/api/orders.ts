import { api, apiRequest } from "./client";
import type { AddCartItemBody, CheckoutBody, Order, UpdateCartItemBody } from "../types";

export const orderApi = {
  // --- Cart ---
  getCart: () => api.get<Order>("/orders/cart"),

  addItem: (body: AddCartItemBody) =>
    api.post<Order>("/orders/cart/items", body),

  updateItem: (itemId: string, body: UpdateCartItemBody) =>
    api.patch<Order>(`/orders/cart/items/${itemId}`, body),

  removeItem: (itemId: string) =>
    api.delete<Order>(`/orders/cart/items/${itemId}`),

  clearCart: () => api.delete("/orders/cart"),

  checkout: (body?: CheckoutBody, key?: string) => apiRequest<Order>("/orders/checkout", { method: "POST", headers: key ? { "Idempotency-Key": key } : undefined, body: body ? JSON.stringify(body) : undefined }),
  cancel: (id: string) => api.post<Order>(`/orders/${id}/cancel`),

  // --- Order history ---
  getHistory: () => api.get<Order[]>("/orders"),

  getOne: (id: string) => api.get<Order>(`/orders/${id}`),
};
