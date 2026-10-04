import { api } from "./client";
import type { Page, Product, ProductBody, ProductQuery } from "../types";

export const productApi = {
  getAll: (query?: ProductQuery) =>
    api.get<Page<Product>>("/products", {
      page: query?.page,
      pageSize: query?.pageSize,
      search: query?.search,
      categoryId: query?.categoryId,
    }),

  getOne: (id: string) => api.get<Product>(`/products/${id}`),

  create: (body: ProductBody) => api.post<Product>("/products", body),

  update: (id: string, body: Partial<ProductBody>) =>
    api.patch<Product>(`/products/${id}`, body),

  /** Ẩn sản phẩm (isActive = false) — không xóa vật lý */
  hide: (id: string) => api.delete(`/products/${id}`),
};
