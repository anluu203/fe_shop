// =============================================
// Format utilities
// =============================================

/**
 * Format giá tiền VND từ string bigint
 * VD: "8000000" → "8.000.000 ₫"
 */
export function formatPrice(priceStr: string | number): string {
  if (typeof priceStr === "string" && /^\d+$/.test(priceStr)) return BigInt(priceStr).toLocaleString("vi-VN") + " ₫";
  const num = typeof priceStr === "string" ? parseInt(priceStr, 10) : priceStr;
  if (isNaN(num)) return "0 ₫";
  return num.toLocaleString("vi-VN") + " ₫";
}

/**
 * Format ISO date string thành ngày giờ Việt Nam
 * VD: "2024-01-15T10:30:00Z" → "15/01/2024 17:30"
 */
export function formatDate(isoStr: string): string {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format chỉ ngày (không giờ)
 */
export function formatDateOnly(isoStr: string): string {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Rút gọn UUID để hiển thị
 * VD: "a1b2c3d4-..." → "#a1b2c3"
 */
export function shortId(id: string): string {
  return "#" + id.replace(/-/g, "").slice(0, 7).toUpperCase();
}

/**
 * Tính tổng số lượng items trong giỏ
 */
export function cartItemCount(items: { quantity: number }[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}
