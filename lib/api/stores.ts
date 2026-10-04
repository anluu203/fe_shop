import { api } from "./client";
import type { Store, StoreBody } from "../types";

export const storeApi = {
  getAll: () => api.get<Store[]>("/stores"),

  getOne: (id: string) => api.get<Store | null>(`/stores/${id}`),

  create: (body: StoreBody) => api.post<Store>("/stores", body),

  /** PATCH — gửi một phần fields */
  update: (id: string, body: Partial<StoreBody>) =>
    api.patch<unknown>(`/stores/${id}`, body),

  delete: (id: string) => api.delete<unknown>(`/stores/${id}`),
};
