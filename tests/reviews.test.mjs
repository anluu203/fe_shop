import test from "node:test";
import assert from "node:assert/strict";
import { browserModules, memoryStorage } from "./helpers.mjs";

const ADMIN = "bookstore-demo:user-admin";
const READER = "bookstore-demo:user-reader";
const DATABASE_KEY = "bookstore:database:v1";

function setup(storage = memoryStorage()) {
  const runtime = browserModules(storage);
  const { mockRequest } = runtime.load("lib/mock/request.ts");
  return {
    ...runtime,
    call: (path, method = "GET", body, token = null) =>
      mockRequest(path, method, body === undefined ? undefined : JSON.stringify(body), {}, token),
  };
}

test("product reviews are public, scoped to the book and expose only public reviewer details", async () => {
  const { call } = setup();
  const reviews = await call("/products/book-01/reviews");
  assert.equal(reviews.length, 6);
  assert.ok(reviews.every((review) => review.BookID === "book-01"));
  assert.equal(Object.keys(reviews[0].user).sort().join(","), "id,username");
  assert.equal(reviews[0].book.name, "Cây cam ngọt của tôi");
  assert.ok(reviews.some((review) => review.Comment === null));
  assert.ok(reviews[0].CreatedAt > reviews.at(-1).CreatedAt);
  assert.equal((await call("/products/book-32/reviews")).length, 0);
  await assert.rejects(call("/products/missing/reviews"), /Không tìm thấy sách/);
});

test("review creation requires a session and derives ownership, book, ID and date from the mock API", async () => {
  const { call, storage } = setup();
  await assert.rejects(call("/products/book-01/reviews", "POST", { Rating: 5 }), /đăng nhập/);
  const review = await call("/products/book-02/reviews", "POST", {
    Rating: 5, Comment: "  Một cuốn sách đáng đọc.  ", UserID: "user-admin",
    BookID: "book-01", ReviewID: 1, CreatedAt: "2000-01-01",
  }, READER);
  assert.equal(review.UserID, "user-reader");
  assert.equal(review.BookID, "book-02");
  assert.equal(review.ReviewID, 13);
  assert.equal(review.CreatedAt, "2026-10-19T03:00:00.000Z");
  assert.equal(review.Comment, "Một cuốn sách đáng đọc.");
  const persisted = await setup(storage).call("/admin/reviews", "GET", undefined, ADMIN);
  assert.equal(persisted[0].ReviewID, review.ReviewID);
});

test("ratings must be integer values from 1 to 5; comments are optional with a 2000-character UI limit", async () => {
  const { call } = setup();
  for (const Rating of [0, 6, -1, 2.5, "5", null]) {
    await assert.rejects(call("/products/book-01/reviews", "POST", { Rating }, READER), /1 đến 5/);
  }
  await assert.rejects(call("/products/book-01/reviews", "POST", { Rating: 4, Comment: {} }, READER), /không hợp lệ/);
  await assert.rejects(call("/products/book-01/reviews", "POST", { Rating: 4, Comment: "a".repeat(2001) }, READER), /2.000/);
  for (const Comment of [undefined, null, "   "]) {
    const review = await call("/products/book-01/reviews", "POST", { Rating: 4, Comment }, READER);
    assert.equal(review.Comment, null);
  }
  const review = await call("/products/book-01/reviews", "POST", { Rating: 1, Comment: "a".repeat(2000) }, READER);
  assert.equal(review.Comment.length, 2000);
});

test("only admins can list and delete reviews; deletion persists and IDs are never reused", async () => {
  const { call, storage } = setup();
  await assert.rejects(call("/admin/reviews"), /đăng nhập/);
  await assert.rejects(call("/admin/reviews", "GET", undefined, READER), /quyền quản trị/);
  await assert.rejects(call("/admin/reviews/1", "DELETE", undefined, READER), /quyền quản trị/);
  const created = await call("/products/book-01/reviews", "POST", { Rating: 5 }, READER);
  await call(`/admin/reviews/${created.ReviewID}`, "DELETE", undefined, ADMIN);
  const reloaded = setup(storage);
  const reviews = await reloaded.call("/products/book-01/reviews");
  assert.ok(reviews.every((review) => review.ReviewID !== created.ReviewID));
  const next = await reloaded.call("/products/book-01/reviews", "POST", { Rating: 2 }, READER);
  assert.equal(next.ReviewID, created.ReviewID + 1);
  await assert.rejects(call("/admin/reviews/999", "DELETE", undefined, ADMIN), /không còn tồn tại/);
});

test("old demo storage gains review seeds without discarding existing commerce data", async () => {
  const runtime = setup();
  const state = runtime.load("lib/mock/store.ts").cloneSeed();
  state.products[0].name = "Tên sách đã chỉnh sửa";
  state.orders[0].totalPrice = "123456";
  delete state.reviews;
  delete state.nextReviewId;
  runtime.storage.setItem(DATABASE_KEY, JSON.stringify(state));
  const migrated = runtime.load("lib/mock/store.ts").readMockState();
  assert.equal(migrated.products[0].name, "Tên sách đã chỉnh sửa");
  assert.equal(migrated.orders[0].totalPrice, "123456");
  assert.equal(migrated.reviews.length, 12);
  assert.equal(migrated.nextReviewId, 13);
  const item = await runtime.call("/products/book-01/reviews", "POST", { Rating: 3 }, READER);
  assert.equal(item.ReviewID, 13);
  assert.equal(JSON.parse(runtime.storage.getItem(DATABASE_KEY)).products[0].name, "Tên sách đã chỉnh sửa");
});

test("review changes notify subscribers and storage failures do not report success", async () => {
  const runtime = setup();
  let events = 0;
  runtime.window.addEventListener("bookstore:data-changed", () => events++);
  const review = await runtime.call("/products/book-01/reviews", "POST", { Rating: 3 }, READER);
  await runtime.call(`/admin/reviews/${review.ReviewID}`, "DELETE", undefined, ADMIN);
  assert.equal(events, 2);
  runtime.storage.setItem = () => { throw new Error("Storage full"); };
  await assert.rejects(runtime.call("/products/book-01/reviews", "POST", { Rating: 4 }, READER), /Không thể lưu thay đổi/);
});

test("rating summaries handle empty books, rating-only reviews and deletion", async () => {
  const runtime = setup();
  const { reviewStats, reviewDate } = runtime.load("lib/utils/reviews.ts");
  assert.equal(reviewStats([]).average, 0);
  const reviews = await runtime.call("/products/book-01/reviews");
  assert.equal(reviewStats(reviews).average, 26 / 6);
  assert.equal(reviewStats(reviews).counts[5], 3);
  await runtime.call("/admin/reviews/1", "DELETE", undefined, ADMIN);
  const remaining = await runtime.call("/products/book-01/reviews");
  assert.equal(reviewStats(remaining).average, 21 / 5);
  assert.equal(reviewStats(remaining).total, 5);
  assert.equal(reviewDate("2026-10-18T18:30:00.000Z"), "19/10/2026");
});
