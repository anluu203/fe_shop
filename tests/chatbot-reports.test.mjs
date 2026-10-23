import test from "node:test";
import assert from "node:assert/strict";
import { browserModules, memoryStorage } from "./helpers.mjs";

const ADMIN = "bookstore-demo:user-admin",
  READER = "bookstore-demo:user-reader";
function setup(storage = memoryStorage(), options) {
  const runtime = browserModules(storage, options);
  const { mockRequest } = runtime.load("lib/mock/request.ts");
  const call = (path, method = "GET", body, params = {}, token = null) =>
    mockRequest(
      path,
      method,
      body === undefined ? undefined : JSON.stringify(body),
      params,
      token,
    );
  return { ...runtime, call };
}
const sessionId = "test-session-123";
const query = { from: "2026-10-01", to: "2026-10-31", period: "day" };

test("chatbot public config exposes no prompt, and administration/report endpoints enforce roles", async () => {
  const { call } = setup();
  const config = await call("/chatbot/config");
  assert.deepEqual(Object.keys(config).sort(), [
    "botName",
    "enabled",
    "supportContact",
    "welcomeMessage",
  ]);
  for (const path of [
    "/admin/chatbot/config",
    "/admin/chatbot/logs",
    "/admin/reports/revenue",
  ]) {
    await assert.rejects(call(path), /đăng nhập/);
    await assert.rejects(call(path, "GET", undefined, query, READER), /quyền/);
    await call(path, "GET", undefined, query, ADMIN);
  }
  await assert.rejects(
    call(
      "/chatbot/messages",
      "POST",
      { sessionId, message: "Gợi ý sách" },
      {},
      "invalid",
    ),
    /đăng nhập/,
  );
});

test("demo recommendations respect live books, configured count and budget; logs persist with derived identity", async () => {
  const { call, storage } = setup();
  await call(
    "/admin/chatbot/config",
    "PATCH",
    { maxSuggestions: 2 },
    {},
    ADMIN,
  );
  const reply = await call(
    "/chatbot/messages",
    "POST",
    {
      sessionId,
      message: "Gợi ý sách thiếu nhi dưới 200k",
      userId: "user-admin",
    },
    {},
    READER,
  );
  assert.ok(reply.books.length > 0 && reply.books.length <= 2);
  assert.ok(
    reply.books.every((book) => book.isActive && Number(book.price) <= 200000),
  );
  const logs = await setup(storage).call(
    "/admin/chatbot/logs",
    "GET",
    undefined,
    {},
    ADMIN,
  );
  assert.equal(logs.length, 1);
  assert.equal(logs[0].userId, "user-reader");
  assert.equal(logs[0].question, "Gợi ý sách thiếu nhi dưới 200k");
  assert.equal(logs[0].answer, reply.answer);
  await call(`/products/${reply.books[0].id}`, "DELETE", undefined, {}, ADMIN);
  const next = await call(
    "/chatbot/messages",
    "POST",
    { sessionId, message: "Gợi ý sách thiếu nhi" },
    {},
    READER,
  );
  assert.ok(next.books.every((b) => b.id !== reply.books[0].id));
  await assert.rejects(
    call(
      "/chatbot/messages",
      "POST",
      { sessionId, message: "Tiếp tục" },
      {},
      ADMIN,
    ),
    /không thuộc/,
  );
});

test("guest support and no-match fallback create manageable logs; notes stay private", async () => {
  const { call } = setup();
  const response = await call("/chatbot/messages", "POST", {
    sessionId,
    message: "Tôi cần đổi trả đơn hàng",
  });
  assert.equal(response.needsHuman, true);
  assert.equal(response.books.length, 0);
  const [log] = await call("/admin/chatbot/logs", "GET", undefined, {}, ADMIN);
  assert.equal(log.userId, null);
  await assert.rejects(
    call(
      `/admin/chatbot/logs/${log.id}`,
      "PATCH",
      { resolved: true, adminNote: "private" },
      {},
      READER,
    ),
    /quyền/,
  );
  const updated = await call(
    `/admin/chatbot/logs/${log.id}`,
    "PATCH",
    { resolved: true, adminNote: "Đã liên hệ" },
    {},
    ADMIN,
  );
  assert.equal(updated.resolved, true);
  const fallback = await call("/chatbot/messages", "POST", {
    sessionId,
    message: "qwertyxyz",
  });
  assert.equal(fallback.needsHuman, true);
  assert.match(fallback.answer, /chưa tìm được/);
  assert.equal(fallback.adminNote, undefined);
});

