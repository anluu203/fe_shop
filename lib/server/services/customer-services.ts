import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { numericId, requireCondition, transaction } from "../http";
import { components, consultationSchema, returnSchema, returnStatusSchema, usages } from "../validators";
import { money } from "../serializers";
import { vietnamDate } from "@/lib/services/reports";

const profileInclude = { book: true } as const;
function profileDto(row: Prisma.ConsultationProfileGetPayload<{ include: typeof profileInclude }>) {
  return { id: String(row.bookId), name: row.book.title, price: Number(money(row.book.sellingPrice)), component: row.component, usages: row.usages, specs: row.specs, reasons: row.reasons, isActive: row.isActive && row.book.isActive };
}
export async function consultationOptions() {
  const document = await prisma.seedDocument.findUnique({ where: { filename: "customer-services.json" } });
  const source = document?.payload as { usages?: unknown[]; components?: unknown[] } | undefined;
  return { usages: source?.usages ?? [], components: source?.components ?? [] };
}
export async function listConsultation() {
  return (await prisma.consultationProfile.findMany({ include: profileInclude, orderBy: { bookId: "asc" } })).map(profileDto);
}
export async function recommend(query: URLSearchParams) {
  const input = z.object({ usage: usages, component: components, budget: z.coerce.number().int().positive().max(999_999_999_999) }).parse(Object.fromEntries(query));
  const rows = await prisma.consultationProfile.findMany({ where: { isActive: true, component: input.component, book: { isActive: true, sellingPrice: { lte: input.budget } } }, include: profileInclude, orderBy: { book: { sellingPrice: "asc" } } });
  return rows.filter((row) => Array.isArray(row.usages) && row.usages.includes(input.usage)).map(profileDto);
}
export async function saveConsultation(body: z.infer<ReturnType<typeof consultationSchema.partial>>, id?: number) {
  const input = id ? body : consultationSchema.parse(body);
  const bookId = id ?? numericId(input.bookId!);
  requireCondition(!input.bookId || numericId(input.bookId) === bookId, 400, "Không được đổi sách của hồ sơ tư vấn.");
  requireCondition(await prisma.book.findUnique({ where: { id: bookId } }), 404, "Không tìm thấy sách.");
  const existing = await prisma.consultationProfile.findUnique({ where: { bookId } });
  if (id) requireCondition(existing, 404, "Không tìm thấy hồ sơ tư vấn.");
  const selectedUsages = input.usages ?? existing?.usages as string[];
  const reasons = (input.reasons ?? existing?.reasons) as Record<string, string>;
  requireCondition(selectedUsages.every((usage) => reasons[usage]?.trim()), 400, "Cần lý do cho từng nhu cầu đọc đã chọn.");
  const data = { component: input.component, usages: input.usages, specs: input.specs, reasons: input.reasons, isActive: input.isActive };
  const saved = id ? await prisma.consultationProfile.update({ where: { bookId }, data, include: profileInclude }) : await prisma.consultationProfile.create({ data: { bookId, component: input.component!, usages: input.usages!, specs: input.specs!, reasons: input.reasons!, isActive: input.isActive }, include: profileInclude });
  return profileDto(saved);
}

