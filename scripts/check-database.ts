import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { getDatabaseUrl } from "../lib/server/database-config";

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: getDatabaseUrl(),
      connectionTimeoutMillis: 5_000,
    }),
  });

  try {
    const [database] = await prisma.$queryRaw<{ name: string }[]>`SELECT current_database() AS name`;
    // A transaction gives all table counts the same database snapshot.
    const counts = await prisma.$transaction([
      prisma.user.count(),
      prisma.category.count(),
      prisma.book.count(),
      prisma.cartItem.count(),
      prisma.order.count(),
      prisma.orderItem.count(),
      prisma.review.count(),
    ], { isolationLevel: "RepeatableRead" });
    console.log(`Prisma connected to ${database.name}.`);
    console.table(Object.fromEntries(
      ["Users", "Categories", "Books", "Cart_Items", "Orders", "Order_Items", "Reviews"]
        .map((table, index) => [table, counts[index]]),
    ));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("Database check failed:", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
});
