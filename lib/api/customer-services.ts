import { api } from "./client";
import type { AdminWarrantyRequest, ConsultationProduct, ConsultationQuery, CustomerServicesData, ManagedConsultationProduct, WarrantyProduct, WarrantyRequest, WarrantyRequestInput, WarrantyStatus } from "../types/customer-services";

export type ConsultationInput = { bookId: string; component: ConsultationProduct["component"]; usages: ConsultationProduct["usages"]; specs: string[]; reasons: ConsultationProduct["reasons"]; isActive: boolean };
export type ReturnUpdate = { status: WarrantyStatus; note: string; resolution?: "exchange" | "refund"; restockQuantity?: number; replacementBookId?: string; refundConfirmed?: boolean };
export const consultationApi = {
  options: () => api.get<Pick<CustomerServicesData, "usages" | "components">>("/consultation/options"),
  recommend: (query: ConsultationQuery) => api.get<ConsultationProduct[]>("/consultation/recommendations", { ...query }),
  list: () => api.get<ManagedConsultationProduct[]>("/admin/consultation/products"),
  create: (body: ConsultationInput) => api.post<ManagedConsultationProduct>("/admin/consultation/products", body),
  update: (id: string, body: Partial<ConsultationInput>) => api.patch<ManagedConsultationProduct>(`/admin/consultation/products/${id}`, body),
};
export const returnsApi = {
  eligible: () => api.get<WarrantyProduct[]>("/returns/eligible-items"),
  mine: () => api.get<WarrantyRequest[]>("/returns"),
  create: (body: WarrantyRequestInput & { quantity: number }) => api.post<WarrantyRequest>("/returns", body),
  all: () => api.get<AdminWarrantyRequest[]>("/admin/returns"),
  update: (id: string, body: ReturnUpdate) => api.patch<AdminWarrantyRequest>(`/admin/returns/${id}/status`, body),
};
