import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID, scryptSync } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { Client } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "../generated/prisma/client";
import { getDatabaseUrl } from "../lib/server/database-config";
import { documentChecksum, importMockData, loadMockData, prepareMockData } from "../scripts/mock-data-import";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = resolve(root, "mock-data");

async function rawDocuments(): Promise<Record<string, unknown>> {
  return Object.fromEntries(await Promise.all((await readdir(source)).filter((name) => name.endsWith(".json")).map(async (name) =>
    [name, JSON.parse(await readFile(resolve(source, name), "utf8"))],
  )));
}

test("all source files are covered, references validated, credentials excluded from JSON", async () => {
  const bundle = await loadMockData(source);
  assert.equal(bundle.documents.length, (await readdir(source)).filter((name) => name.endsWith(".json")).length);
  assert.equal(bundle.books.length, 32);
  assert.equal(bundle.orders.filter((order) => order.status === "PREPARING").length, 2);
  for (const document of bundle.documents) {
    assert.equal(documentChecksum(document.payload), document.checksum);
    assert.doesNotMatch(JSON.stringify(document.payload), /"(?:password|passwordHash|accessToken|apiKey)":/i);
  }

  const missingBook = await rawDocuments();
  (missingBook["products.json"] as unknown[]).shift();
  assert.throws(() => prepareMockData(missingBook), /references missing key book-01/);

  const wrongTotal = await rawDocuments();
  (wrongTotal["orders.json"] as { totalPrice: string }[])[0].totalPrice = "1";
  assert.throws(() => prepareMockData(wrongTotal), /totalPrice does not equal its items/);

  const wrongStatus = await rawDocuments();
  (wrongStatus["orders.json"] as { status: string }[])[0].status = "toString";
  assert.throws(() => prepareMockData(wrongStatus), /unsupported order.status/);

  const duplicateEmail = await rawDocuments();
  const users = duplicateEmail["users.json"] as { email: string }[];
  users[1].email = users[0].email.toUpperCase();
  assert.throws(() => prepareMockData(duplicateEmail), /duplicate user.email/);

  const duplicateItem = await rawDocuments();
  const orders = duplicateItem["orders.json"] as { items: { id: string }[] }[];
  orders[1].items[0].id = orders[0].items[0].id;
  assert.throws(() => prepareMockData(duplicateItem), /duplicate item.id/);
});

