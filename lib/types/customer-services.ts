export type Usage = "office" | "gaming" | "creative";
export type ComponentType = "cpu" | "gpu" | "ram" | "ssd" | "mainboard" | "psu";

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

export interface ConsultationQuery {
  usage: Usage;
  component: ComponentType;
  budget: number;
}

export interface CustomerServicesData {
  usages: { id: Usage; label: string; description: string; icon: string }[];
  components: { id: ComponentType; label: string; icon: string }[];
  products: ConsultationProduct[];
}
