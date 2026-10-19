import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { browserModules, memoryStorage } from "./helpers.mjs";

const ADMIN = "bookstore-demo:user-admin";
const READER = "bookstore-demo:user-reader";
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

test("all 32 seeds have real local covers, valid categories and source attribution", async () => {
  const { call } = setup();
  const page = await call("/products", "GET", undefined, { pageSize: 100 });
  const sources = JSON.parse(fs.readFileSync("mock-data/sources.json", "utf8"));
  assert.equal(page.totalCount, 32);
  assert.equal(new Set(page.items.map((p) => p.category.parentId)).size, 8);
  for (const book of page.items) {
    assert.ok(fs.existsSync(`public${book.imageUrl}`), book.name);
    assert.ok(book.author);
    assert.ok(BigInt(book.price) > 0);
    assert.ok(
      sources.some(
        (s) =>
          s.productId === book.id &&
          /^https:\/\/(nhanam\.vn|alphabooks\.vn|nxbkimdong\.com\.vn)\//.test(
            s.pageUrl,
          ),
      ),
    );
  }
});

test("mock login, registration, role checks and session restoration preserve API contracts", async () => {
  const { call, storage } = setup();
  const login = await call("/auth/login", "POST", {
    email: "admin@bookstore.vn",
    password: "BookStore@123",
  });
  assert.equal(login.user.role, "ADMIN");
  assert.equal(login.user.password, undefined);
  await assert.rejects(
    call("/auth/login", "POST", {
      email: "admin@bookstore.vn",
      password: "wrong",
    }),
    /không đúng/,
  );
  const registered = await call("/auth/register", "POST", {
    email: "new@bookstore.vn",
    username: "Bạn đọc mới",
    password: "BookStore@123",
    role: "ADMIN",
  });
  assert.equal(registered.user.role, "USER");
  await assert.rejects(
    call("/auth/register", "POST", {
      email: "new@bookstore.vn",
      username: "Duplicate",
      password: "BookStore@123",
    }),
    /đã được/,
  );
  assert.equal(
    (
      await setup(storage).call(
        "/auth/me",
        "GET",
        undefined,
        {},
        registered.accessToken,
      )
    ).user,
    undefined,
  );
  assert.equal(
    (
      await setup(storage).call(
        "/auth/me",
        "GET",
        undefined,
        {},
        registered.accessToken,
      )
    ).id,
    registered.user.id,
  );
  await assert.rejects(call("/auth/me"), /đăng nhập/);
  await assert.rejects(
    call("/admin/orders", "GET", undefined, {}, registered.accessToken),
    /quyền/,
  );
  await assert.rejects(
    call("/products/book-01", "DELETE", undefined, {}, READER),
    /quyền/,
  );
});

test("filter by parent/category and accent-free title or author before pagination", async () => {
  const { call } = setup();
  const one = await call("/products", "GET", undefined, {
    parentId: "literature",
    pageSize: 2,
  });
  const two = await call("/products", "GET", undefined, {
    parentId: "literature",
    pageSize: 2,
    page: 2,
  });
  assert.equal(one.totalCount, 4);
  assert.equal(one.totalPages, 2);
  assert.equal(two.items.length, 2);
  assert.equal(two.hasPreviousPage, true);
  assert.ok(one.items.every((p) => p.category.parentId === "literature"));
  assert.ok(!one.items.some((p) => two.items.some((q) => q.id === p.id)));
  const byAuthor = await call("/products", "GET", undefined, {
    search: "to hoai",
  });
  assert.ok(byAuthor.items.some((p) => p.id === "book-14"));
  assert.ok(
    (
      await call("/products", "GET", undefined, { search: "doan gioi" })
    ).items.some((p) => p.id === "book-03"),
  );
  const category = await call("/products", "GET", undefined, {
    categoryId: "literature-1",
  });
  assert.ok(category.items.every((p) => p.categoryId === "literature-1"));
});

test("admin CRUD and hiding share one persisted catalog with client and consultation", async () => {
  const { call, storage, load } = setup();
  const book = await call(
    "/products",
    "POST",
    {
      name: "Sách mới",
      price: "150000",
      categoryId: "literature-1",
      author: "Tác giả mẫu",
      pageCount: 250,
    },
    {},
    ADMIN,
  );
  assert.equal((await call(`/products/${book.id}`)).author, "Tác giả mẫu");
  await call(
    "/products/book-01",
    "PATCH",
    {
      name: "Tên đã cập nhật",
      price: "123000",
      publisher: "Nhà xuất bản mới",
      publicationYear: 2026,
    },
    {},
    ADMIN,
  );
  const consult = load("lib/services/customer-services.ts");
  assert.equal(
    consult.customerServices
      .recommend({
        usage: "relaxation",
        component: "literature",
        budget: 200000,
      })
      .find((p) => p.id === "book-01").price,
    123000,
  );
  assert.equal(
    (await setup(storage).call("/products/book-01")).name,
    "Tên đã cập nhật",
  );
  await call("/products/book-01", "DELETE", undefined, {}, ADMIN);
  await assert.rejects(call("/products/book-01"), /Không tìm thấy/);
  const clientView = await call(
    "/products",
    "GET",
    undefined,
    { pageSize: 100 },
    ADMIN,
  );
  assert.ok(!clientView.items.some((p) => p.id === "book-01"));
  const adminView = await call(
    "/products",
    "GET",
    undefined,
    { pageSize: 100, includeInactive: 1 },
    ADMIN,
  );
  assert.equal(adminView.items.find((p) => p.id === "book-01").isActive, false);
  assert.ok(
    !consult.customerServices
      .recommend({
        usage: "relaxation",
        component: "literature",
        budget: 200000,
      })
      .some((p) => p.id === "book-01"),
  );
});

