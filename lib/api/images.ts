// =============================================
// Images API — Upload ảnh lên server
// =============================================

import { AUTH_TOKEN_KEY, USE_MOCK } from "../mock/config";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

export type ImageTarget = "avatars" | "products" | "categories";

export interface UploadImageResponse {
  imageUrl: string;
  mimeType: string;
  size: number;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(AUTH_TOKEN_KEY); } catch { return null; }
}

/**
 * Upload một file ảnh lên server.
 * Dùng multipart/form-data, field "file".
 * Không set Content-Type thủ công để browser tự thêm boundary.
 */
export async function uploadImage(
  target: ImageTarget,
  file: File
): Promise<UploadImageResponse> {
  if (USE_MOCK) {
    if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type)) throw new Error("Chỉ chấp nhận JPEG, PNG, GIF, WebP.");
    if (file.size > 2 * 1024 * 1024) throw new Error("Ảnh demo không được vượt 2 MB.");
    const imageUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Không đọc được ảnh."));
      reader.readAsDataURL(file);
    });
    return { imageUrl, mimeType: file.type, size: file.size };
  }
  const token = getToken();
  const form = new FormData();
  form.append("file", file);

  const response = await fetch(`${BASE_URL}/images/${target}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });

  if (!response.ok) {
    let message = `Upload thất bại (${response.status})`;
    try {
      const err = await response.json();
      if (err?.message) {
        message = Array.isArray(err.message)
          ? err.message.join(", ")
          : err.message;
      }
    } catch {
      // Giữ message mặc định
    }
    throw new Error(message);
  }

  return response.json();
}
