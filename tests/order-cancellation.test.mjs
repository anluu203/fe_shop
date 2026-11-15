import test from "node:test";
import assert from "node:assert/strict";
import { browserModules, memoryStorage } from "./helpers.mjs";

const READER = "bookstore-demo:user-reader", ADMIN = "bookstore-demo:user-admin";
function setup(storage = memoryStorage()) {
  const runtime = browserModules(storage);
  const { mockRequest } = runtime.load("lib/mock/request.ts");
  const call = (path, method = "GET", body, token = READER) => mockRequest(path, method, body === undefined ? undefined : JSON.stringify(body), {}, token);
  return { ...runtime, call };
}

test("mock cancellation requires ownership/reason, restores deducted stock once, and persists", async () => {
  const { call, storage, load } = setup();
  const store = load("lib/mock/store.ts");
  const state = store.readMockState();
  state.products.find((book) => book.id === "book-13").stockQuantity = 5;
  store.writeMockState(state);
  await call("/orders/cart/items", "POST", { productId: "book-13", quantity: 2 });
  const order = await call("/orders/checkout", "POST", { paymentMethod: "COD" });
  assert.equal(store.readMockState().products.find((book) => book.id === "book-13").stockQuantity, 3);
  await assert.rejects(call(`/orders/${order.id}/cancel`, "POST", { note: "Không có nhu cầu" }, ADMIN), /Không tìm thấy/);
  await assert.rejects(call(`/orders/${order.id}/cancel`, "POST", { note: " " }), /lý do/);
  const cancelled = await call(`/orders/${order.id}/cancel`, "POST", { note: "Đã mua nơi khác" });
  assert.equal(cancelled.status, "Cancelled");
  await call(`/orders/${order.id}/cancel`, "POST", { note: "Đã mua nơi khác" });
  assert.equal(store.readMockState().products.find((book) => book.id === "book-13").stockQuantity, 5);
  const restored = await setup(storage).call(`/orders/${order.id}`);
  assert.equal(restored.status, "Cancelled");
  assert.equal(restored.events.filter((event) => event.status === "Cancelled").length, 1);
  await assert.rejects(call(`/admin/orders/${order.id}/status`, "PATCH", { status: "Preparing" }, ADMIN), /đã hủy/);
});

test("mock admin may cancel preparing orders; COD completion requires collection", async () => {
  const { call } = setup();
  async function place() { await call("/orders/cart/items", "POST", { productId: "book-13", quantity: 1 }); return call("/orders/checkout", "POST"); }
  const order = await place();
  await call(`/admin/orders/${order.id}/status`, "PATCH", { status: "Preparing" }, ADMIN);
  await assert.rejects(call(`/orders/${order.id}/cancel`, "POST", { note: "Hủy đơn" }), /trạng thái/);
  assert.equal((await call(`/admin/orders/${order.id}/status`, "PATCH", { status: "Cancelled", note: "Khách yêu cầu" }, ADMIN)).status, "Cancelled");
  const delivery = await place();
  for (const status of ["Preparing", "Shipping"]) await call(`/admin/orders/${delivery.id}/status`, "PATCH", { status }, ADMIN);
  await assert.rejects(call(`/admin/orders/${delivery.id}/status`, "PATCH", { status: "Done" }, ADMIN), /thu tiền COD/);
  const paid = await call(`/admin/orders/${delivery.id}/status`, "PATCH", { status: "Done", paymentCollected: true }, ADMIN);
  assert.equal(paid.paymentStatus, "PAID");
  await assert.rejects(call(`/orders/${delivery.id}/cancel`, "POST", { note: "Hủy" }), /trạng thái/);
  const methods = await call("/payments/methods"); assert.equal(methods.vnpayAvailable, false);
  await call("/orders/cart/items", "POST", { productId: "book-13", quantity: 1 });
  await assert.rejects(call("/orders/checkout", "POST", { paymentMethod: "VNPAY" }), /backend thật/);
});