test("validation-only CLI works without valid database credentials", () => {
  const result = spawnSync(process.execPath, ["--import", "tsx", resolve(root, "scripts/import-mock-data.mts"), "--dry-run"], {
    cwd: root,
    env: { ...process.env, DATABASE_URL: "postgresql://invalid:invalid@127.0.0.1:1/missing" },
    encoding: "utf8", timeout: 20_000,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /no database connection or writes/);
});

test("real PostgreSQL import preserves all files, rolls back errors, and reruns safely", { timeout: 120_000 }, async (t) => {
  // Always create our own random database. Never clear the application's database.
  const database = `book_shop_seed_test_${randomUUID().replaceAll("-", "")}`;
  const target = new URL(getDatabaseUrl());
  target.pathname = "/postgres";
  const admin = new Client({ connectionString: target.toString(), connectionTimeoutMillis: 5_000 });
  let createdDatabase = false;
  let prisma: PrismaClient | undefined;
  try {
    await admin.connect();
    assert.match(database, /^book_shop_seed_test_[a-f0-9]{32}$/);
    await admin.query(`CREATE DATABASE "${database}" TEMPLATE template0 ENCODING 'UTF8'`);
    createdDatabase = true;
    target.pathname = `/${database}`;
    const migration = spawnSync(process.execPath, [resolve(root, "node_modules/prisma/build/index.js"), "migrate", "deploy"], {
      cwd: root, env: { ...process.env, DATABASE_URL: target.toString() }, encoding: "utf8", timeout: 40_000,
    });
    assert.equal(migration.status, 0, migration.stderr);
    const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: target.toString(), connectionTimeoutMillis: 5_000 }) });
    prisma = db;
    const bundle = await loadMockData(source);
    const existing = await db.user.create({ data: {
      fullName: "Existing account", email: "existing@example.invalid", passwordHash: "unchanged", role: 0,
    } });
    const existingCategory = await db.category.create({ data: { name: "Existing category" } });
    const existingBook = await db.book.create({ data: {
      categoryId: existingCategory.id, title: "Existing book", author: "Existing", originalPrice: "100", sellingPrice: "100",
    } });
    const existingReview = await db.review.create({ data: { userId: existing.id, bookId: existingBook.id, rating: 4 } });

    await t.test("late SQL failure rolls back parents, users, books and orders", async () => {
      const invalid = structuredClone(bundle);
      invalid.reviews[0].rating = 0; // Deliberately bypass preflight to exercise database rollback.
      await assert.rejects(importMockData(db, invalid), Prisma.PrismaClientKnownRequestError);
      assert.equal(await db.categoryParent.count(), 0);
      assert.equal(await db.user.count(), 1);
      assert.equal(await db.book.count(), 1);
      assert.equal(await db.order.count(), 0);
      assert.equal(await db.orderItem.count(), 0);
      assert.equal(await db.seedDocument.count(), 0);
    });

    await t.test("existing email collision does not claim or promote an unrelated user", async () => {
      const conflict = await db.user.create({ data: { fullName: "Unrelated", email: bundle.users[0].email, passwordHash: "keep", role: 0 } });
      await assert.rejects(importMockData(db, bundle), /already belongs to another account/);
      const unchanged = await db.user.findUniqueOrThrow({ where: { id: conflict.id } });
      assert.equal(unchanged.seedKey, null);
      assert.equal(unchanged.role, 0);
      assert.equal(unchanged.passwordHash, "keep");
      await db.user.delete({ where: { id: conflict.id } });
    });

    await t.test("every normalized record and source JSON survives import", async () => {
      const result = await importMockData(db, bundle);
      assert.equal(result.Books.created, 32);
      assert.equal(await db.user.count(), bundle.users.length + 1);
      assert.equal(await db.review.count(), bundle.reviews.length + 1);
      assert.equal((await db.review.findUniqueOrThrow({ where: { id: existingReview.id } })).seedKey, null);
      for (const document of bundle.documents) {
        const saved = await db.seedDocument.findUniqueOrThrow({ where: { filename: document.filename } });
        assert.deepEqual(saved.payload, document.payload);
        assert.equal(documentChecksum(saved.payload as Prisma.InputJsonValue), document.checksum);
        assert.equal(saved.recordCount, document.recordCount);
      }
      for (const input of bundle.users) {
        const user = await db.user.findUniqueOrThrow({ where: { seedKey: input.seedKey } });
        assert.equal(user.email, input.email);
        assert.equal(user.role, input.role);
        assert.equal(user.fullName, input.fullName);
        const [algorithm, salt, digest] = user.passwordHash.split(":");
        assert.equal(algorithm, "scrypt");
        assert.equal(scryptSync(input.password, salt, 64).toString("hex"), digest);
      }
      for (const input of bundle.books) {
        const book = await db.book.findUniqueOrThrow({ where: { seedKey: input.seedKey }, include: { category: { include: { parent: true } } } });
        assert.equal(book.category.seedKey, input.categorySeedKey);
        assert.ok(book.category.parent?.seedKey);
        assert.equal(book.sellingPrice.toFixed(0), input.sellingPrice);
        assert.equal(book.coverImage, input.coverImage);
        assert.equal(book.pageCount, input.pageCount);
        assert.equal(book.stockQuantity, 0);
      }
      for (const input of bundle.orders) {
        const order = await db.order.findUniqueOrThrow({ where: { seedKey: input.seedKey }, include: { user: true, items: { include: { book: true } } } });
        assert.equal(order.user.seedKey, input.userSeedKey);
        assert.equal(order.status, input.status);
        assert.equal(order.completedAt?.toISOString() ?? null, input.completedAt?.toISOString() ?? null);
        assert.equal(order.totalAmount.toFixed(0), input.totalAmount);
        assert.equal(order.items.length, input.items.length);
        for (const item of input.items) {
          const saved = order.items.find((row) => row.seedKey === item.seedKey)!;
          assert.equal(saved.book.seedKey, item.bookSeedKey);
          assert.equal(saved.bookTitle, item.bookTitle);
          assert.equal(saved.quantity, item.quantity);
          assert.equal(saved.unitPrice.toFixed(0), item.unitPrice);
        }
      }
      for (const input of bundle.reviews) {
        const review = await db.review.findUniqueOrThrow({ where: { seedKey: input.seedKey }, include: { user: true, book: true } });
        assert.equal(review.user.seedKey, input.userSeedKey);
        assert.equal(review.book.seedKey, input.bookSeedKey);
        assert.equal(review.rating, input.rating);
        assert.equal(review.comment, input.comment);
      }
    });

    await t.test("reruns and concurrent imports do not duplicate or overwrite edited data", async () => {
      const seedKey = bundle.books[0].seedKey;
      const before = await db.user.findUniqueOrThrow({ where: { seedKey: bundle.users[0].seedKey } });
      const document = await db.seedDocument.findFirstOrThrow();
      await db.book.update({ where: { seedKey }, data: { sellingPrice: "123456", stockQuantity: 17 } });
      const results = await Promise.all([importMockData(db, bundle), importMockData(db, bundle)]);
      for (const result of results) for (const row of Object.values(result)) assert.equal(row.created, 0);
      assert.equal(await db.book.count(), 33);
      assert.equal(await db.order.count(), 8);
      assert.equal(await db.orderItem.count(), 8);
      assert.equal(await db.review.count(), 13);
      assert.equal(await db.seedDocument.count(), 12);
      const book = await db.book.findUniqueOrThrow({ where: { seedKey } });
      assert.equal(book.sellingPrice.toFixed(0), "123456");
      assert.equal(book.stockQuantity, 17);
      assert.equal((await db.user.findUniqueOrThrow({ where: { id: before.id } })).passwordHash, before.passwordHash);
      assert.equal((await db.seedDocument.findUniqueOrThrow({ where: { filename: document.filename } })).importedAt.toISOString(), document.importedAt.toISOString());
      assert.equal((await db.user.findUniqueOrThrow({ where: { id: existing.id } })).passwordHash, "unchanged");
    });

    await t.test("changed source files require a deliberate data migration", async () => {
      const changed = structuredClone(bundle);
      changed.documents[0].checksum = "0".repeat(64);
      await assert.rejects(importMockData(db, changed), /changed since its first import/);
      assert.equal(await db.seedDocument.count(), 12);
    });
  } finally {
    await prisma?.$disconnect();
    if (createdDatabase) {
      // Only the verified random database created by this test can be dropped.
      assert.match(database, /^book_shop_seed_test_[a-f0-9]{32}$/);
      await admin.query(`DROP DATABASE "${database}" WITH (FORCE)`);
    }
    await admin.end();
  }
});
