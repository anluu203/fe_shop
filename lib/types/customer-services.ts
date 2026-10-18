export type Usage = "office" | "gaming" | "creative";
export type ComponentType = "cpu" | "gpu" | "ram" | "ssd" | "mainboard" | "psu";
export type WarrantyStatus = "received" | "checking" | "repairing" | "completed";

export interface ConsultationProduct {
  id: string;
  name: string;
  component: ComponentType;
  price: number;
  usages: Usage[];
  specs: string[];
  reasons: Partial<Record<Usage, string>>;
}

export interface ManagedConsultationProduct extends ConsultationProduct {
  isActive: boolean;
}

export type ConsultationProductInput = Omit<ManagedConsultationProduct, "id">;

export interface AdminWarrantyRequest extends WarrantyRequest {
  // null identifies the shared JSON sample, rather than a real account.
  ownerId: string | null;
}

export interface WarrantyProduct {
  id: string;
  name: string;
  serial: string;
  orderCode: string;
  purchasedAt: string;
  expiresAt: string;
}

export interface WarrantyEvent {
  status: WarrantyStatus;
  date: string;
  note: string;
}

export interface WarrantyRequest {
  id: string;
  productId: string;
  contactName: string;
  phone: string;
  description: string;
  status: WarrantyStatus;
  createdAt: string;
  timeline: WarrantyEvent[];
}

export interface WarrantyRequestInput {
  productId: string;
  contactName: string;
  phone: string;
  description: string;
}

export interface ConsultationQuery {
  usage: Usage;
  component: ComponentType;
  budget: number;
}

export interface CustomerServicesData {
  usages: { id: Usage; label: string; description: string; icon: string }[];
  components: { id: ComponentType; label: string; icon: string }[];
  products: ConsultationProduct[];
  warrantyProducts: WarrantyProduct[];
  warrantyRequests: WarrantyRequest[];
}
