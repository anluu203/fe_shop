import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// Exercise the real fetch wrapper and warranty adapter without a database or real credentials.
function load(responseBody = {}, status = 200, networkError) {
  const calls = [];
  const cache = new Map();
  const context = vm.createContext({
    URL, Error, window: {}, process: { env: { NEXT_PUBLIC_API_URL: "http://backend.test/api/v1" } },
    localStorage: {
      getItem(key) { assert.equal(key, "accessToken"); return "test-jwt"; },
      setItem() { assert.fail("Warranty data must never be saved in localStorage"); },
    },
    fetch: async (url, options) => {
      calls.push({ url: new URL(url), ...options });
      if (networkError) throw networkError;
      return { ok: status >= 200 && status < 300, status, json: async () => responseBody };
    },
  });
  function moduleAt(url) {
    const filename = fileURLToPath(url);
    if (cache.has(filename)) return cache.get(filename);
    const result = {};
    cache.set(filename, result);
    const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const execute = vm.runInContext(`(function (exports, require) { ${source}\n})`, context, { filename });
    execute(result, (path) => moduleAt(new URL(`${path}.ts`, url)));
    return result;
  }
  return {
    ...moduleAt(new URL("../lib/api/warranties.ts", import.meta.url)),
    ...moduleAt(new URL("../lib/api/client.ts", import.meta.url)),
    ...moduleAt(new URL("../lib/services/warranty.ts", import.meta.url)),
    calls,
  };
}

const productId = "11111111-1111-4111-8111-111111111111";
const ticketId = "22222222-2222-4222-8222-222222222222";
const input = { productId, contactName: "  Customer  ", phone: "+84 901-234.567", description: "  Cannot start  " };

test("product queries use server pagination, coverage and JWT; preserve nullable backend fields", async () => {
  const page = {
    items: [{ id: productId, serial: null, expiresAt: null, coverageStatus: "unknown", canRequest: false }],
    totalCount: 31, pageNumber: 2, pageSize: 12, totalPages: 3, hasNextPage: true, hasPreviousPage: true,
  };
  const { warrantyApi, calls } = load(page);
  assert.equal(await warrantyApi.getProducts({ page: 2, pageSize: 12, coverage: "unknown", search: "  GPU%_  " }), page);
  assert.equal(calls[0].url.pathname, "/api/v1/warranties/products");
  assert.equal(calls[0].url.searchParams.get("search"), "GPU%_");
  assert.equal(calls[0].url.searchParams.get("page"), "2");
  assert.equal(calls[0].url.searchParams.get("coverage"), "unknown");
  assert.equal(calls[0].headers.Authorization, "Bearer test-jwt");
});

test("client queries cannot select another owner and retain legacy tickets and pagination metadata", async () => {
  const page = { items: [{ id: ticketId, productId: null, ownerId: null }], totalCount: 35, totalPages: 4 };
  const { warrantyApi, calls } = load(page);
  assert.equal(await warrantyApi.getRequests({ page: 3, pageSize: 10, productId, ownerId: "other", userId: "other" }), page);
  assert.equal(calls[0].url.searchParams.get("productId"), productId);
  assert.equal(calls[0].url.searchParams.get("page"), "3");
  assert.equal(calls[0].url.searchParams.has("ownerId"), false);
  assert.equal(calls[0].url.searchParams.has("userId"), false);
});

test("submission sends only the DTO and returns backend UUID, ticket code and timeline", async () => {
  const ticket = { id: ticketId, ticketCode: `BH-${ticketId}`, status: "received", timeline: [{ status: "received" }] };
  const { warrantyApi, calls } = load(ticket, 201);
  assert.equal(await warrantyApi.createRequest({ ...input, ownerId: "other", status: "completed", serial: "FAKE" }), ticket);
  assert.equal(calls[0].url.pathname, "/api/v1/warranties/requests");
  assert.equal(calls[0].method, "POST");
  assert.deepEqual(JSON.parse(calls[0].body), {
    productId, contactName: "Customer", phone: "+84901234567", description: "Cannot start",
  });
});

test("admin lists use filters, stats stay unfiltered, and updates address UUID instead of ticketCode", async () => {
  const { adminWarrantyApi, calls } = load({ id: ticketId });
  await adminWarrantyApi.getRequests({ page: 2, pageSize: 20, status: "repairing", search: " BH-123 ", ownerId: "owner-uuid" });
  await adminWarrantyApi.getStats();
  await adminWarrantyApi.getRequest(ticketId);
  await adminWarrantyApi.updateRequest(ticketId, "checking", "  Investigating  ");
  assert.equal(calls[0].url.pathname, "/api/v1/admin/warranties/requests");
  assert.equal(calls[0].url.searchParams.get("status"), "repairing");
  assert.equal(calls[0].url.searchParams.get("ownerId"), "owner-uuid");
  assert.equal(calls[1].url.pathname, "/api/v1/admin/warranties/requests/stats");
  assert.equal(calls[1].url.search, "");
  assert.equal(calls[2].url.pathname, `/api/v1/admin/warranties/requests/${ticketId}`);
  assert.equal(calls[3].url.pathname, `/api/v1/admin/warranties/requests/${ticketId}/status`);
  assert.equal(calls[3].method, "PATCH");
  assert.deepEqual(JSON.parse(calls[3].body), { status: "checking", note: "Investigating" });
});

test("HTTP errors preserve their status and all validation messages for UI conflict/auth handling", async () => {
  for (const status of [400, 401, 403, 404, 409]) {
    const { warrantyApi, ApiRequestError } = load({ message: ["first error", "second error"] }, status);
    await assert.rejects(warrantyApi.createRequest(input), (error) =>
      error instanceof ApiRequestError && error.status === status && error.message === "first error, second error");
  }
});

test("failed network requests reject without claiming success or returning demo data", async () => {
  const { warrantyApi } = load({}, 200, new Error("Network unavailable"));
  await assert.rejects(warrantyApi.getProducts(), /Network unavailable/);
  await assert.rejects(warrantyApi.createRequest(input), /Network unavailable/);
});

test("form validation enforces backend contact/description limits and Vietnamese phone formats", () => {
  const { validateWarrantyInput } = load();
  assert.equal(Object.keys(validateWarrantyInput(input)).length, 0);
  assert.equal(Object.keys(validateWarrantyInput({ ...input, contactName: "a".repeat(200), description: "b".repeat(2000) })).length, 0);
  for (const patch of [{ contactName: " " }, { contactName: "a".repeat(201) }, { phone: "123" }, { description: " " }, { description: "b".repeat(2001) }]) {
    assert.equal(Object.keys(validateWarrantyInput({ ...input, ...patch })).length, 1);
  }
});