function returnDays() {
  const days = Number(process.env.RETURN_WINDOW_DAYS ?? 14);
  requireCondition(Number.isInteger(days) && days >= 1 && days <= 365, 503, "Cấu hình hạn đổi trả không hợp lệ.");
  return days;
}
function expiry(completedAt: Date) { return vietnamDate(new Date(completedAt.getTime() + returnDays() * 86_400_000)); }
const returnInclude = { events: { orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }] }, orderItem: { include: { order: true as const } }, refund: true as const };
function returnDto(row: Prisma.ReturnRequestGetPayload<{ include: typeof returnInclude }>) {
  return { id: String(row.id), ownerId: String(row.userId), productId: String(row.orderItemId), bookName: row.orderItem.bookTitle, quantity: row.quantity, contactName: row.contactName, phone: row.phone, description: row.description, status: row.status, resolution: row.resolution, restockQuantity: row.restockQuantity, refundAmount: row.refund ? money(row.refund.amount) : "0", createdAt: row.createdAt.toISOString(), timeline: row.events.map((event) => ({ status: event.status, date: event.createdAt.toISOString(), note: event.note })) };
}
export async function eligibleReturns(userId: number) {
  const today = vietnamDate();
  const items = await prisma.orderItem.findMany({ where: { order: { userId, status: "DELIVERED", completedAt: { not: null } } }, include: { order: true, returns: { where: { status: { not: "rejected" } } } }, orderBy: { id: "desc" } });
  return items.flatMap((item) => {
    const expiresAt = expiry(item.order.completedAt!);
    const remainingQuantity = item.quantity - item.returns.reduce((sum, request) => sum + request.quantity, 0);
    return today <= expiresAt && remainingQuantity > 0 ? [{ id: String(item.id), name: item.bookTitle, serial: `BS-COPY-${item.id}`, orderCode: item.order.seedKey ?? String(item.orderId), purchasedAt: vietnamDate(item.order.completedAt!), expiresAt, remainingQuantity }] : [];
  });
}
export async function listReturns(userId?: number) {
  return (await prisma.returnRequest.findMany({ where: userId ? { userId } : {}, include: returnInclude, orderBy: { id: "desc" } })).map(returnDto);
}
export async function getReturn(id: number, userId?: number) {
  const row = await prisma.returnRequest.findFirst({ where: { id, ...(userId ? { userId } : {}) }, include: returnInclude });
  requireCondition(row, 404, "Không tìm thấy phiếu đổi trả.");
  return returnDto(row);
}
export async function createReturn(userId: number, input: z.infer<typeof returnSchema>) {
  const orderItemId = numericId(input.productId);
  return transaction(async (tx) => {
    await tx.$queryRaw`SELECT "OrderItemID" FROM "Order_Items" WHERE "OrderItemID" = ${orderItemId} FOR UPDATE`;
    const item = await tx.orderItem.findFirst({ where: { id: orderItemId, order: { userId } }, include: { order: true, returns: { where: { status: { not: "rejected" } } } } });
    requireCondition(item?.order.status === "DELIVERED" && item.order.completedAt, 404, "Chỉ được đổi trả sách đã giao thuộc đơn của bạn.");
    requireCondition(vietnamDate() <= expiry(item.order.completedAt), 409, "Sách đã hết thời hạn đổi trả.");
    const used = item.returns.reduce((sum, row) => sum + row.quantity, 0);
    requireCondition(used + input.quantity <= item.quantity, 409, "Số lượng đổi trả vượt số lượng còn hợp lệ.");
    const created = await tx.returnRequest.create({ data: { userId, orderItemId, quantity: input.quantity, contactName: input.contactName, phone: input.phone, description: input.description, events: { create: { status: "received", actorId: userId, note: "Đã tiếp nhận yêu cầu đổi trả." } } }, include: returnInclude });
    return returnDto(created);
  });
}
export async function updateReturn(id: number, actorId: number, input: z.infer<typeof returnStatusSchema>) {
  return transaction(async (tx) => {
    const initial = await tx.returnRequest.findUnique({ where: { id } });
    requireCondition(initial, 404, "Không tìm thấy phiếu đổi trả.");
    await tx.$queryRaw`SELECT "OrderItemID" FROM "Order_Items" WHERE "OrderItemID" = ${initial.orderItemId} FOR UPDATE`;
    await tx.$queryRaw`SELECT "id" FROM "Return_Requests" WHERE "id" = ${id} FOR UPDATE`;
    const row = await tx.returnRequest.findUniqueOrThrow({ where: { id }, include: returnInclude });
    if (row.status === input.status) return returnDto(row);
    const next: Record<string, string> = { received: "checking", checking: "repairing", repairing: "completed" };
    requireCondition(next[row.status] === input.status || (input.status === "rejected" && ["received", "checking", "repairing"].includes(row.status)), 409, "Không được bỏ bước hoặc sửa phiếu đã kết thúc.");
    const restockQuantity = input.restockQuantity ?? 0;
    requireCondition(restockQuantity <= row.quantity, 400, "Số lượng nhập lại vượt số đã đổi trả.");
    if (input.status === "completed") {
      requireCondition(input.resolution, 400, "Cần chọn đổi sách hoặc hoàn tiền.");
      const replacement = input.resolution === "exchange" ? numericId(input.replacementBookId ?? String(row.orderItem.bookId)) : null;
      for (const bookId of [...new Set([row.orderItem.bookId, ...(replacement ? [replacement] : [])])].sort((a, b) => a - b)) await tx.$queryRaw`SELECT "BookID" FROM "Books" WHERE "BookID" = ${bookId} FOR UPDATE`;
      if (restockQuantity > 0) {
        await tx.book.update({ where: { id: row.orderItem.bookId }, data: { stockQuantity: { increment: restockQuantity } } });
        await tx.inventoryMovement.create({ data: { bookId: row.orderItem.bookId, delta: restockQuantity, referenceKey: `return:${id}`, actorId, reason: "Admin xác nhận sách trả có thể bán lại" } });
      }
      if (replacement) {
        const changed = await tx.book.updateMany({ where: { id: replacement, isActive: true, stockQuantity: { gte: row.quantity } }, data: { stockQuantity: { decrement: row.quantity } } });
        requireCondition(changed.count, 409, "Không đủ tồn kho sách thay thế.");
        await tx.inventoryMovement.create({ data: { bookId: replacement, delta: -row.quantity, referenceKey: `exchange:${id}`, actorId, reason: "Xuất sách thay thế cho phiếu đổi trả" } });
      } else {
        requireCondition(row.orderItem.order.paymentMethod === "COD" && row.orderItem.order.paymentStatus === "PAID" && input.refundConfirmed === true, 400, "Cần đơn COD đã thu tiền và xác nhận đã hoàn tiền thủ công.");
        await tx.refundRecord.create({ data: { requestId: id, amount: row.orderItem.unitPrice.mul(row.quantity), actorId, note: input.note } });
      }
      await tx.returnRequest.update({ where: { id }, data: { resolution: input.resolution, restockQuantity, replacementBookId: replacement } });
    }
    const updated = await tx.returnRequest.update({ where: { id }, data: { status: input.status, events: { create: { status: input.status, note: input.note, actorId } } }, include: returnInclude });
    return returnDto(updated);
  });
}
