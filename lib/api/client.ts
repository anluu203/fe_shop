// =============================================
// API Client — fetch wrapper với auto auth header
// =============================================

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | undefined>;
}

function buildUrl(
  path: string,
  params?: Record<string, string | number | undefined>
): string {
  const url = new URL(path, BASE_URL + "/");
  // path có thể bắt đầu bằng /api/v1/... hoặc chỉ /products
  const fullUrl = path.startsWith("http")
    ? new URL(path)
    : new URL(BASE_URL + (path.startsWith("/") ? path : "/" + path));

  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        fullUrl.searchParams.set(k, String(v));
      }
    });
  }
  return fullUrl.toString();
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, headers, ...rest } = options;

  const url = buildUrl(path, params);
  const token = getToken();

  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };

  if (token) {
    finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...rest,
    headers: finalHeaders,
  });

  // 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json();

  if (!response.ok) {
    const err = data as { message: string | string[]; statusCode: number };
    const message = Array.isArray(err.message)
      ? err.message.join(", ")
      : err.message ?? "Có lỗi xảy ra";
    throw new Error(message);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, params?: Record<string, string | number | undefined>) =>
    apiRequest<T>(path, { method: "GET", params }),

  post: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, {
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string) => apiRequest<T>(path, { method: "DELETE" }),
};
