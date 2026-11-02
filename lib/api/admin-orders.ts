import { api } from "./client";
import type { AdminOrderQuery, Order, Page, UpdateOrderStatusBody } from "../types";

export const adminOrderApi = {
  getOne: (id: string) => api.get<Order>(`/admin/orders/${id}`),
  getAll: (query?: AdminOrderQuery) =>
    api.get<Page<Order>>("/admin/orders", {
      page: query?.page,
      pageSize: query?.pageSize,
      status: query?.status,
    }),

  updateStatus: (id: string, body: UpdateOrderStatusBody) =>
    api.patch<Order>(`/admin/orders/${id}/status`, body),
};