test("invalid config/messages and disabled chatbot never create successful or partial writes", async () => {
  const { call, storage } = setup();
  for (const patch of [
    { maxSuggestions: 0 },
    { temperature: 3 },
    { botName: " " },
    { enabled: "true" },
    { apiKey: "secret" },
  ]) {
    await assert.rejects(
      call("/admin/chatbot/config", "PATCH", patch, {}, ADMIN),
    );
  }
  for (const message of [" ", "x".repeat(2001), 2])
    await assert.rejects(
      call("/chatbot/messages", "POST", { sessionId, message }),
    );
  await call("/admin/chatbot/config", "PATCH", { enabled: false }, {}, ADMIN);
  await assert.rejects(
    call("/chatbot/messages", "POST", { sessionId, message: "Gợi ý sách" }),
    /tạm nghỉ/,
  );
  assert.equal(
    (await call("/admin/chatbot/logs", "GET", undefined, {}, ADMIN)).length,
    0,
  );
  await call("/admin/chatbot/config", "PATCH", { enabled: true }, {}, ADMIN);
  const before = storage.getItem("bookstore:database:v1");
  storage.setItem = () => {
    throw new Error("Quota exceeded");
  };
  await assert.rejects(
    call("/chatbot/messages", "POST", { sessionId, message: "Gợi ý sách" }),
    /Không thể lưu/,
  );
  assert.equal(storage.getItem("bookstore:database:v1"), before);
});

test("old saved state adds chatbot collections without resetting commerce data", () => {
  const runtime = setup();
  const store = runtime.load("lib/mock/store.ts");
  const state = store.cloneSeed();
  delete state.aiConfig;
  delete state.chatLogs;
  state.products[0].name = "Sách đã chỉnh sửa";
  const ordersBefore = JSON.stringify(state.orders);
  runtime.storage.setItem("bookstore:database:v1", JSON.stringify(state));
  const migrated = store.readMockState();
  assert.equal(migrated.products[0].name, "Sách đã chỉnh sửa");
  assert.equal(JSON.stringify(migrated.orders), ordersBefore);
  assert.equal(migrated.aiConfig.enabled, true);
  assert.equal(migrated.chatLogs.length, 0);
});

test("ISBN/page count/discount edits validate and selling price is charged exactly once", async () => {
  const { call, load } = setup();
  const { validISBN, listPrice } = load("lib/utils/books.ts");
  assert.equal(validISBN("9780306406157"), true);
  assert.equal(validISBN("0306406152"), true);
  assert.equal(validISBN("9780306406158"), false);
  assert.equal(listPrice("80000", 20), "100000");
  assert.equal(listPrice("80000", 100), null);
  const book = await call(
    "/products/book-01",
    "PATCH",
    { isbn: "9780306406157", pageCount: 300, discount: 20, price: "80000" },
    {},
    ADMIN,
  );
  assert.equal(book.isbn, "9780306406157");
  assert.equal(book.pageCount, 300);
  for (const patch of [
    { discount: -1 },
    { discount: 101 },
    { discount: 2.123 },
    { discount: "20" },
    { isbn: "9780306406158" },
    { pageCount: 0 },
  ])
    await assert.rejects(call("/products/book-01", "PATCH", patch, {}, ADMIN));
  const cart = await call(
    "/orders/cart/items",
    "POST",
    { productId: book.id, quantity: 2 },
    {},
    READER,
  );
  assert.equal(cart.totalPrice, "160000");
});

