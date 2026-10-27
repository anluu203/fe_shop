import { ApiRequestError } from "../api/client";
import type { CoverageStatus, WarrantyRequestInput, WarrantyStatus } from "../types/warranty";

export const WARRANTY_STATUS_FLOW: WarrantyStatus[] = ["received", "checking", "repairing", "completed"];
export const WARRANTY_STATUS_LABEL: Record<WarrantyStatus, string> = {
  received: "Đã tiếp nhận", checking: "Đang kiểm tra", repairing: "Đang sửa chữa", completed: "Hoàn tất",
};
export const COVERAGE_LABEL: Record<CoverageStatus, string> = {
  active: "Còn hạn bảo hành", expired: "Hết hạn bảo hành", unknown: "Chưa xác định",
  not_covered: "Không có bảo hành", not_started: "Chưa bắt đầu bảo hành",
};

export function validateWarrantyInput(input: WarrantyRequestInput) {
  const errors: Partial<Record<keyof WarrantyRequestInput, string>> = {};
  if (!input.contactName.trim() || input.contactName.trim().length > 200) {
    errors.contactName = "Tên liên hệ phải có từ 1 đến 200 ký tự.";
  }
  if (!/^(?:0\d{9}|\+84\d{9})$/.test(input.phone.replace(/[\s.-]/g, ""))) {
    errors.phone = "Nhập số điện thoại gồm 10 chữ số, bắt đầu bằng 0 hoặc dùng +84.";
  }
  if (!input.description.trim() || input.description.trim().length > 2000) {
    errors.description = "Mô tả lỗi phải có từ 1 đến 2000 ký tự.";
  }
  return errors;
}

export function warrantyErrorMessage(error: unknown) {
  if (error instanceof ApiRequestError) {
    if (error.status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    if (error.status === 403) return "Bạn không có quyền thực hiện thao tác này.";
  }
  return error instanceof Error ? error.message : "Không thể kết nối dịch vụ bảo hành. Vui lòng thử lại.";
}
