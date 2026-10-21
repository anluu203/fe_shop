/** Shared by Prisma CLI, database scripts, and the server-only Prisma client. */
export function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const required = ["DB_HOST", "DB_USERNAME", "DB_PASSWORD", "DB_DATABASE"];
  const missing = required.filter((key) => process.env[key] === undefined);
  if (missing.length) {
    throw new Error(`Missing database configuration: ${missing.join(", ")}`);
  }

  const user = encodeURIComponent(process.env.DB_USERNAME!);
  const password = encodeURIComponent(process.env.DB_PASSWORD!);
  const database = encodeURIComponent(process.env.DB_DATABASE!);
  return `postgresql://${user}:${password}@${process.env.DB_HOST}:${process.env.DB_PORT ?? "5432"}/${database}`;
}
