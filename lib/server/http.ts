import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { createHash } from "node:crypto";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function requireCondition(condition: unknown, status: number, message: string): asserts condition {
  if (!condition) throw new HttpError(status, message);
}
export function numericId(value: string): number {
  requireCondition(/^[1-9]\d*$/.test(value) && Number(value) <= 2_147_483_647, 400, "ID không hợp lệ.");
  return Number(value);
}
export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export async function readBytes(request: Request, limit = 65_536): Promise<Uint8Array> {
  requireCondition(Number(request.headers.get("content-length") ?? 0) <= limit, 413, "Dữ liệu gửi lên quá lớn.");
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > limit) { await reader.cancel(); throw new HttpError(413, "Dữ liệu gửi lên quá lớn."); }
    chunks.push(value);
  }
  return new Uint8Array(Buffer.concat(chunks));
}
export async function jsonBody<T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T>> {
  requireCondition(request.headers.get("content-type")?.split(";")[0].trim() === "application/json", 400, "Yêu cầu body JSON.");
  let value: unknown;
  try { value = JSON.parse(Buffer.from(await readBytes(request)).toString("utf8")); }
  catch (error) { if (error instanceof HttpError) throw error; throw new HttpError(400, "JSON không hợp lệ."); }
  return schema.parse(value);
}
export function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
}
export const empty = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
export function errorResponse(error: unknown): Response {
  let status = 500, message = "Không thể xử lý yêu cầu. Vui lòng thử lại.";
  if (error instanceof HttpError) { status = error.status; message = error.message; }
  else if (error instanceof z.ZodError) { status = 400; message = error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "); }
  else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") { status = 409; message = "Dữ liệu đã tồn tại."; }
    if (error.code === "P2003") { status = 409; message = "Dữ liệu đang được sử dụng hoặc liên kết không tồn tại."; }
    if (error.code === "P2025") { status = 404; message = "Không tìm thấy dữ liệu."; }
    if (["P1001", "P1002", "P2024"].includes(error.code)) { status = 503; message = "Database tạm thời không khả dụng."; }
  } else if (error instanceof Prisma.PrismaClientInitializationError) { status = 503; message = "Không kết nối được database."; }
  if (status === 500) console.error("[API error]", error instanceof Error ? error.name : "UnknownError");
  const response = json({ statusCode: status, error: String(status), message }, status);
  if (status === 429) response.headers.set("Retry-After", "60");
  return response;
}
export async function transaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await prisma.$transaction(callback, { maxWait: 10_000, timeout: 20_000 }); }
    catch (error) {
      if (attempt < 2 && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") continue;
      throw error;
    }
  }
}
export async function lockUser(tx: Prisma.TransactionClient, userId: number) {
  await tx.$queryRaw`SELECT "UserID" FROM "Users" WHERE "UserID" = ${userId} FOR UPDATE`;
}
export function pagination(query: URLSearchParams) {
  const schema = z.coerce.number().int().min(1);
  const page = schema.max(1_000_000).parse(query.get("page") ?? 1);
  const pageSize = schema.max(100).parse(query.get("pageSize") ?? 20);
  return { page, pageSize, skip: (page - 1) * pageSize };
}
export function pageResult<T>(items: T[], totalCount: number, page: number, pageSize: number) {
  const totalPages = Math.ceil(totalCount / pageSize);
  return { items, totalCount, pageNumber: page, pageSize, totalPages, hasPreviousPage: page > 1, hasNextPage: page < totalPages };
}
export async function rateLimit(scope: string, identifier: string, limit: number, seconds = 60) {
  const window = Math.floor(Date.now() / (seconds * 1000));
  const row = await prisma.rateLimitWindow.upsert({
    where: { key: digest(`${scope}:${identifier}:${window}`) },
    create: { key: digest(`${scope}:${identifier}:${window}`), expiresAt: new Date((window + 1) * seconds * 1000) },
    update: { hits: { increment: 1 } },
  });
  requireCondition(row.hits <= limit, 429, "Bạn thao tác quá nhanh. Vui lòng thử lại sau.");
}
export function clientIdentifier(request: Request) {
  return process.env.TRUST_PROXY === "true" ? request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "anonymous" : "anonymous";
}
