import { randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { mkdir, readFile, unlink, writeFile, realpath, stat } from "node:fs/promises";
import { resolve, sep } from "node:path";
import sharp from "sharp";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { HttpError, requireCondition } from "./http";
import { isPublicAddress, pinnedLookup } from "./image-network";

export const imageLimit = 2 * 1024 * 1024;
// Uploaded files live on writable disk, independently of the bundled build.
const imageRoot = () => process.env.IMAGE_ROOT
  ? resolve(/* turbopackIgnore: true */ process.env.IMAGE_ROOT)
  : resolve(process.cwd(), "public/images");
const targets = new Set(["products", "avatars", "categories"]);
export async function downloadImage(input: string, redirects = 0): Promise<Buffer> {
  let url: URL;
  try { url = new URL(input); } catch { throw new HttpError(400, "URL ảnh không hợp lệ."); }
  requireCondition(["http:", "https:"].includes(url.protocol) && !url.username && !url.password && (!url.port || ["80", "443"].includes(url.port)), 400, "Chỉ nhận URL ảnh HTTP/HTTPS công khai trên cổng 80/443.");
  requireCondition(redirects <= 3, 400, "URL ảnh chuyển hướng quá nhiều.");
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  let addresses: { address: string; family: number }[];
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    addresses = await Promise.race([
      lookup(hostname, { all: true, verbatim: true }),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new HttpError(400, "Không phân giải được địa chỉ ảnh.")), 5000); }),
    ]);
  } catch { throw new HttpError(400, "Không phân giải được địa chỉ ảnh công khai."); }
  finally { clearTimeout(timer); }
  requireCondition(addresses.length && addresses.every((entry) => isPublicAddress(entry.address)), 400, "Không cho phép tải ảnh từ địa chỉ nội bộ hoặc đặc biệt.");
  const pinned = addresses[0];
  const result = await new Promise<{ bytes?: Buffer; redirect?: string }>((fulfill, reject) => {
    const send = url.protocol === "https:" ? httpsRequest : httpRequest;
    const req = send(url, {
      // Pin the checked address: the HTTP client must not resolve DNS a second time.
      lookup: pinnedLookup(pinned),
      headers: { Accept: "image/jpeg,image/png,image/webp,image/gif", "User-Agent": "BookStore-ImageImporter/1" },
    }, (response) => {
      if ([301,302,303,307,308].includes(response.statusCode ?? 0) && response.headers.location) {
        const location = new URL(response.headers.location, url).href;
        response.destroy(); fulfill({ redirect: location }); return;
      }
      if (response.statusCode !== 200 || Number(response.headers["content-length"] ?? 0) > imageLimit) {
        response.destroy(); reject(new HttpError(400, "Không tải được ảnh hoặc ảnh vượt 2 MB.")); return;
      }
      const chunks: Buffer[] = [];
      let length = 0;
      response.on("data", (chunk: Buffer) => {
        length += chunk.length;
        if (length > imageLimit) { response.destroy(); reject(new HttpError(413, "Ảnh vượt 2 MB.")); }
        else chunks.push(chunk);
      });
      response.on("end", () => fulfill({ bytes: Buffer.concat(chunks) }));
      response.on("error", () => reject(new HttpError(400, "Tải ảnh bị gián đoạn.")));
    });
    const timeout = setTimeout(() => req.destroy(new Error("timeout")), 10_000);
    req.on("close", () => clearTimeout(timeout));
    req.on("error", () => reject(new HttpError(400, "Không tải được ảnh. Kiểm tra URL và thử lại.")));
    req.end();
  });
  return result.redirect ? downloadImage(result.redirect, redirects + 1) : result.bytes!;
}
export async function saveImage(target: string, input: Uint8Array, ownerId: number, sourceUrl?: string) {
  requireCondition(targets.has(target), 404, "Loại ảnh không hợp lệ.");
  requireCondition(input.byteLength > 0 && input.byteLength <= imageLimit, 413, "Ảnh phải có dung lượng từ 1 byte đến 2 MB.");
  let bytes: Buffer;
  try {
    const image = sharp(input, { limitInputPixels: 25_000_000, animated: false, failOn: "warning" });
    const metadata = await image.metadata();
    requireCondition(metadata.format && ["jpeg", "png", "webp", "gif"].includes(metadata.format), 400, "Chỉ nhận JPEG, PNG, WebP hoặc GIF.");
    bytes = await image.rotate().webp({ quality: 85 }).toBuffer();
    requireCondition(bytes.length <= imageLimit, 413, "Ảnh sau xử lý vượt 2 MB.");
  } catch (error) { if (error instanceof HttpError) throw error; throw new HttpError(400, "File ảnh hỏng hoặc kích thước ảnh quá lớn."); }
  const filename = `${randomUUID()}.webp`;
  const directory = resolve(imageRoot(), "uploads", target);
  await mkdir(directory, { recursive: true });
  const path = resolve(directory, filename);
  await writeFile(path, bytes, { flag: "wx" });
  const imageUrl = `/images/uploads/${target}/${filename}`;
  try { await prisma.uploadedAsset.create({ data: { filename, imageUrl, target, mimeType: "image/webp", size: bytes.length, ownerId, sourceUrl } }); }
  catch (error) { await unlink(path).catch(() => {}); throw error; }
  return { imageUrl, mimeType: "image/webp", size: bytes.length };
}
export async function assertImage(imageUrl: string | null | undefined, userId: number, target: string, db: Prisma.TransactionClient = prisma) {
  if (!imageUrl) return;
  if (target !== "products" && /^https?:\/\//i.test(imageUrl)) {
    const external = new URL(imageUrl);
    requireCondition(!external.username && !external.password, 400, "URL ảnh không hợp lệ.");
    return;
  }
  requireCondition(imageUrl.startsWith("/images/") && !/[\\%?#\x00]/.test(imageUrl) && !imageUrl.split("/").includes(".."), 400, "Ảnh phải được upload hoặc nhập từ URL trước khi lưu.");
  const root = await realpath(/* turbopackIgnore: true */ imageRoot());
  let path: string;
  try { path = await realpath(resolve(root, imageUrl.slice("/images/".length))); }
  catch { throw new HttpError(400, "File ảnh không tồn tại."); }
  requireCondition(path.startsWith(root + sep) && (await stat(path)).isFile(), 400, "Đường dẫn ảnh không hợp lệ.");
  if (imageUrl.startsWith("/images/uploads/")) {
    const asset = await db.uploadedAsset.findUnique({ where: { imageUrl } });
    requireCondition(asset && asset.target === target && (target !== "avatars" || asset.ownerId === userId), 403, "Không được sử dụng file ảnh này.");
    await db.$queryRaw`SELECT "filename" FROM "Uploaded_Assets" WHERE "filename" = ${asset.filename} FOR UPDATE`;
    requireCondition(await db.uploadedAsset.findUnique({ where: { filename: asset.filename } }), 400, "Ảnh không còn tồn tại.");
  }
}
export async function serveImage(target: string, filename: string) {
  requireCondition(targets.has(target) && /^[a-f0-9-]{36}\.webp$/.test(filename), 404, "Không tìm thấy ảnh.");
  const imageUrl = `/images/uploads/${target}/${filename}`;
  requireCondition(await prisma.uploadedAsset.findUnique({ where: { imageUrl } }), 404, "Không tìm thấy ảnh.");
  let bytes: Buffer;
  try { bytes = await readFile(resolve(imageRoot(), "uploads", target, filename)); }
  catch { throw new HttpError(404, "Không tìm thấy file ảnh."); }
  return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "image/webp", "Content-Length": String(bytes.length), "X-Content-Type-Options": "nosniff", "Cache-Control": "public, max-age=31536000, immutable" } });
}
