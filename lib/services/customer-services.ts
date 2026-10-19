import rawData from "../../mock-data/customer-services.json";
import { MOCK_EVENT, USE_MOCK } from "../mock/config";
import { readMockState, writeMockState, getMockWarning } from "../mock/store";
import type { Product } from "../types";
import type {
  ConsultationQuery,
  ConsultationProductInput,
  ManagedConsultationProduct,
  AdminWarrantyRequest,
  CustomerServicesData,
  WarrantyProduct,
  WarrantyRequest,
  WarrantyRequestInput,
  WarrantyStatus,
  ComponentType,
} from "../types/customer-services";

// JSON provides demo seeds; browser storage holds user requests and admin edits.
// Replace this service when the warranty and consultation APIs are available.
const data = rawData as CustomerServicesData;
const sessionRequests = new Map<string, WarrantyRequest[]>();
const CATALOG_KEY = "bookstore:consultation:v1:catalog";
const SAMPLE_REQUESTS_KEY = "bookstore:admin-returns:v1:samples";
const WARRANTY_PREFIX = "bookstore:returns:v1:";
let sessionCatalog: ManagedConsultationProduct[] | null = null;
let sessionSamples: WarrantyRequest[] | null = null;

export const CUSTOMER_SERVICES_EVENT = "bookstore:customer-services-changed";

export function subscribeCustomerServices(listener: () => void) {
  window.addEventListener(CUSTOMER_SERVICES_EVENT, listener);
  window.addEventListener("storage", listener);
  window.addEventListener(MOCK_EVENT, listener);
  return () => {
    window.removeEventListener(CUSTOMER_SERVICES_EVENT, listener);
    window.removeEventListener("storage", listener);
    window.removeEventListener(MOCK_EVENT, listener);
  };
}

function notifyChange() {
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event(CUSTOMER_SERVICES_EVENT));
}

export const WARRANTY_STATUS_LABEL: Record<WarrantyStatus, string> = {
  received: "Đã tiếp nhận",
  checking: "Đang kiểm tra",
  repairing: "Đang xử lý đổi trả",
  completed: "Hoàn tất",
};

