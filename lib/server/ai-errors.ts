import "server-only";

// Never return upstream error bodies: they can contain request or account details.
export function aiFailure(error: unknown) {
  const details = error && typeof error === "object" ? error as { status?: unknown; name?: unknown } : {};
  const upstreamStatus = typeof details.status === "number" ? details.status : undefined;
  const suffix = " Câu hỏi chưa được lưu.";
  if (upstreamStatus === 503) return {
    status: 503, code: "AI_BUSY", upstreamStatus,
    message: "Dịch vụ AI đang quá tải hoặc tạm thời không khả dụng. Vui lòng thử lại sau." + suffix,
  };
  if (upstreamStatus === 429) return {
    status: 503, code: "AI_QUOTA", upstreamStatus,
    message: "Dịch vụ AI đã đạt giới hạn lượt gọi hoặc hạn mức sử dụng. Vui lòng thử lại sau hoặc liên hệ quản trị viên." + suffix,
  };
  if (upstreamStatus === 401 || upstreamStatus === 403) return {
    status: 503, code: "AI_ACCESS", upstreamStatus,
    message: "Dịch vụ AI chưa được cấp quyền truy cập. Vui lòng liên hệ quản trị viên kiểm tra API key và quyền sử dụng." + suffix,
  };
  if (upstreamStatus === 400 || upstreamStatus === 404) return {
    status: 503, code: "AI_CONFIG", upstreamStatus,
    message: "Cấu hình model hoặc yêu cầu gửi tới dịch vụ AI không được chấp nhận. Vui lòng liên hệ quản trị viên." + suffix,
  };
  if (upstreamStatus === 408 || ["TimeoutError", "AbortError", "APIConnectionTimeoutError"].includes(String(details.name))) return {
    status: 504, code: "AI_TIMEOUT", upstreamStatus,
    message: "Dịch vụ AI phản hồi quá thời gian chờ. Vui lòng thử lại." + suffix,
  };
  if (["SyntaxError", "ZodError", "AIResponseError"].includes(String(details.name))) return {
    status: 502, code: "AI_RESPONSE", upstreamStatus,
    message: "Dịch vụ AI trả về nội dung chưa đầy đủ hoặc không đúng định dạng. Vui lòng thử lại." + suffix,
  };
  return {
    status: 503, code: "AI_UNAVAILABLE", upstreamStatus,
    message: "Không kết nối được dịch vụ AI hoặc chưa nhận được phản hồi hợp lệ. Vui lòng thử lại." + suffix,
  };
}
