import rawData from "../data/customer-services.json";
import type {
  ConsultationQuery,
  ConsultationProductInput,
  ManagedConsultationProduct,
  CustomerServicesData,
} from "../types/customer-services";

// Consultation still uses demo seeds and browser storage; warranty uses lib/api/warranties.ts.
const data = rawData as CustomerServicesData;
const CATALOG_KEY = "techparts:consultation:v1:catalog";
let sessionCatalog: ManagedConsultationProduct[] | null = null;

export const CUSTOMER_SERVICES_EVENT = "techparts:customer-services-changed";

export function subscribeCustomerServices(listener: () => void) {
  window.addEventListener(CUSTOMER_SERVICES_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CUSTOMER_SERVICES_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

function notifyChange() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CUSTOMER_SERVICES_EVENT));
}

export function validateConsultationProduct(input: ConsultationProductInput): string {
  if (!input.name.trim()) return "Vui lòng nhập tên sản phẩm.";
  if (!Number.isSafeInteger(input.price) || input.price <= 0) return "Giá phải là số nguyên lớn hơn 0.";
  if (!data.components.some((item) => item.id === input.component)) return "Loại linh kiện không hợp lệ.";
  if (!input.usages.length || input.usages.some((usage) => !data.usages.some((item) => item.id === usage))) return "Chọn ít nhất một nhu cầu sử dụng hợp lệ.";
  if (!input.specs.length || input.specs.some((spec) => !spec.trim())) return "Nhập ít nhất một thông số sản phẩm.";
  if (input.usages.some((usage) => !input.reasons[usage]?.trim())) return "Nhập lý do phù hợp cho từng nhu cầu đã chọn.";
  return "";
}

function isCatalogProduct(value: unknown): value is ManagedConsultationProduct {
  if (!value || typeof value !== "object") return false;
  const item = value as ManagedConsultationProduct;
  return typeof item.id === "string" && typeof item.name === "string" && typeof item.price === "number" &&
    typeof item.isActive === "boolean" && Array.isArray(item.usages) && Array.isArray(item.specs) &&
    item.specs.every((spec) => typeof spec === "string") && !!item.reasons && typeof item.reasons === "object" &&
    Object.values(item.reasons).every((reason) => typeof reason === "string") && !validateConsultationProduct(item);
}

function loadCatalog(): { products: ManagedConsultationProduct[]; warning: string } {
  const defaults = data.products.map((product) => ({ ...product, isActive: true }));
  try {
    const saved = localStorage.getItem(CATALOG_KEY);
    if (!saved) return { products: sessionCatalog ?? defaults, warning: "" };
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed) || !parsed.every(isCatalogProduct) || new Set(parsed.map((item) => item.id)).size !== parsed.length) {
      throw new Error("Invalid catalog");
    }
    return { products: sessionCatalog ?? parsed, warning: "" };
  } catch {
    return { products: sessionCatalog ?? defaults, warning: "Không đọc được danh sách tư vấn đã lưu. Đang dùng dữ liệu khả dụng trong phiên này." };
  }
}

function saveCatalog(products: ManagedConsultationProduct[]) {
  let warning = "";
  try {
    localStorage.setItem(CATALOG_KEY, JSON.stringify(products));
    sessionCatalog = null;
  } catch {
    sessionCatalog = products;
    warning = "Không thể lưu vào trình duyệt. Thay đổi chỉ được giữ trong phiên này và có thể mất khi tải lại.";
  }
  notifyChange();
  return { products, warning };
}

export const customerServices = {
  getConsultationOptions: () => ({ usages: data.usages, components: data.components }),
  recommend: ({ usage, component, budget }: ConsultationQuery) => {
    if (!Number.isSafeInteger(budget) || budget <= 0) return [];
    return loadCatalog().products
      .filter((product) => product.isActive && product.component === component &&
        product.usages.includes(usage) && product.price <= budget)
      .sort((a, b) => a.price - b.price);
  },
};

export const adminCustomerServices = {
  loadConsultationProducts: loadCatalog,
  saveConsultationProduct(input: ConsultationProductInput, id?: string) {
    const error = validateConsultationProduct(input);
    if (error) throw new Error(error);
    const current = loadCatalog().products;
    if (id && !current.some((item) => item.id === id)) throw new Error("Không tìm thấy sản phẩm cần sửa.");
    const product: ManagedConsultationProduct = {
      ...input, id: id ?? `demo-${crypto.randomUUID()}`, name: input.name.trim(),
      usages: [...new Set(input.usages)], specs: input.specs.map((spec) => spec.trim()),
      reasons: Object.fromEntries(input.usages.map((usage) => [usage, input.reasons[usage]!.trim()])),
    };
    return saveCatalog(id ? current.map((item) => item.id === id ? product : item) : [...current, product]);
  },
  setConsultationProductActive(id: string, isActive: boolean) {
    const current = loadCatalog().products;
    if (!current.some((item) => item.id === id)) throw new Error("Không tìm thấy sản phẩm.");
    return saveCatalog(current.map((item) => item.id === id ? { ...item, isActive } : item));
  },
};