export function todayInVietnam(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function isWarrantyActive(
  product: WarrantyProduct,
  today = todayInVietnam(),
) {
  return product.purchasedAt <= today && product.expiresAt >= today;
}

export function validateWarrantyInput(input: WarrantyRequestInput) {
  const errors: Partial<Record<keyof WarrantyRequestInput, string>> = {};
  if (!input.contactName.trim())
    errors.contactName = "Vui lòng nhập tên liên hệ.";
  if (!/^(?:0\d{9}|\+84\d{9})$/.test(input.phone.replace(/[\s.-]/g, ""))) {
    errors.phone =
      "Nhập số điện thoại gồm 10 chữ số, bắt đầu bằng 0 hoặc dùng +84.";
  }
  if (!input.description.trim())
    errors.description = "Vui lòng mô tả lỗi sách.";
  return errors;
}

function storageKey(userId: string) {
  return `${WARRANTY_PREFIX}${userId}`;
}

function isRequest(value: unknown): value is WarrantyRequest {
  if (!value || typeof value !== "object") return false;
  const request = value as Partial<WarrantyRequest>;
  const validStatus = (status: unknown) =>
    typeof status === "string" &&
    Object.prototype.hasOwnProperty.call(WARRANTY_STATUS_LABEL, status);
  return (
    typeof request.id === "string" &&
    typeof request.productId === "string" &&
    data.warrantyProducts.some((product) => product.id === request.productId) &&
    typeof request.contactName === "string" &&
    typeof request.phone === "string" &&
    typeof request.description === "string" &&
    typeof request.createdAt === "string" &&
    Number.isFinite(Date.parse(request.createdAt)) &&
    validStatus(request.status) &&
    Array.isArray(request.timeline) &&
    request.timeline.every((event: unknown) => {
      if (!event || typeof event !== "object") return false;
      const entry = event as Record<string, unknown>;
      return (
        validStatus(entry.status) &&
        typeof entry.note === "string" &&
        typeof entry.date === "string" &&
        Number.isFinite(Date.parse(entry.date))
      );
    })
  );
}

export interface WarrantySnapshot {
  requests: WarrantyRequest[];
  warning: string;
}

function mergeRequests(...groups: WarrantyRequest[][]) {
  return [
    ...new Map(groups.flat().map((request) => [request.id, request])).values(),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function loadSamples(): WarrantySnapshot {
  try {
    const saved = localStorage.getItem(SAMPLE_REQUESTS_KEY);
    if (!saved)
      return { requests: sessionSamples ?? data.warrantyRequests, warning: "" };
    const parsed: unknown = JSON.parse(saved);
    if (
      !Array.isArray(parsed) ||
      !parsed.every(isRequest) ||
      parsed.length !== data.warrantyRequests.length ||
      data.warrantyRequests.some(
        (sample) =>
          !parsed.some(
            (request) =>
              request.id === sample.id &&
              request.productId === sample.productId,
          ),
      )
    ) {
      throw new Error("Invalid samples");
    }
    return { requests: sessionSamples ?? parsed, warning: "" };
  } catch {
    return {
      requests: sessionSamples ?? data.warrantyRequests,
      warning: "Không đọc được tiến độ mẫu đã lưu trên trình duyệt.",
    };
  }
}

export function validateConsultationProduct(
  input: ConsultationProductInput,
): string {
  if (!input.name.trim()) return "Vui lòng nhập tên sách.";
  if (!Number.isSafeInteger(input.price) || input.price <= 0)
    return "Giá phải là số nguyên lớn hơn 0.";
  if (!data.components.some((item) => item.id === input.component))
    return "Loại sách không hợp lệ.";
  if (
    !input.usages.length ||
    input.usages.some((usage) => !data.usages.some((item) => item.id === usage))
  )
    return "Chọn ít nhất một nhu cầu sử dụng hợp lệ.";
  if (!input.specs.length || input.specs.some((spec) => !spec.trim()))
    return "Nhập ít nhất một thông số sách.";
  if (input.usages.some((usage) => !input.reasons[usage]?.trim()))
    return "Nhập lý do phù hợp cho từng nhu cầu đã chọn.";
  return "";
}

function isCatalogProduct(value: unknown): value is ManagedConsultationProduct {
  if (!value || typeof value !== "object") return false;
  const item = value as ManagedConsultationProduct;
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.price === "number" &&
    typeof item.isActive === "boolean" &&
    Array.isArray(item.usages) &&
    Array.isArray(item.specs) &&
    item.specs.every((spec) => typeof spec === "string") &&
    !!item.reasons &&
    typeof item.reasons === "object" &&
    Object.values(item.reasons).every((reason) => typeof reason === "string") &&
    !validateConsultationProduct(item)
  );
}

function loadCatalog(): {
  products: ManagedConsultationProduct[];
  warning: string;
} {
  const defaults = data.products.map((product) => ({
    ...product,
    isActive: true,
  }));
  if (USE_MOCK) {
    const state = readMockState();
    const products = (sessionCatalog ?? state.consultation).map(
      (suggestion) => {
        const book = state.products.find((p) => p.id === suggestion.id);
        return book && !sessionCatalog
          ? {
              ...suggestion,
              name: book.name,
              price: Number(book.price),
              component:
                (state.categories.find((c) => c.id === book.categoryId)
                  ?.parentId as ComponentType) ?? suggestion.component,
              isActive: suggestion.isActive && book.isActive,
            }
          : suggestion;
      },
    );
    return {
      products,
      warning: sessionCatalog
        ? "Thay đổi tư vấn chỉ được giữ trong phiên này vì không lưu được vào trình duyệt."
        : getMockWarning(),
    };
  }
  try {
    const saved = localStorage.getItem(CATALOG_KEY);
    if (!saved) return { products: sessionCatalog ?? defaults, warning: "" };
    const parsed: unknown = JSON.parse(saved);
    if (
      !Array.isArray(parsed) ||
      !parsed.every(isCatalogProduct) ||
      new Set(parsed.map((item) => item.id)).size !== parsed.length
    ) {
      throw new Error("Invalid catalog");
    }
    return { products: sessionCatalog ?? parsed, warning: "" };
  } catch {
    return {
      products: sessionCatalog ?? defaults,
      warning:
        "Không đọc được danh sách tư vấn đã lưu. Đang dùng dữ liệu khả dụng trong phiên này.",
    };
  }
}

function saveCatalog(products: ManagedConsultationProduct[]) {
  let warning = "";
  if (USE_MOCK) {
    try {
      const state = readMockState();
      for (const suggestion of products) {
        const category = state.categories.find(
          (c) => c.parentId === suggestion.component,
        );
        if (!category) throw new Error("Không tìm thấy thể loại sách.");
        const existing = state.products.find((p) => p.id === suggestion.id);
        if (existing) {
          existing.name = suggestion.name;
          existing.price = String(suggestion.price);
          existing.updatedAt = new Date().toISOString();
          if (
            state.categories.find((c) => c.id === existing.categoryId)
              ?.parentId !== suggestion.component
          ) {
            existing.categoryId = category.id;
            existing.category = category;
          }
        } else
          state.products.unshift({
            id: suggestion.id,
            name: suggestion.name,
            price: String(suggestion.price),
            description: suggestion.specs.join("\n"),
            author: suggestion.specs[0],
            imageUrl: null,
            categoryId: category.id,
            category,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as Product);
      }
      state.consultation = products;
      writeMockState(state);
      sessionCatalog = null;
    } catch {
      sessionCatalog = products;
      warning =
        "Không thể lưu vào trình duyệt. Thay đổi chỉ được giữ trong phiên này và có thể mất khi tải lại.";
    }
    notifyChange();
    return { products, warning };
  }
  try {
    localStorage.setItem(CATALOG_KEY, JSON.stringify(products));
    sessionCatalog = null;
  } catch {
    sessionCatalog = products;
    warning =
      "Không thể lưu vào trình duyệt. Thay đổi chỉ được giữ trong phiên này và có thể mất khi tải lại.";
  }
  notifyChange();
  return { products, warning };
}

export const customerServices = {
  getConsultationOptions: () => ({
    usages: data.usages,
    components: data.components,
  }),
  recommend: ({ usage, component, budget }: ConsultationQuery) => {
    if (!Number.isSafeInteger(budget) || budget <= 0) return [];
    return loadCatalog()
      .products.filter(
        (product) =>
          product.isActive &&
          product.component === component &&
          product.usages.includes(usage) &&
          product.price <= budget,
      )
      .sort((a, b) => a.price - b.price);
  },
  getWarrantyProducts: () => data.warrantyProducts,
  loadWarrantyRequests(userId: string): WarrantySnapshot {
    let stored: WarrantyRequest[] = [];
    let warning = "";
    try {
      const saved = localStorage.getItem(storageKey(userId));
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (!Array.isArray(parsed) || !parsed.every(isRequest))
          throw new Error("Invalid demo data");
        stored = parsed;
      }
    } catch {
      warning =
        "Không đọc được dữ liệu đã lưu. Các yêu cầu mới sẽ được giữ trong phiên hiện tại nếu trình duyệt không cho phép lưu.";
    }
    const samples = loadSamples();
    return {
      requests: mergeRequests(
        samples.requests,
        stored,
        sessionRequests.get(userId) ?? [],
      ),
      warning: [warning, samples.warning].filter(Boolean).join(" "),
    };
  },
  createWarrantyRequest(
    userId: string,
    input: WarrantyRequestInput,
  ): WarrantySnapshot & { request: WarrantyRequest } {
    if (!userId) throw new Error("Vui lòng đăng nhập để gửi yêu cầu.");
    const errors = validateWarrantyInput(input);
    const firstError = Object.values(errors)[0];
    if (firstError) throw new Error(firstError);
    const product = data.warrantyProducts.find(
      (item) => item.id === input.productId,
    );
    if (!product || !isWarrantyActive(product))
      throw new Error("Sách không còn trong thời hạn đổi trả.");
    const current = customerServices.loadWarrantyRequests(userId);
    if (
      current.requests.some(
        (request) =>
          request.productId === input.productId &&
          request.status !== "completed",
      )
    ) {
      throw new Error("Sách đã có yêu cầu đổi trả đang xử lý.");
    }
    const createdAt = new Date().toISOString();
    const request: WarrantyRequest = {
      id: `DT-${crypto.randomUUID().toUpperCase()}`,
      productId: input.productId,
      contactName: input.contactName.trim(),
      phone: input.phone.replace(/[\s.-]/g, ""),
      description: input.description.trim(),
      status: "received",
      createdAt,
      timeline: [
        {
          status: "received",
          date: createdAt,
          note: "Đã ghi nhận yêu cầu đổi trả minh họa.",
        },
      ],
    };
    const samples = new Set(data.warrantyRequests.map((item) => item.id));
    const ownRequests = [
      request,
      ...current.requests.filter((item) => !samples.has(item.id)),
    ];
    // Retain successful submissions even when storage is blocked or full.
    sessionRequests.set(userId, ownRequests);
    let warning = "";
    try {
      localStorage.setItem(storageKey(userId), JSON.stringify(ownRequests));
      sessionRequests.delete(userId);
    } catch {
      warning =
        "Không thể lưu vào trình duyệt. Yêu cầu đã được ghi nhận trong phiên này, nhưng có thể mất khi tải lại trang.";
    }
    notifyChange();
    return {
      request,
      requests: mergeRequests(loadSamples().requests, ownRequests),
      warning,
    };
  },
};

export const WARRANTY_STATUS_FLOW: WarrantyStatus[] = [
  "received",
  "checking",
  "repairing",
  "completed",
];

export const adminCustomerServices = {
  loadConsultationProducts: loadCatalog,
  saveConsultationProduct(input: ConsultationProductInput, id?: string) {
    const error = validateConsultationProduct(input);
    if (error) throw new Error(error);
    const current = loadCatalog().products;
    if (id && !current.some((item) => item.id === id))
      throw new Error("Không tìm thấy sách cần sửa.");
    const product: ManagedConsultationProduct = {
      ...input,
      id: id ?? `demo-${crypto.randomUUID()}`,
      name: input.name.trim(),
      usages: [...new Set(input.usages)],
      specs: input.specs.map((spec) => spec.trim()),
      reasons: Object.fromEntries(
        input.usages.map((usage) => [usage, input.reasons[usage]!.trim()]),
      ),
    };
    return saveCatalog(
      id
        ? current.map((item) => (item.id === id ? product : item))
        : [...current, product],
    );
  },
  setConsultationProductActive(id: string, isActive: boolean) {
    const current = loadCatalog().products;
    if (!current.some((item) => item.id === id))
      throw new Error("Không tìm thấy sách.");
    return saveCatalog(
      current.map((item) => (item.id === id ? { ...item, isActive } : item)),
    );
  },
  loadWarrantyRequests(): {
    requests: AdminWarrantyRequest[];
    warning: string;
  } {
    const samples = loadSamples();
    const owners = new Set(sessionRequests.keys());
    let warning = samples.warning;
    try {
      for (let index = 0; index < localStorage.length; index++) {
        const key = localStorage.key(index);
        if (key?.startsWith(WARRANTY_PREFIX))
          owners.add(key.slice(WARRANTY_PREFIX.length));
      }
    } catch {
      warning =
        "Không đọc được toàn bộ dữ liệu trình duyệt; chỉ hiển thị phiếu mẫu và dữ liệu trong phiên.";
    }
    const requests: AdminWarrantyRequest[] = samples.requests.map(
      (request) => ({ ...request, ownerId: null }),
    );
    const sampleIds = new Set(data.warrantyRequests.map((item) => item.id));
    for (const ownerId of owners) {
      const result = customerServices.loadWarrantyRequests(ownerId);
      if (result.warning) warning = result.warning;
      requests.push(
        ...result.requests
          .filter((request) => !sampleIds.has(request.id))
          .map((request) => ({ ...request, ownerId })),
      );
    }
    return {
      requests: requests.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      warning,
    };
  },
  updateWarrantyRequest(
    ownerId: string | null,
    requestId: string,
    status: WarrantyStatus,
    note: string,
  ) {
    const current =
      ownerId === null
        ? loadSamples().requests
        : customerServices.loadWarrantyRequests(ownerId).requests;
    const request = current.find((item) => item.id === requestId);
    if (
      !request ||
      (ownerId !== null &&
        data.warrantyRequests.some((sample) => sample.id === requestId))
    )
      throw new Error("Không tìm thấy phiếu đổi trả.");
    const from = WARRANTY_STATUS_FLOW.indexOf(request.status);
    const to = WARRANTY_STATUS_FLOW.indexOf(status);
    if (request.status === "completed")
      throw new Error("Phiếu đã hoàn tất, không thể cập nhật tiếp.");
    if (to < from || to > from + 1)
      throw new Error(
        "Chỉ được giữ nguyên trạng thái hoặc chuyển sang bước xử lý tiếp theo.",
      );
    if (!note.trim()) throw new Error("Vui lòng nhập ghi chú xử lý.");
    const updated: WarrantyRequest = {
      ...request,
      status,
      timeline: [
        ...request.timeline,
        { status, date: new Date().toISOString(), note: note.trim() },
      ],
    };
    const sampleIds = new Set(data.warrantyRequests.map((sample) => sample.id));
    const requests = current
      .filter((item) => ownerId === null || !sampleIds.has(item.id))
      .map((item) => (item.id === requestId ? updated : item));
    let warning = "";
    try {
      localStorage.setItem(
        ownerId === null ? SAMPLE_REQUESTS_KEY : storageKey(ownerId),
        JSON.stringify(requests),
      );
      if (ownerId === null) sessionSamples = null;
      else sessionRequests.delete(ownerId);
    } catch {
      if (ownerId === null) sessionSamples = requests;
      else sessionRequests.set(ownerId, requests);
      warning =
        "Không thể lưu vào trình duyệt. Tiến độ mới chỉ được giữ trong phiên này và có thể mất khi tải lại.";
    }
    notifyChange();
    return { ...adminCustomerServices.loadWarrantyRequests(), warning };
  },
};
