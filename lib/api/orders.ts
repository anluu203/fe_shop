import { api } from "./client";
import type { AddCartItemBody, Order, UpdateCartItemBody } from "../types";

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

  checkout: () => api.post<Order>("/orders/checkout"),

  // --- Order history ---
  getHistory: () => api.get<Order[]>("/orders"),

  getOne: (id: string) => api.get<Order>(`/orders/${id}`),
};
