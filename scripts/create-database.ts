import "dotenv/config";
import { Client } from "pg";
import { getDatabaseUrl } from "../lib/server/database-config";

async function main() {
  const targetUrl = new URL(getDatabaseUrl());
  const database = decodeURIComponent(targetUrl.pathname.slice(1));
  if (!database || Buffer.byteLength(database, "utf8") > 63) {
    throw new Error("Database name must contain between 1 and 63 bytes.");
  }

  targetUrl.pathname = "/postgres";
  const client = new Client({
    connectionString: targetUrl.toString(),
    connectionTimeoutMillis: 5_000,
  });

  try {
    await client.connect();
    const existing = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [database]);
    if (existing.rowCount) {
      console.log(`Database ${database} already exists; preserving existing data.`);
      return;
    }

    // PostgreSQL identifiers cannot be query parameters; escape embedded quotes.
    const identifier = `"${database.replaceAll('"', '""')}"`;
    await client.query(`CREATE DATABASE ${identifier} ENCODING 'UTF8' TEMPLATE template0`);
    console.log(`Created database ${database}.`);
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error("Database creation failed:", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
});
