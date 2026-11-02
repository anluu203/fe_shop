import "dotenv/config";
import { unlink } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { prisma } from "../lib/prisma";

async function main() {
  const now = new Date();
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  await prisma.rateLimitWindow.deleteMany({ where: { expiresAt: { lt: now } } });
  await prisma.session.deleteMany({ where: { OR: [{ expiresAt: { lt: cutoff } }, { revokedAt: { lt: cutoff } }] } });
  const assets = await prisma.uploadedAsset.findMany({ where: { createdAt: { lt: cutoff } } });
  let removed = 0;
  for (const asset of assets) {
    const unused = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "filename" FROM "Uploaded_Assets" WHERE "filename" = ${asset.filename} FOR UPDATE`;
      if (!await tx.uploadedAsset.findUnique({ where: { filename: asset.filename } })) return false;
      const references = await Promise.all([
        tx.book.count({ where: { coverImage: asset.imageUrl } }), tx.user.count({ where: { avatarUrl: asset.imageUrl } }),
        tx.category.count({ where: { imageUrl: asset.imageUrl } }), tx.categoryParent.count({ where: { imageUrl: asset.imageUrl } }),
        tx.orderItem.count({ where: { bookImage: asset.imageUrl } }),
      ]);
      if (references.some(Boolean)) return false;
      await tx.uploadedAsset.delete({ where: { filename: asset.filename } });
      return true;
    });
    if (!unused) continue;
    const root = resolve(process.env.IMAGE_ROOT ?? "public/images");
    const path = resolve(root, "uploads", asset.target, asset.filename);
    if (!path.startsWith(root + sep) || !["products", "categories", "avatars"].includes(asset.target) || !/^[a-f0-9-]{36}\.webp$/.test(asset.filename)) throw new Error("Refusing an invalid asset path.");
    await unlink(path).catch((error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") throw error; });
    removed++;
  }
  console.log(`Removed expired sessions/rate windows and ${removed} unreferenced images older than 24 hours. Order snapshots were preserved.`);
}
main().catch(() => { console.error("Maintenance failed; inspect database and filesystem permissions."); process.exitCode = 1; }).finally(() => prisma.$disconnect());