test("category and store changes hydrate references and block deleting referenced categories", async () => {
  const { call } = setup();
  await call(
    "/category-parents/literature",
    "PATCH",
    { name: "Văn học & Truyện" },
    {},
    ADMIN,
  );
  assert.equal(
    (await call("/products/book-01")).category.parent.name,
    "Văn học & Truyện",
  );
  await assert.rejects(
    call("/category-parents/literature", "DELETE", undefined, {}, ADMIN),
    /danh mục con/,
  );
  await assert.rejects(
    call("/categories/literature-2", "DELETE", undefined, {}, ADMIN),
    /còn sách/,
  );
  const parent = await call(
    "/category-parents",
    "POST",
    { name: "Tủ sách mới" },
    {},
    ADMIN,
  );
  const cat = await call(
    "/categories",
    "POST",
    { name: "Danh mục mới", parentId: parent.id },
    {},
    ADMIN,
  );
  await call(`/categories/${cat.id}`, "DELETE", undefined, {}, ADMIN);
  await call(`/category-parents/${parent.id}`, "DELETE", undefined, {}, ADMIN);
  const store = await call(
    "/stores",
    "POST",
    {
      name: "Nhà sách mới",
      address: "Hà Nội",
      description: "Không gian đọc",
      imageUrl: "/images/bookstore.svg",
    },
    {},
    ADMIN,
  );
  await call(
    `/stores/${store.id}`,
    "PATCH",
    { name: "BookStore Hà Nội" },
    {},
    ADMIN,
  );
  assert.equal((await call(`/stores/${store.id}`)).name, "BookStore Hà Nội");
  await call(`/stores/${store.id}`, "DELETE", undefined, {}, ADMIN);
  assert.ok(!(await call("/stores")).some((s) => s.id === store.id));
});

test("cart merges quantities, calculates exact totals, isolates owners and survives reload", async () => {
  const { call, storage } = setup();
  const book = await call("/products/book-01");
  await call(
    "/orders/cart/items",
    "POST",
    { productId: book.id, quantity: 2 },
    {},
    READER,
  );
  const cart = await call(
    "/orders/cart/items",
    "POST",
    { productId: book.id, quantity: 1 },
    {},
    READER,
  );
  assert.equal(cart.items.length, 1);
  assert.equal(cart.items[0].quantity, 3);
  assert.equal(cart.totalPrice, (BigInt(book.price) * BigInt(3)).toString());
  assert.equal(
    (await call("/orders/cart", "GET", undefined, {}, ADMIN)).items.length,
    0,
  );
  assert.equal(
    (await setup(storage).call("/orders/cart", "GET", undefined, {}, READER))
      .items[0].quantity,
    3,
  );
  await call(
    `/orders/cart/items/${cart.items[0].id}`,
    "PATCH",
    { quantity: 2 },
    {},
    READER,
  );
  await assert.rejects(
    call(
      `/orders/cart/items/${cart.items[0].id}`,
      "PATCH",
      { quantity: 0 },
      {},
      READER,
    ),
    /Số lượng/,
  );
  await call(
    `/orders/cart/items/${cart.items[0].id}`,
    "DELETE",
    undefined,
    {},
    READER,
  );
  assert.equal(
    (await call("/orders/cart", "GET", undefined, {}, READER)).totalPrice,
    "0",
  );
});

