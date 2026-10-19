import test from "node:test";
import assert from "node:assert/strict";
import { browserModules, memoryStorage } from "./helpers.mjs";

const ADMIN = "bookstore-demo:user-admin";
const READER = "bookstore-demo:user-reader";
const OTHER = "bookstore-demo:user-reader-2";
const body = {
  productId: "book-02",
  storeId: "store-1",
  contactName: "  Nguyễn An  ",
  phone: "090 123 4567",
  pickupDate: "2026-10-19",
  durationDays: 14,
  customerNote: "Giữ gìn sách và trả đúng hẹn.",
};
function setup(storage = memoryStorage()) {
  const runtime = browserModules(storage);
  const { mockRequest } = runtime.load("lib/mock/request.ts");
  return {
    ...runtime,
    call: (path, method = "GET", data, token = READER, params = {}) =>
      mockRequest(
        path,
        method,
        data === undefined ? undefined : JSON.stringify(data),
        params,
        token,
      ),
  };
}

test("borrowing catalog is public, while registration and administration enforce account roles", async () => {
  const { call } = setup();
  assert.equal(
    (await call("/borrowing/books", "GET", undefined, null)).length,
    32,
  );
  await assert.rejects(
    call("/borrowing/loans", "GET", undefined, null),
    /đăng nhập/,
  );
  await assert.rejects(
    call("/borrowing/loans", "POST", body, null),
    /đăng nhập/,
  );
  await assert.rejects(call("/admin/borrowing/loans"), /quyền/);
  await assert.rejects(
    call("/admin/borrowing/inventory/book-02", "PATCH", {
      totalCopies: 5,
      borrowable: true,
    }),
    /quyền/,
  );
});

test("registration normalizes contact data, belongs to its reader, and survives reload", async () => {
  const { call, storage } = setup();
  const loan = await call("/borrowing/loans", "POST", body);
  assert.equal(loan.status, "pending");
  assert.equal(loan.contactName, "Nguyễn An");
  assert.equal(loan.phone, "0901234567");
  assert.equal(loan.timeline.length, 1);
  assert.equal(loan.dueDate, null);
  assert.ok(
    (await setup(storage).call("/borrowing/loans")).some(
      (l) => l.id === loan.id,
    ),
  );
  assert.ok(
    !(await call("/borrowing/loans", "GET", undefined, OTHER)).some(
      (l) => l.id === loan.id,
    ),
  );
  assert.ok(
    (await call("/admin/borrowing/loans", "GET", undefined, ADMIN)).some(
      (l) => l.id === loan.id,
    ),
  );
  await assert.rejects(
    call(`/borrowing/loans/${loan.id}/cancel`, "PATCH", undefined, OTHER),
    /Không tìm thấy/,
  );
});

test("invalid contact, dates, duration, inactive books and missing stores never create a loan", async () => {
  const { call } = setup();
  const before = (await call("/borrowing/loans")).length;
  for (const patch of [
    { contactName: " " },
    { phone: "123" },
    { pickupDate: "2026-10-18" },
    { pickupDate: "2026-12-01" },
    { pickupDate: "2026-02-30" },
    { durationDays: 0 },
    { durationDays: 15 },
    { storeId: "missing" },
    { productId: "missing" },
    { customerNote: "a".repeat(1001) },
  ])
    await assert.rejects(
      call("/borrowing/loans", "POST", { ...body, ...patch }),
    );
  await call("/products/book-02", "DELETE", undefined, ADMIN);
  await assert.rejects(call("/borrowing/loans", "POST", body), /chưa có bản/);
  assert.equal((await call("/borrowing/loans")).length, before);
});

test("approval reserves a copy, handover starts the due window, and return releases it", async () => {
  const { call } = setup();
  const before = (await call("/borrowing/books")).find(
    (b) => b.productId === body.productId,
  ).availableCopies;
  const loan = await call("/borrowing/loans", "POST", body);
  const change = (status, note) =>
    call(`/admin/borrowing/loans/${loan.id}`, "PATCH", { status, note }, ADMIN);
  await change("approved", "Đã giữ bản sách.");
  assert.equal(
    (await call("/borrowing/books")).find((b) => b.productId === body.productId)
      .availableCopies,
    before - 1,
  );
  const borrowed = await change("borrowed", "Đã bàn giao sách.");
  assert.equal(borrowed.dueDate, "2026-11-02");
  assert.ok(borrowed.borrowedAt);
  const returned = await change("returned", "Đã kiểm tra và nhận lại.");
  assert.ok(returned.returnedAt);
  assert.equal(returned.timeline.length, 4);
  assert.equal(
    (await call("/borrowing/books")).find((b) => b.productId === body.productId)
      .availableCopies,
    before,
  );
  await assert.rejects(change("borrowed", "Lùi bước"), /đúng thứ tự/);
});

