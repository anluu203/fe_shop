export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";
export const AUTH_TOKEN_KEY = USE_MOCK
  ? "bookstore:access-token:v1"
  : "accessToken";
export const MOCK_STORAGE_KEY = "bookstore:database:v1";
export const MOCK_EVENT = "bookstore:data-changed";
export const MOCK_WARNING_EVENT = "bookstore:storage-warning";

export function subscribeMockData(listener: () => void) {
  window.addEventListener(MOCK_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(MOCK_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}
