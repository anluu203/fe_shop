import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { json, requireCondition, transaction } from "../http";
import { money, orderInclude, publicOrder } from "../serializers";
import { createPaymentUrl, paymentAmount, paymentIp, PAYMENT_TTL_MS, verifiedVnpayFields, vnpayConfig } from "../vnpay";

export function paymentMethods() {
  return { codAvailable: true, vnpayAvailable: Boolean(vnpayConfig()) };
}

export async function startPayment(orderId: number, userId: number, request: Request) {
  const config = vnpayConfig();
  requireCondition(config, 503, "VNPay chưa được cấu hình. Vui lòng chọn COD hoặc liên hệ cửa hàng.");
  return transaction(async (tx) => {
    await tx.$queryRaw`SELECT "OrderID" FROM "Orders" WHERE "OrderID" = ${orderId} FOR UPDATE`;
    const order = await tx.order.findFirst({ where: { id: orderId, userId } });
    requireCondition(order, 404, "Không tìm thấy đơn hàng.");
    requireCondition(order.paymentMethod === "VNPAY" && order.status === "PENDING" && order.paymentStatus === "UNPAID", 409, "Đơn này không thể tạo thanh toán VNPay.");
    const now = new Date();
    await tx.paymentAttempt.updateMany({ where: { orderId, status: "PENDING", expiresAt: { lte: now } }, data: { status: "EXPIRED" } });
    const previous = await tx.paymentAttempt.findFirst({ where: { orderId, status: "PENDING", expiresAt: { gt: now } }, orderBy: { createdAt: "desc" } });
    if (previous) return { paymentUrl: previous.paymentUrl, expiresAt: previous.expiresAt.toISOString() };
    const expiresAt = new Date(now.getTime() + PAYMENT_TTL_MS);
    const id = randomUUID();
    const paymentUrl = createPaymentUrl(config, { id, orderId, amount: money(order.totalAmount), createdAt: now, expiresAt, ip: paymentIp(request) });
    await tx.paymentAttempt.create({ data: { id, orderId, amount: order.totalAmount, paymentUrl, expiresAt } });
    return { paymentUrl, expiresAt: expiresAt.toISOString() };
  });
}

// Caller holds the order row lock. Each captured payment can be refunded once.
export async function queuePaymentRefunds(tx: Prisma.TransactionClient, orderId: number) {
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { payments: { where: { status: "SUCCEEDED" } } } });
  for (const payment of order.payments) {
    if (order.status !== "CANCELLED" && payment.applied) continue;
    await tx.orderPaymentRefund.upsert({
      where: { referenceKey: `payment:${payment.id}` }, update: {},
      create: { orderId, paymentId: payment.id, referenceKey: `payment:${payment.id}`, amount: payment.amount, reason: order.status === "CANCELLED" ? "Hoàn tiền đơn đã hủy" : "Hoàn giao dịch thanh toán trùng" },
    });
  }
  // Retain correct accounting for historical orders with no payment-attempt ledger.
  if (order.status === "CANCELLED" && order.paymentStatus === "PAID" && !order.payments.length && order.totalAmount.gt(0)) {
    await tx.orderPaymentRefund.upsert({ where: { referenceKey: `legacy:${orderId}` }, update: {}, create: { orderId, referenceKey: `legacy:${orderId}`, amount: order.totalAmount, reason: "Hoàn tiền đơn đã hủy" } });
  }
  if (order.status === "CANCELLED") {
    const refunds = await tx.orderPaymentRefund.findMany({ where: { orderId } });
    if (refunds.length) await tx.order.update({ where: { id: orderId }, data: { paymentStatus: refunds.some((refund) => refund.status === "PENDING") ? "REFUND_PENDING" : "REFUNDED" } });
  }
}