test("pending requests cannot overbook approval; cancellation returns a reserved copy", async () => {
  const { call } = setup();
  await call(
    "/admin/borrowing/inventory/book-02",
    "PATCH",
    { totalCopies: 1, borrowable: true },
    ADMIN,
  );
  const first = await call("/borrowing/loans", "POST", body);
  const second = await call("/borrowing/loans", "POST", body, OTHER);
  assert.equal(
    (await call("/borrowing/books")).find((b) => b.productId === "book-02")
      .availableCopies,
    1,
  );
  await call(
    `/admin/borrowing/loans/${first.id}`,
    "PATCH",
    { status: "approved", note: "Giữ bản cuối." },
    ADMIN,
  );
  await assert.rejects(
    call(
      `/admin/borrowing/loans/${second.id}`,
      "PATCH",
      { status: "approved", note: "Không đủ bản." },
      ADMIN,
    ),
    /Không đủ/,
  );
  await call(`/borrowing/loans/${first.id}/cancel`, "PATCH");
  await call(
    `/admin/borrowing/loans/${second.id}`,
    "PATCH",
    { status: "approved", note: "Có bản trống sau khi hủy." },
    ADMIN,
  );
  assert.equal(
    (await call("/borrowing/books")).find((b) => b.productId === "book-02")
      .availableCopies,
    0,
  );
});

test("one active request per book and at most five active requests per reader", async () => {
  const { call } = setup();
  const account = await call(
    "/auth/register",
    "POST",
    {
      email: "borrower@bookstore.vn",
      username: "Bạn đọc",
      password: "BookStore@123",
    },
    null,
  );
  for (const productId of [
    "book-02",
    "book-03",
    "book-04",
    "book-06",
    "book-07",
  ])
    await call(
      "/borrowing/loans",
      "POST",
      { ...body, productId },
      account.accessToken,
    );
  await assert.rejects(
    call("/borrowing/loans", "POST", body, account.accessToken),
    /đã có/,
  );
  await assert.rejects(
    call(
      "/borrowing/loans",
      "POST",
      { ...body, productId: "book-08" },
      account.accessToken,
    ),
    /tối đa 5/,
  );
});

test("workflow blocks skipping, requires admin notes, and forbids readers returning themselves", async () => {
  const { call } = setup();
  const loan = await call("/borrowing/loans", "POST", body);
  const change = (status, note) =>
    call(`/admin/borrowing/loans/${loan.id}`, "PATCH", { status, note }, ADMIN);
  await assert.rejects(change("borrowed", "Bỏ bước duyệt"), /đúng thứ tự/);
  await assert.rejects(change("rejected", " "), /ghi chú/);
  await assert.rejects(change("rejected", "a".repeat(1001)), /ghi chú/);
  await change("approved", "Đồng ý cho mượn.");
  await change("borrowed", "Đã giao sách.");
  await assert.rejects(
    call(`/borrowing/loans/${loan.id}/cancel`, "PATCH"),
    /chưa nhận/,
  );
  await assert.rejects(
    call(`/admin/borrowing/loans/${loan.id}`, "PATCH", {
      status: "returned",
      note: "Tự trả",
    }),
    /quyền/,
  );
});

