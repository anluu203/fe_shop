import "dotenv/config";
import { defineConfig } from "prisma/config";
import { getDatabaseUrl } from "./lib/server/database-config";

// Client generation during npm install works before local credentials are configured.
const hasDatabaseConfig = Boolean(process.env.DATABASE_URL || process.env.DB_DATABASE);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: hasDatabaseConfig ? {
    url: getDatabaseUrl(),
  } : undefined,
});