function order(
  id,
  at,
  price = "100000",
  quantity = 1,
  status = "Done",
  productId = "book-a",
) {
  return {
    id,
    status,
    totalPrice: (BigInt(price) * BigInt(quantity)).toString(),
    completedAt: at,
    createdAt: "2020-01-01T00:00:00Z",
    items: [
      {
        productId,
        quantity,
        unitPrice: price,
        product: { name: `Snapshot ${productId}` },
      },
    ],
  };
}
test("reports use completion dates in Vietnam, include date bounds and zero buckets, and exclude unfinished orders", () => {
  const { load } = setup();
  const { buildRevenueReport } = load("lib/services/reports.ts");
  const orders = [
    order("before", "2026-09-30T16:59:59Z"),
    order("first", "2026-09-30T17:00:00Z", "50000", 2),
    order("last", "2026-10-31T16:59:59Z", "90000", 1, "Done", "book-b"),
    order("after", "2026-10-31T17:00:00Z"),
    order("pending", "2026-10-10T00:00:00Z", "999999", 1, "Shipping"),
  ];
  const report = buildRevenueReport(orders, query);
  assert.equal(report.revenue, "190000");
  assert.equal(report.orders, 2);
  assert.equal(report.quantity, 3);
  assert.equal(report.averageOrder, "95000");
  assert.equal(report.buckets.length, 31);
  assert.equal(report.buckets[0].revenue, "100000");
  assert.equal(report.buckets[30].revenue, "90000");
  assert.equal(report.buckets[1].revenue, "0");
  assert.equal(report.bestSellers[0].productId, "book-a");
  assert.equal(report.bestSellers[0].name, "Snapshot book-a");
});

test("week/month/year reports keep the same totals and handle Monday and year boundaries", () => {
  const { load } = setup();
  const { buildRevenueReport, validateReportQuery, reportCSV } = load(
    "lib/services/reports.ts",
  );
  const orders = [
    order("sun", "2026-01-04T09:00:00Z"),
    order("mon", "2026-01-05T09:00:00Z", "200000"),
    order("year", "2026-12-31T17:00:00Z", "9007199254740993"),
  ];
  const window = { from: "2026-01-01", to: "2027-01-01" };
  for (const period of ["week", "month", "year"]) {
    const report = buildRevenueReport(orders, { ...window, period });
    assert.equal(report.revenue, "9007199255040993");
    assert.equal(
      report.buckets.reduce((sum, b) => sum + BigInt(b.revenue), 0n).toString(),
      report.revenue,
    );
    if (period === "week") {
      assert.equal(report.buckets[0].key, "2025-12-29");
      assert.equal(report.buckets[1].key, "2026-01-05");
    }
    if (period === "year") {
      assert.equal(report.buckets[1].revenue, "9007199254740993");
    }
    const csv = reportCSV({
      ...report,
      bestSellers: [{ name: '=HYPERLINK("bad")', quantity: 1, revenue: "1" }],
    });
    assert.ok(csv.startsWith("\uFEFF"));
    assert.ok(csv.includes("'="));
  }
  for (const invalid of [
    { ...query, from: "2026-02-30" },
    { ...query, to: "2026-09-01" },
    { ...query, period: "wrong" },
    { ...query, from: "2000-01-01" },
  ])
    assert.throws(() => validateReportQuery(invalid));
  const empty = buildRevenueReport([], query);
  assert.equal(empty.revenue, "0");
  assert.equal(empty.averageOrder, "0");
  assert.equal(empty.bestSellers.length, 0);
});

test("marking Done recognizes revenue once and later same-status writes keep the completion date", async () => {
  const { call, storage } = setup();
  const state = JSON.parse(
    storage.getItem("bookstore:database:v1") ??
      JSON.stringify(setup().load("lib/mock/store.ts").cloneSeed()),
  );
  state.orders[0].status = "Shipping";
  storage.setItem("bookstore:database:v1", JSON.stringify(state));
  const first = await call(
    `/admin/orders/${state.orders[0].id}/status`,
    "PATCH",
    { status: "Done" },
    {},
    ADMIN,
  );
  assert.ok(first.completedAt);
  const second = await call(
    `/admin/orders/${state.orders[0].id}/status`,
    "PATCH",
    { status: "Done" },
    {},
    ADMIN,
  );
  assert.equal(first.completedAt, second.completedAt);
  const report = await call(
    "/admin/reports/revenue",
    "GET",
    undefined,
    query,
    ADMIN,
  );
  assert.equal(report.revenue, "588000");
});