test("future pickup cannot be handed over early; rejected requests can be submitted again", async () => {
  const { call } = setup();
  const loan = await call("/borrowing/loans", "POST", {
    ...body,
    pickupDate: "2026-10-20",
  });
  await call(
    `/admin/borrowing/loans/${loan.id}`,
    "PATCH",
    { status: "approved", note: "Hẹn ngày mai." },
    ADMIN,
  );
  await assert.rejects(
    call(
      `/admin/borrowing/loans/${loan.id}`,
      "PATCH",
      { status: "borrowed", note: "Chưa tới lịch." },
      ADMIN,
    ),
    /Chưa đến/,
  );
  await call(
    `/admin/borrowing/loans/${loan.id}`,
    "PATCH",
    { status: "cancelled", note: "Hủy theo yêu cầu khách." },
    ADMIN,
  );
  const next = await call("/borrowing/loans", "POST", body);
  await call(
    `/admin/borrowing/loans/${next.id}`,
    "PATCH",
    { status: "rejected", note: "Nhà sách đang bảo trì." },
    ADMIN,
  );
  assert.equal(
    (await call("/borrowing/loans", "POST", body)).status,
    "pending",
  );
});

test("inventory enforces reserved copies and can disable lending independently of sales", async () => {
  const { call } = setup();
  const loan = await call("/borrowing/loans", "POST", body);
  await call(
    `/admin/borrowing/loans/${loan.id}`,
    "PATCH",
    { status: "approved", note: "Đã giữ sách." },
    ADMIN,
  );
  await assert.rejects(
    call(
      "/admin/borrowing/inventory/book-02",
      "PATCH",
      { totalCopies: 0, borrowable: true },
      ADMIN,
    ),
    /đang giữ chỗ/,
  );
  for (const count of [-1, 1.5, 101])
    await assert.rejects(
      call(
        "/admin/borrowing/inventory/book-02",
        "PATCH",
        { totalCopies: count, borrowable: true },
        ADMIN,
      ),
      /0 đến 100/,
    );
  await call(
    "/admin/borrowing/inventory/book-03",
    "PATCH",
    { totalCopies: 2, borrowable: false },
    ADMIN,
  );
  await assert.rejects(
    call("/borrowing/loans", "POST", { ...body, productId: "book-03" }),
    /chưa có bản/,
  );
  assert.equal((await call("/products/book-03")).isActive, true);
});

test("overdue is derived, includes the full due date, and admin can filter overdue loans", async () => {
  const { call, load } = setup();
  const stateModule = load("lib/mock/store.ts");
  const state = stateModule.readMockState();
  const sample = state.borrowing.loans.find((l) => l.status === "borrowed");
  sample.dueDate = "2026-10-18";
  stateModule.writeMockState(state);
  const { isLoanOverdue } = load("lib/types/borrowing.ts");
  assert.equal(isLoanOverdue(sample, "2026-10-18"), false);
  assert.equal(isLoanOverdue(sample, "2026-10-19"), true);
  const overdue = await call(
    "/admin/borrowing/loans",
    "GET",
    undefined,
    ADMIN,
    { status: "overdue" },
  );
  assert.equal(overdue.length, 1);
  assert.equal(overdue[0].status, "borrowed");
});

test("old saved databases gain borrowing data without losing edited books, accounts or orders", async () => {
  const storage = memoryStorage();
  const runtime = setup(storage);
  const state = runtime.load("lib/mock/store.ts").cloneSeed();
  delete state.borrowing;
  state.products[0].name = "Tên đã sửa từ phiên bản cũ";
  const orders = JSON.stringify(state.orders);
  storage.setItem("bookstore:database:v1", JSON.stringify(state));
  const fresh = setup(storage);
  assert.equal(
    (await fresh.call("/products/book-01")).name,
    "Tên đã sửa từ phiên bản cũ",
  );
  assert.equal((await fresh.call("/borrowing/books")).length, 32);
  await fresh.call("/borrowing/loans", "POST", body);
  const saved = JSON.parse(storage.getItem("bookstore:database:v1"));
  assert.equal(JSON.stringify(saved.orders), orders);
  assert.equal(saved.users.length, state.users.length);
  assert.ok(saved.borrowing.loans.length > 4);
});

test("storage failure does not create ghost requests or consume inventory", async () => {
  const storage = memoryStorage();
  const { call } = setup(storage);
  storage.setItem = () => {
    throw new Error("Quota exceeded");
  };
  const before = (await call("/borrowing/loans")).length;
  await assert.rejects(call("/borrowing/loans", "POST", body), /Không thể lưu/);
  assert.equal((await call("/borrowing/loans")).length, before);
  assert.equal(
    (await call("/borrowing/books")).find((b) => b.productId === "book-02")
      .availableCopies,
    3,
  );
});