const ipnResult = (RspCode: string, Message: string) => json({ RspCode, Message });
export async function receiveVnpay(query: URLSearchParams) {
  const config = vnpayConfig();
  if (!config) return ipnResult("99", "Payment service unavailable");
  const fields = verifiedVnpayFields(query, config);
  if (!fields) return ipnResult("97", "Invalid signature or parameters");
  try {
    return await transaction(async (tx) => {
      const initial = await tx.paymentAttempt.findUnique({ where: { id: fields.vnp_TxnRef } });
      if (!initial) return ipnResult("01", "Order not found");
      await tx.$queryRaw`SELECT "OrderID" FROM "Orders" WHERE "OrderID" = ${initial.orderId} FOR UPDATE`;
      const payment = await tx.paymentAttempt.findUniqueOrThrow({ where: { id: initial.id } });
      const order = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId } });
      if (order.paymentMethod !== "VNPAY" || paymentAmount(money(payment.amount)) !== BigInt(fields.vnp_Amount).toString()) return ipnResult("04", "Invalid amount");
      const success = fields.vnp_ResponseCode === "00" && fields.vnp_TransactionStatus === "00";
      if (payment.status === "SUCCEEDED") return ipnResult("02", "Order already confirmed");
      if (!success && payment.status === "FAILED") return ipnResult("02", "Order already confirmed");
      if (success && (fields.vnp_TransactionNo === "0" || await tx.paymentAttempt.findUnique({ where: { gatewayTransactionNo: fields.vnp_TransactionNo } }))) return ipnResult("99", "Transaction reference conflict");
      const applied = success && order.status !== "CANCELLED" && !await tx.paymentAttempt.count({ where: { orderId: order.id, status: "SUCCEEDED", applied: true } });
      await tx.paymentAttempt.update({ where: { id: payment.id }, data: {
        status: success ? "SUCCEEDED" : "FAILED", responseCode: fields.vnp_ResponseCode,
        ...(success ? { gatewayTransactionNo: fields.vnp_TransactionNo, paidAt: new Date(), applied } : {}),
      } });
      if (applied) await tx.order.update({ where: { id: order.id }, data: { paymentStatus: "PAID" } });
      if (success) {
        // A late success remains a real captured payment, even after cancellation/expiry.
        await tx.paymentAttempt.updateMany({ where: { orderId: order.id, status: "PENDING" }, data: { status: "EXPIRED" } });
        await queuePaymentRefunds(tx, order.id);
      }
      await tx.orderEvent.create({ data: { orderId: order.id, status: order.status, note: success ? (applied ? "VNPay xác nhận đã thanh toán." : "VNPay báo thu tiền; giao dịch đã được ghi nhận chờ hoàn.") : "Thanh toán VNPay không thành công. Có thể thanh toán lại." } });
      return ipnResult("00", "Confirm Success");
    });
  } catch {
    console.error("[VNPay IPN] Cannot persist notification; provider should retry.");
    return ipnResult("99", "Please retry");
  }
}

export async function vnpayReturn(query: URLSearchParams) {
  const config = vnpayConfig();
  requireCondition(config, 503, "VNPay chưa được cấu hình.");
  const fields = verifiedVnpayFields(query, config);
  requireCondition(fields, 400, "Kết quả VNPay không hợp lệ.");
  const payment = await prisma.paymentAttempt.findUnique({ where: { id: fields.vnp_TxnRef } });
  requireCondition(payment && paymentAmount(money(payment.amount)) === BigInt(fields.vnp_Amount).toString(), 400, "Không tìm thấy giao dịch hợp lệ.");
  const result = fields.vnp_ResponseCode === "00" && fields.vnp_TransactionStatus === "00" ? "pending" : "failed";
  // Browser redirects are informational. Only IPN changes payment state.
  return new Response(null, { status: 303, headers: { Location: `${config.appUrl}/client/orders/${payment.orderId}?payment=${result}`, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}

export async function confirmPaymentRefund(orderId: number, refundId: number, actorId: number, body: { reference: string; note: string; refundConfirmed: true }) {
  return transaction(async (tx) => {
    await tx.$queryRaw`SELECT "OrderID" FROM "Orders" WHERE "OrderID" = ${orderId} FOR UPDATE`;
    const refund = await tx.orderPaymentRefund.findFirst({ where: { id: refundId, orderId } });
    requireCondition(refund, 404, "Không tìm thấy khoản cần hoàn tiền.");
    if (refund.status === "REFUNDED") requireCondition(refund.reference === body.reference && refund.note === body.note, 409, "Khoản này đã được xác nhận hoàn với thông tin khác.");
    else {
      await tx.orderPaymentRefund.update({ where: { id: refundId }, data: { status: "REFUNDED", reference: body.reference, note: body.note, confirmedBy: actorId, confirmedAt: new Date() } });
      const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
      await tx.orderEvent.create({ data: { orderId, status: order.status, actorId, note: `Đã hoàn ${money(refund.amount)} VND. Mã đối soát: ${body.reference}. ${body.note}` } });
    }
    await queuePaymentRefunds(tx, orderId);
    return publicOrder(await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: orderInclude }), true);
  });
}
