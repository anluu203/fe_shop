import { api } from "./client";
import type { Category, CategoryBody, CategoryParent, CategoryParentBody } from "../types";

export const categoryApi = {
  // --- Category Parents ---
  getParents: () => api.get<CategoryParent[]>("/category-parents"),

  getParent: (id: string) => api.get<CategoryParent>(`/category-parents/${id}`),

  createParent: (body: CategoryParentBody) =>
    api.post<CategoryParent>("/category-parents", body),

  updateParent: (id: string, body: Partial<CategoryParentBody>) =>
    api.patch<CategoryParent>(`/category-parents/${id}`, body),

  deleteParent: (id: string) => api.delete(`/category-parents/${id}`),

  // --- Categories ---
  getAll: (parentId?: string) =>
    api.get<Category[]>("/categories", parentId ? { parentId } : undefined),

  getOne: (id: string) => api.get<Category>(`/categories/${id}`),

  create: (body: CategoryBody) => api.post<Category>("/categories", body),

  update: (id: string, body: Partial<CategoryBody>) =>
    api.patch<Category>(`/categories/${id}`, body),

  delete: (id: string) => api.delete(`/categories/${id}`),
};
