import { z } from "zod";
import type { Prisma, User } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { digest, lockUser, pageResult, pagination, requireCondition, transaction } from "../http";
import { addCartSchema, checkoutSchema, orderStatusSchema } from "../validators";
import { money, orderInclude, publicOrder, statusToDb } from "../serializers";

async function cartDto(db: Prisma.TransactionClient, userId: number) {
  const rows = await db.cartItem.findMany({ where: { userId }, include: { book: true }, orderBy: { id: "asc" } });
  return {
    id: rows.length ? String(userId) : null, userId: String(userId), status: "AddingItem" as const,
    totalPrice: rows.reduce((sum, item) => sum + BigInt(money(item.book.sellingPrice)) * BigInt(item.quantity), BigInt(0)).toString(),
    items: rows.map((item) => ({ id: String(item.id), orderId: String(userId), productId: String(item.bookId), quantity: item.quantity, unitPrice: money(item.book.sellingPrice), product: { id: String(item.bookId), name: item.book.title, price: money(item.book.sellingPrice), imageUrl: item.book.coverImage, isActive: item.book.isActive, stockQuantity: item.book.stockQuantity }, createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() })),
  };
}
export const getCart = (userId: number) => cartDto(prisma, userId);
export async function changeCart(userId: number, operation: "add" | "update" | "remove" | "clear", body?: z.infer<typeof addCartSchema>, itemId?: number) {
  return transaction(async (tx) => {
    await lockUser(tx, userId);
    if (operation === "clear") await tx.cartItem.deleteMany({ where: { userId } });
    else if (operation === "remove") {
      const removed = await tx.cartItem.deleteMany({ where: { userId, id: itemId } });
      requireCondition(removed.count, 404, "Không tìm thấy sản phẩm trong giỏ.");
    } else {
      const previous = operation === "update" ? await tx.cartItem.findFirst({ where: { userId, id: itemId } }) : await tx.cartItem.findUnique({ where: { userId_bookId: { userId, bookId: Number(body!.productId) } } });
      if (operation === "update") requireCondition(previous, 404, "Không tìm thấy sản phẩm trong giỏ.");
      const bookId = previous?.bookId ?? Number(body!.productId);
      const book = await tx.book.findUnique({ where: { id: bookId } });
      requireCondition(book?.isActive, 404, "Sách không còn được bán.");
      const quantity = body!.quantity + (operation === "add" ? previous?.quantity ?? 0 : 0);
      requireCondition(quantity <= 999 && quantity <= book.stockQuantity, 409, "Số lượng vượt tồn kho hoặc giới hạn 999 cuốn.");
      await tx.cartItem.upsert({ where: { userId_bookId: { userId, bookId } }, update: { quantity }, create: { userId, bookId, quantity } });
    }
    return cartDto(tx, userId);
  });
}
export async function checkout(user: User, body: z.infer<typeof checkoutSchema>, key: string | null) {
  requireCondition(key && /^[\w-]{8,100}$/.test(key), 400, "Yêu cầu Idempotency-Key (8–100 ký tự).");
  const requestHash = digest(JSON.stringify(body));
  return transaction(async (tx) => {
    await lockUser(tx, user.id);
    const previous = await tx.checkoutRequest.findUnique({ where: { userId_key: { userId: user.id, key } }, include: { order: { include: orderInclude } } });
    if (previous) { requireCondition(previous.requestHash === requestHash, 409, "Idempotency-Key đã được dùng với nội dung khác."); return publicOrder(previous.order); }
    const cart = await tx.cartItem.findMany({ where: { userId: user.id }, orderBy: { bookId: "asc" } });
    requireCondition(cart.length, 400, "Giỏ hàng đang trống.");
    const items: { bookId: number; bookTitle: string; bookImage: string | null; quantity: number; unitPrice: Prisma.Decimal }[] = [];
    let total = BigInt(0);
    for (const item of cart) {
      await tx.$queryRaw`SELECT "BookID" FROM "Books" WHERE "BookID" = ${item.bookId} FOR UPDATE`;
      const book = await tx.book.findUnique({ where: { id: item.bookId } });
      requireCondition(book?.isActive && book.stockQuantity >= item.quantity, 409, "Có sách đã hết hàng, bị ẩn hoặc không đủ tồn kho. Hãy cập nhật giỏ.");
      const changed = await tx.book.updateMany({ where: { id: book.id, isActive: true, stockQuantity: { gte: item.quantity } }, data: { stockQuantity: { decrement: item.quantity } } });
      requireCondition(changed.count, 409, "Tồn kho vừa thay đổi, vui lòng thử lại.");
      total += BigInt(money(book.sellingPrice)) * BigInt(item.quantity);
      items.push({ bookId: book.id, bookTitle: book.title, bookImage: book.coverImage, quantity: item.quantity, unitPrice: book.sellingPrice });
    }
    requireCondition(total <= BigInt("999999999999"), 400, "Tổng tiền đơn vượt giới hạn.");
    const order = await tx.order.create({ data: { userId: user.id, ...body, totalAmount: total.toString(), items: { create: items }, events: { create: { status: "PENDING", actorId: user.id, note: "Khách hàng đặt đơn COD." } } }, include: orderInclude });
    for (const item of cart) await tx.inventoryMovement.create({ data: { bookId: item.bookId, delta: -item.quantity, reason: "Checkout", referenceKey: `sale:${order.id}:${item.bookId}`, actorId: user.id } });
    await tx.cartItem.deleteMany({ where: { userId: user.id, id: { in: cart.map((item) => item.id) } } });
    await tx.checkoutRequest.create({ data: { userId: user.id, key, requestHash, orderId: order.id } });
    return publicOrder(order);
  });
}
export async function orderHistory(userId: number) {
  return (await prisma.order.findMany({ where: { userId }, include: orderInclude, orderBy: [{ orderDate: "desc" }, { id: "desc" }] })).map((order) => publicOrder(order));
}
export async function orderDetail(id: number, userId: number, admin = false) {
  const order = await prisma.order.findFirst({ where: { id, ...(admin ? {} : { userId }) }, include: orderInclude });
  requireCondition(order, 404, "Không tìm thấy đơn hàng.");
  return publicOrder(order, admin);
}
export async function adminOrders(query: URLSearchParams) {
  const { page, pageSize, skip } = pagination(query);
  const inputStatus = query.get("status");
  if (inputStatus) requireCondition(Object.hasOwn(statusToDb, inputStatus), 400, "Trạng thái lọc không hợp lệ.");
  const where = inputStatus ? { status: statusToDb[inputStatus as keyof typeof statusToDb] } : {};
  const [orders, count] = await prisma.$transaction([prisma.order.findMany({ where, include: orderInclude, skip, take: pageSize, orderBy: [{ orderDate: "desc" }, { id: "desc" }] }), prisma.order.count({ where })]);
  return pageResult(orders.map((order) => publicOrder(order, true)), count, page, pageSize);
}
export async function changeOrderStatus(id: number, user: User, body: z.infer<typeof orderStatusSchema>, admin = false) {
  return transaction(async (tx) => {
    await tx.$queryRaw`SELECT "OrderID" FROM "Orders" WHERE "OrderID" = ${id} FOR UPDATE`;
    const order = await tx.order.findFirst({ where: { id, ...(admin ? {} : { userId: user.id }) }, include: orderInclude });
    requireCondition(order, 404, "Không tìm thấy đơn hàng.");
    const next = statusToDb[body.status];
    if (order.status === next) return publicOrder(order, admin);
    if (next === "CANCELLED") {
      requireCondition(order.status === "PENDING" || (admin && order.status === "PREPARING"), 409, "Đơn này không thể hủy ở trạng thái hiện tại.");
      for (const item of [...order.items].sort((a, b) => a.bookId - b.bookId)) {
        const sale = await tx.inventoryMovement.findUnique({ where: { referenceKey: `sale:${id}:${item.bookId}` } });
        // Imported demo orders never deducted stock. Do not invent stock on cancellation.
        if (!sale && order.seedKey) continue;
        requireCondition(sale?.delta === -item.quantity, 409, "Thiếu bút toán tồn kho của đơn. Cần đối soát trước khi hủy.");
        await tx.book.update({ where: { id: item.bookId }, data: { stockQuantity: { increment: item.quantity } } });
        await tx.inventoryMovement.create({ data: { bookId: item.bookId, delta: item.quantity, referenceKey: `cancel:${id}:${item.bookId}`, reason: "Hủy đơn trước giao hàng", actorId: user.id } });
      }
    } else {
      requireCondition(admin, 403, "Chỉ admin được cập nhật trạng thái.");
      const allowed = { PENDING: "PREPARING", PREPARING: "SHIPPING", SHIPPING: "DELIVERED" };
      requireCondition(allowed[order.status as keyof typeof allowed] === next, 409, "Không được bỏ bước hoặc quay lại trạng thái cũ.");
      if (next === "DELIVERED") requireCondition(body.paymentCollected === true, 400, "Cần xác nhận đã thu tiền COD khi hoàn thành đơn.");
    }
    const changed = await tx.order.update({ where: { id }, data: {
      status: next, ...(next === "DELIVERED" ? { completedAt: order.completedAt ?? new Date(), paymentStatus: "PAID" } : {}),
      events: { create: { status: next, actorId: user.id, note: body.note ?? "" } },
    }, include: orderInclude });
    return publicOrder(changed, admin);
  });
}