test("checkout moves cart into shared orders and admin status reaches the customer", async () => {
  const { call, storage } = setup();
  await assert.rejects(
    call("/orders/checkout", "POST", undefined, {}, READER),
    /trống/,
  );
  await call(
    "/orders/cart/items",
    "POST",
    { productId: "book-13", quantity: 2 },
    {},
    READER,
  );
  const order = await call("/orders/checkout", "POST", undefined, {}, READER);
  assert.equal(order.status, "Processing");
  assert.equal(
    (await call("/orders/cart", "GET", undefined, {}, READER)).items.length,
    0,
  );
  assert.ok(
    (
      await call(
        "/admin/orders",
        "GET",
        undefined,
        { status: "Processing", pageSize: 100 },
        ADMIN,
      )
    ).items.some((o) => o.id === order.id),
  );
  await assert.rejects(
    call(
      `/admin/orders/${order.id}/status`,
      "PATCH",
      { status: "Done" },
      {},
      ADMIN,
    ),
    /bước tiếp theo/,
  );
  for (const status of ["Preparing", "Shipping", "Done"])
    await call(
      `/admin/orders/${order.id}/status`,
      "PATCH",
      { status },
      {},
      ADMIN,
    );
  assert.equal(
    (
      await setup(storage).call(
        `/orders/${order.id}`,
        "GET",
        undefined,
        {},
        READER,
      )
    ).status,
    "Done",
  );
  await assert.rejects(
    call(
      `/orders/${order.id}`,
      "GET",
      undefined,
      {},
      "bookstore-demo:user-reader-2",
    ),
    /Không tìm thấy/,
  );
  await assert.rejects(
    call(
      `/admin/orders/${order.id}/status`,
      "PATCH",
      { status: "Preparing" },
      {},
      ADMIN,
    ),
    /bước tiếp theo/,
  );
});

test("hidden books cannot be added or checked out, and price edits refresh the cart", async () => {
  const { call } = setup();
  await call(
    "/orders/cart/items",
    "POST",
    { productId: "book-01", quantity: 2 },
    {},
    READER,
  );
  await call("/products/book-01", "PATCH", { price: "76543" }, {}, ADMIN);
  assert.equal(
    (await call("/orders/cart", "GET", undefined, {}, READER)).totalPrice,
    "153086",
  );
  await call("/products/book-01", "DELETE", undefined, {}, ADMIN);
  await assert.rejects(
    call(
      "/orders/cart/items",
      "POST",
      { productId: "book-01", quantity: 1 },
      {},
      READER,
    ),
    /ngừng bán/,
  );
  await assert.rejects(
    call("/orders/checkout", "POST", undefined, {}, READER),
    /ngừng bán/,
  );
});

test("writes emit updates, other instances observe storage changes, and failures never claim success", async () => {
  const storage = memoryStorage();
  const first = setup(storage);
  const second = setup(storage);
  let events = 0;
  first.window.addEventListener("bookstore:data-changed", () => events++);
  await first.call(
    "/products/book-01",
    "PATCH",
    { name: "Tên mới" },
    {},
    ADMIN,
  );
  assert.equal(events, 1);
  assert.equal((await second.call("/products/book-01")).name, "Tên mới");
  storage.setItem = () => {
    throw new Error("Quota exceeded");
  };
  await assert.rejects(
    first.call(
      "/products/book-01",
      "PATCH",
      { name: "Không được lưu" },
      {},
      ADMIN,
    ),
    /Không thể lưu/,
  );
  assert.equal((await first.call("/products/book-01")).name, "Tên mới");
  assert.equal(events, 1);
});

test("corrupt or blocked storage falls back to valid JSON seeds and reports a warning", async () => {
  const storage = memoryStorage();
  storage.setItem("bookstore:database:v1", '{"version":1,"products":[null]}');
  const runtime = setup(storage);
  assert.equal((await runtime.call("/products")).totalCount, 32);
  assert.ok(runtime.load("lib/mock/store.ts").getMockWarning());
  const blocked = setup({
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
  });
  assert.equal((await blocked.call("/products")).totalCount, 32);
  await assert.rejects(
    blocked.call("/products/book-01", "PATCH", { price: "1000" }, {}, ADMIN),
    /Không thể lưu/,
  );
});

test("existing api wrapper selects mock by default and HTTP when explicitly disabled", async () => {
  const mock = setup();
  const api = mock.load("lib/api/client.ts").api;
  assert.equal(
    (await api.get("/products", { parentId: "manga" })).totalCount,
    4,
  );
  let requested;
  const live = setup(memoryStorage(), {
    mock: false,
    fetch: async (url, options) => {
      requested = { url, options };
      return { status: 200, ok: true, json: async () => ({ connected: true }) };
    },
  });
  const response = await live
    .load("lib/api/client.ts")
    .api.get("/products", { parentId: "history" });
  assert.equal(response.connected, true);
  assert.ok(
    requested.url.includes("localhost:8080/api/v1/products?parentId=history"),
  );
});

test("local and data images stay local in mock mode", () => {
  const { load } = setup();
  const { imageSrc } = load("lib/utils/image.ts");
  assert.equal(
    imageSrc("/images/books/book-01.webp"),
    "/images/books/book-01.webp",
  );
  assert.equal(
    imageSrc("data:image/png;base64,aGVsbG8="),
    "data:image/png;base64,aGVsbG8=",
  );
  assert.equal(imageSrc(null), undefined);
});
