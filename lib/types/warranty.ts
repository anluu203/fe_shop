export type WarrantyStatus = "received" | "checking" | "repairing" | "completed";
export type CoverageStatus = "active" | "expired" | "unknown" | "not_covered" | "not_started";

export interface WarrantyProduct {
  id: string;
  catalogProductId: string;
  orderItemId: string;
  unitNumber: number;
  name: string;
  serial: string | null;
  orderCode: string;
  purchasedAt: string;
  expiresAt: string | null;
  warrantyMonths: number | null;
  coverageStatus: CoverageStatus;
  canRequest: boolean;
  activeRequestId: string | null;
  ownerId?: string;
}

export interface WarrantyRequest {
  id: string;
  ticketCode: string;
  productId: string | null;
  catalogProductId: string;
  contactName: string;
  phone: string;
  description: string;
  status: WarrantyStatus;
  createdAt: string;
  updatedAt: string;
  product: {
    id: string | null;
    catalogProductId: string;
    name: string;
    serial: string | null;
    orderCode: string | null;
    purchasedAt: string | null;
    expiresAt: string | null;
    warrantyMonths: number | null;
  };
  timeline: { status: WarrantyStatus; date: string; note: string }[];
  ownerId?: string | null;
}

export interface WarrantyRequestInput {
  productId: string;
  contactName: string;
  phone: string;
  description: string;
}

export interface WarrantyProductQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  coverage?: CoverageStatus | "all";
}

export interface WarrantyRequestQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: WarrantyStatus;
  productId?: string;
}

export type WarrantyStats = Record<WarrantyStatus, number> & { totalCount: number };
