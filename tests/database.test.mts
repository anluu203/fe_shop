import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID, scryptSync } from "node:crypto";
import test from "node:test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "../generated/prisma/client";
import { getDatabaseUrl } from "../lib/server/database-config";

test("PostgreSQL persists related records and rejects invalid data (rolled back)", async () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: getDatabaseUrl(), connectionTimeoutMillis: 5_000 }),
  });
  const rollback = new Error("Rollback database test fixtures");
  const email = `prisma-test-${randomUUID()}@example.invalid`;

  try {
    await assert.rejects(prisma.$transaction(async (tx) => {
      const salt = randomUUID();
      const passwordHash = `scrypt:${salt}:${scryptSync(randomUUID(), salt, 64).toString("hex")}`;
      const user = await tx.user.create({ data: { fullName: "Database test", email, passwordHash } });
      const category = await tx.category.create({ data: { name: "Database test" } });
      const book = await tx.book.create({ data: {
        categoryId: category.id, title: "Test book", author: "Test author",
        originalPrice: "100000.50", sellingPrice: "80000.25", stockQuantity: 3,
        isbn: "9780306406157", publisher: "Test publisher", pageCount: 320, discount: "20.00",
      } });
      const cart = await tx.cartItem.create({ data: { userId: user.id, bookId: book.id, quantity: 2 } });
      const review = await tx.review.create({ data: { userId: user.id, bookId: book.id, rating: 5 } });
      const order = await tx.order.create({ data: {
        userId: user.id, shippingAddress: "Test address", totalAmount: "160000.50",
        items: { create: { bookId: book.id, bookTitle: book.title, quantity: 2, unitPrice: book.sellingPrice } },
      }, include: { items: { include: { book: { include: { category: true } } } }, user: true } });

      assert.equal(order.user.email, email);
      assert.equal(order.user.role, 0);
      assert.equal(order.status, "PENDING");
      assert.equal(order.paymentMethod, "COD");
      assert.equal(order.items[0].book.category.id, category.id);
      assert.equal(order.totalAmount.toFixed(2), "160000.50");
      assert.equal(order.items[0].unitPrice.toFixed(2), "80000.25");
      assert.equal(book.isbn, "9780306406157");
      assert.equal(book.publisher, "Test publisher");
      assert.equal(book.pageCount, 320);
      assert.equal(book.discount.toFixed(2), "20.00");
      const config = await tx.aIConfig.findUniqueOrThrow({ where: { id: 1 } });
      assert.equal(config.maxSuggestions, 3);
      const chat = await tx.chatLog.create({ data: {
        sessionId: randomUUID(), userId: user.id, question: "Tôi tìm sách khoa học", answer: "Gợi ý sách",
        recommendedBooks: [book.id], needsHuman: true,
      } });
      assert.equal(chat.resolved, false);
      assert.equal(chat.adminNote, "");
      await tx.chatLog.update({ where: { id: chat.id }, data: { resolved: true, adminNote: "Đã hỗ trợ" } });

      // Savepoints let us test SQL errors without aborting the surrounding transaction.
      async function rejected(write: () => Promise<unknown>, code: string) {
        await tx.$executeRaw`SAVEPOINT invalid_write`;
        await assert.rejects(write(), (error: unknown) =>
          error instanceof Prisma.PrismaClientKnownRequestError &&
          (code === "23514" ? error.message.includes("23514") : error.code === code));
        await tx.$executeRaw`ROLLBACK TO SAVEPOINT invalid_write`;
        await tx.$executeRaw`RELEASE SAVEPOINT invalid_write`;
      }

      await rejected(() => tx.user.create({ data: { fullName: "Duplicate", email, passwordHash } }), "P2002");
      await rejected(() => tx.cartItem.create({ data: { userId: user.id, bookId: book.id } }), "P2002");
      for (const rating of [0, 6]) {
        await rejected(() => tx.review.update({ where: { id: review.id }, data: { rating } }), "23514");
      }
      await rejected(() => tx.user.update({ where: { id: user.id }, data: { role: 2 } }), "23514");
      await rejected(() => tx.book.update({ where: { id: book.id }, data: { stockQuantity: -1 } }), "23514");
      await rejected(() => tx.book.update({ where: { id: book.id }, data: { originalPrice: -1 } }), "23514");
      await rejected(() => tx.book.update({ where: { id: book.id }, data: { sellingPrice: -1 } }), "23514");
      for (const discount of [-1, 100.01]) await rejected(() => tx.book.update({ where: { id: book.id }, data: { discount } }), "23514");
      await rejected(() => tx.book.update({ where: { id: book.id }, data: { pageCount: 0 } }), "23514");
      await rejected(() => tx.book.update({ where: { id: book.id }, data: { isbn: "invalid" } }), "23514");
      await rejected(() => tx.aIConfig.update({ where: { id: 1 }, data: { maxSuggestions: 6 } }), "23514");
      await rejected(() => tx.aIConfig.update({ where: { id: 1 }, data: { temperature: 3 } }), "23514");
      await rejected(() => tx.chatLog.update({ where: { id: chat.id }, data: { question: "" } }), "23514");
      await rejected(() => tx.chatLog.update({ where: { id: chat.id }, data: { userId: -1 } }), "P2003");
      await rejected(() => tx.cartItem.update({ where: { id: cart.id }, data: { quantity: 0 } }), "23514");
      await rejected(() => tx.order.update({ where: { id: order.id }, data: { totalAmount: -1 } }), "23514");
      await rejected(() => tx.orderItem.update({ where: { id: order.items[0].id }, data: { quantity: 0 } }), "23514");
      await rejected(() => tx.orderItem.update({ where: { id: order.items[0].id }, data: { unitPrice: -1 } }), "23514");
      await rejected(() => tx.category.delete({ where: { id: category.id } }), "P2003");
      await rejected(() => tx.user.delete({ where: { id: user.id } }), "P2003");
      await rejected(() => tx.book.delete({ where: { id: book.id } }), "P2003");
      await rejected(() => tx.book.update({ where: { id: book.id }, data: { categoryId: -1 } }), "P2003");

      await tx.book.update({ where: { id: book.id }, data: { title: "Changed title", sellingPrice: 1 } });
      const item = await tx.orderItem.findUniqueOrThrow({ where: { id: order.items[0].id } });
      assert.equal(item.bookTitle, "Test book");
      assert.equal(item.unitPrice.toFixed(2), "80000.25");

      await tx.order.delete({ where: { id: order.id } });
      assert.equal(await tx.orderItem.count({ where: { orderId: order.id } }), 0);
      await tx.user.delete({ where: { id: user.id } });
      assert.equal(await tx.cartItem.count({ where: { userId: user.id } }), 0);
      assert.equal(await tx.review.count({ where: { userId: user.id } }), 0);
      const retained = await tx.chatLog.findUniqueOrThrow({ where: { id: chat.id } });
      assert.equal(retained.userId, null);
      assert.equal(retained.resolved, true);
      throw rollback;
    }, { timeout: 30_000 }), (error: unknown) => error === rollback);

    assert.equal(await prisma.user.count({ where: { email } }), 0);
  } finally {
    await prisma.$disconnect();
  }
});
