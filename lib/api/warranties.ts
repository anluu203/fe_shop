import { api } from "./client";
import type { Page } from "../types";
import type {
  WarrantyProduct, WarrantyProductQuery, WarrantyRequest, WarrantyRequestInput,
  WarrantyRequestQuery, WarrantyStats, WarrantyStatus,
} from "../types/warranty";

function requestParams(query?: WarrantyRequestQuery) {
  return {
    page: query?.page, pageSize: query?.pageSize, search: query?.search?.trim(),
    status: query?.status, productId: query?.productId,
  };
}

export const warrantyApi = {
  getProducts: (query?: WarrantyProductQuery) =>
    api.get<Page<WarrantyProduct>>("/warranties/products", {
      page: query?.page, pageSize: query?.pageSize, search: query?.search?.trim(), coverage: query?.coverage,
    }),
  getRequests: (query?: WarrantyRequestQuery) =>
    api.get<Page<WarrantyRequest>>("/warranties/requests", requestParams(query)),
  createRequest: (input: WarrantyRequestInput) =>
    api.post<WarrantyRequest>("/warranties/requests", {
      productId: input.productId, contactName: input.contactName.trim(),
      phone: input.phone.replace(/[\s.-]/g, ""), description: input.description.trim(),
    }),
};

export const adminWarrantyApi = {
  getRequests: (query?: WarrantyRequestQuery & { ownerId?: string }) =>
    api.get<Page<WarrantyRequest>>("/admin/warranties/requests", {
      ...requestParams(query), ownerId: query?.ownerId,
    }),
  getRequest: (id: string) => api.get<WarrantyRequest>(`/admin/warranties/requests/${id}`),
  getStats: () => api.get<WarrantyStats>("/admin/warranties/requests/stats"),
  updateRequest: (id: string, status: WarrantyStatus, note: string) =>
    api.patch<WarrantyRequest>(`/admin/warranties/requests/${id}/status`, { status, note: note.trim() }),
};
