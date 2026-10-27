import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { randomUUID } from "node:crypto";
import ts from "typescript";

const filename = new URL("../lib/services/reviews.ts", import.meta.url);
const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

function load(storage = memoryStorage()) {
  const context = { exports: {}, localStorage: storage, crypto: { randomUUID } };
  vm.runInNewContext(compiled, context, { filename: filename.pathname });
  return context.exports;
}

const user = { id: "user-a", username: "Nguyễn An" };

test("each product gets stable sample review IDs and matching foreign keys", () => {
  const { getSampleReviews } = load();
  const first = getSampleReviews("product-a");
  assert.equal(first.length, 3);
  assert.equal(new Set(first.map((review) => review.id)).size, 3);
  assert.deepEqual(first, getSampleReviews("product-a"));
  assert.ok(first.every((review) => review.productId === "product-a" && review.userId === review.user.id));
  assert.ok(getSampleReviews("product-b").every((review) => !first.some((item) => item.id === review.id)));
});

test("submission stores rating, trimmed comment and authenticated user; survives reload without duplicating samples", () => {
  const storage = memoryStorage();
  const { reviewService } = load(storage);
  const reviews = reviewService.create("product-a", user, 4, "  Hoạt động tốt.  ");
  const created = reviews[0];
  assert.equal(reviews.length, 4);
  assert.equal(created.comment, "Hoạt động tốt.");
  assert.equal(created.rating, 4);
  assert.equal(created.userId, user.id);
  assert.equal(created.productId, "product-a");
  assert.equal(created.user.username, user.username);
  assert.equal(load(storage).reviewService.getAll("product-a").reviews[0].id, created.id);
  assert.equal(reviewService.getAll("product-b").reviews.length, 3);
  assert.equal(reviewService.create("product-a", user, 5, "Rất tốt").length, 5);
  assert.equal(load(storage).reviewService.getAll("product-a").reviews.length, 5);
});

test("requires authentication, a product, integer stars from 1 to 5 and a meaningful bounded comment", () => {
  const { reviewService, validateReview } = load();
  assert.throws(() => reviewService.create("product-a", null, 5, "Tốt"), /đăng nhập/);
  assert.throws(() => reviewService.create("", user, 5, "Tốt"), /sản phẩm/);
  for (const rating of [0, -1, 6, 2.5, NaN, Infinity]) {
    assert.ok(validateReview(rating, "Tốt"));
    assert.throws(() => reviewService.create("product-a", user, rating, "Tốt"), /sao/);
  }
  assert.ok(validateReview(5, " \n "));
  assert.ok(validateReview(5, "a".repeat(1001)));
  assert.equal(validateReview(1, "a".repeat(1000)), "");
});

test("corrupt storage falls back to samples and a later submission recovers it", () => {
  const storage = memoryStorage();
  storage.setItem("techparts:reviews:v1:product-a", "{invalid json");
  const { reviewService } = load(storage);
  assert.equal(reviewService.getAll("product-a").reviews.length, 3);
  assert.ok(reviewService.getAll("product-a").warning);
  reviewService.create("product-a", user, 5, "Tốt");
  assert.equal(load(storage).reviewService.getAll("product-a").reviews.length, 4);
  assert.equal(reviewService.getAll("product-a").warning, "");
});

test("ignores malformed reviews and records belonging to a different product", () => {
  const storage = memoryStorage();
  const { reviewService } = load(storage);
  const valid = reviewService.create("product-a", user, 5, "Tốt")[0];
  storage.setItem("techparts:reviews:v1:product-a", JSON.stringify([
    valid, null, { ...valid, id: "wrong-product", productId: "product-b" },
    { ...valid, id: "wrong-user", userId: "user-b" }, { ...valid, id: "bad-rating", rating: 99 },
  ]));
  const snapshot = reviewService.getAll("product-a");
  assert.equal(snapshot.reviews.length, 4);
  assert.equal(snapshot.reviews[0].id, valid.id);
  assert.ok(snapshot.warning);
});

test("blocked storage does not report a successful submission", () => {
  const { reviewService } = load({
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("quota exceeded"); },
  });
  assert.equal(reviewService.getAll("product-a").reviews.length, 3);
  assert.ok(reviewService.getAll("product-a").warning);
  assert.throws(() => reviewService.create("product-a", user, 5, "Tốt"), /Không thể lưu/);
});
