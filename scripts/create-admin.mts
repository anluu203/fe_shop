import "dotenv/config";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/server/auth";

async function main() {
  const input = z.object({ email: z.email().max(254).transform((value) => value.toLowerCase()), password: z.string().min(12).max(128), name: z.string().trim().min(1).max(150) }).parse({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD, name: process.env.ADMIN_NAME ?? "Quản trị BookStore" });
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    if (existing.role !== 1) throw new Error("Email already belongs to a user. The account was not promoted.");
    console.log("Admin already exists. Existing password was preserved."); return;
  }
  await prisma.user.create({ data: { fullName: input.name, email: input.email, role: 1, passwordHash: await hashPassword(input.password) } });
  console.log("Created administrator. No credentials were printed.");
}
main().catch(() => { console.error("Admin creation failed. Verify ADMIN_EMAIL, ADMIN_PASSWORD (12+ characters), ADMIN_NAME, and database configuration."); process.exitCode = 1; }).finally(() => prisma.$disconnect());
