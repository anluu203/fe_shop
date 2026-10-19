// =============================================
// Image URL helper — dùng origin backend làm base
// =============================================

import { USE_MOCK } from "../mock/config";

const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_URL
    ? new URL(process.env.NEXT_PUBLIC_API_URL).origin
    : "http://localhost:8080";

/**
 * Chuyển đổi imageUrl/avatarUrl từ backend thành URL đầy đủ để dùng trong <img src>.
 * - Đường dẫn `/images/...` → ghép với API_ORIGIN
 * - URL đầy đủ http/https → giữ nguyên
 * - null/undefined → trả undefined (hiển thị ảnh mặc định)
 */
export function imageSrc(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  if (/^data:image\/(jpeg|png|gif|webp);base64,/.test(value)) return USE_MOCK ? value : undefined;
  if (value.startsWith("/") && USE_MOCK) return value;
  try {
    return new URL(value, API_ORIGIN).href;
  } catch {
    return undefined;
  }
}
