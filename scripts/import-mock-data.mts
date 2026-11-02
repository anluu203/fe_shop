import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { getDatabaseUrl } from "../lib/server/database-config";
import { bundleCounts, importMockData, loadMockData } from "./mock-data-import";

const root = fileURLToPath(new URL("../", import.meta.url));
config({ path: resolve(root, ".env"), quiet: true });

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--dry-run")) throw new Error("Usage: npm run db:seed or npm run db:seed:check (validation only)");
  const bundle = await loadMockData(resolve(root, "mock-data"));
  console.log(`Validated ${bundle.documents.length} JSON files from mock-data/.`);
  if (args.includes("--dry-run")) {
    console.table(bundleCounts(bundle));
    console.log("Dry run: no database connection or writes were made.");
    return;
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({
    connectionString: getDatabaseUrl(), connectionTimeoutMillis: 5_000,
  }) });
  try {
    const result = await importMockData(prisma, bundle);
    console.table(result);
    console.log("Import committed. Existing records and passwords were preserved.");
    console.log("All JSON files are in Seed_Documents (plaintext credentials excluded). Auxiliary datasets retain their original IDs and structure.");
    console.log("Missing stock remains 0; demo shipping addresses remain empty. Importing data does not connect the frontend to the database.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  // Do not print raw Prisma errors, which may include query arguments/secrets.
  console.error("Mock-data import failed:", error instanceof Error && !("clientVersion" in error) ? error.message : "Database operation failed; verify configuration and run npm run db:setup first.");
  process.exitCode = 1;
});
