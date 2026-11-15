import { createHmac, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

export const VNPAY_SANDBOX_URL = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
export const PAYMENT_TTL_MS = 15 * 60 * 1000;

export function vnpayConfig() {
  const tmnCode = process.env.VNPAY_TMN_CODE?.trim();
  const secret = process.env.VNPAY_HASH_SECRET?.trim();
  try {
    const appUrl = new URL(process.env.APP_URL ?? "");
    const paymentUrl = new URL(process.env.VNPAY_URL || VNPAY_SANDBOX_URL);
    if (!tmnCode || !/^[a-zA-Z0-9]{8}$/.test(tmnCode) || !secret || !["http:", "https:"].includes(appUrl.protocol) || appUrl.username || appUrl.password || paymentUrl.origin !== "https://sandbox.vnpayment.vn" || paymentUrl.pathname !== "/paymentv2/vpcpay.html" || paymentUrl.username || paymentUrl.password || paymentUrl.search || paymentUrl.hash) return null;
    return { tmnCode, secret, appUrl: appUrl.origin, paymentUrl: paymentUrl.href };
  } catch { return null; }
}

// VNPay 2.1.0 signs sorted, URL-encoded fields, with spaces encoded as '+'.
export function signedQuery(fields: Record<string, string>, secret: string) {
  const encode = (value: string) => encodeURIComponent(value).replace(/%20/g, "+");
  const data = Object.keys(fields).sort().map((key) => `${encode(key)}=${encode(fields[key])}`).join("&");
  return { data, hash: createHmac("sha512", secret).update(data, "utf8").digest("hex") };
}

export function verifiedVnpayFields(query: URLSearchParams, config: NonNullable<ReturnType<typeof vnpayConfig>>) {
  const fields: Record<string, string> = {};
  for (const [key, value] of query) {
    if (!key.startsWith("vnp_")) continue;
    if (query.getAll(key).length !== 1) return null;
    if (key !== "vnp_SecureHash" && key !== "vnp_SecureHashType") fields[key] = value;
  }
  const signature = query.get("vnp_SecureHash") ?? "";
  if (!/^[a-fA-F0-9]{128}$/.test(signature)) return null;
  const expected = signedQuery(fields, config.secret).hash;
  if (!timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"))) return null;
  if (fields.vnp_TmnCode !== config.tmnCode || !/^[a-zA-Z0-9-]{1,100}$/.test(fields.vnp_TxnRef ?? "") || !/^\d{1,12}$/.test(fields.vnp_Amount ?? "") || !/^\d{2}$/.test(fields.vnp_ResponseCode ?? "") || !/^\d{2}$/.test(fields.vnp_TransactionStatus ?? "") || !/^\d{1,15}$/.test(fields.vnp_TransactionNo ?? "")) return null;
  return fields;
}

export function vnpayDate(date: Date) {
  return new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 19).replace(/[-T:]/g, "");
}

export function paymentAmount(amount: string) {
  const result = BigInt(amount) * BigInt(100);
  if (result <= BigInt(0) || result.toString().length > 12) throw new Error("Số tiền vượt giới hạn thanh toán VNPay.");
  return result.toString();
}

export function paymentIp(request: Request) {
  // Forwarded addresses are used only behind the explicitly trusted proxy.
  const forwarded = process.env.TRUST_PROXY === "true" ? request.headers.get("x-forwarded-for")?.split(",")[0].trim() : undefined;
  return forwarded && isIP(forwarded) ? forwarded : "127.0.0.1";
}

export function createPaymentUrl(config: NonNullable<ReturnType<typeof vnpayConfig>>, input: { id: string; orderId: number; amount: string; createdAt: Date; expiresAt: Date; ip: string }) {
  const { data, hash } = signedQuery({
    vnp_Version: "2.1.0", vnp_Command: "pay", vnp_TmnCode: config.tmnCode,
    vnp_Amount: paymentAmount(input.amount), vnp_CurrCode: "VND", vnp_TxnRef: input.id,
    vnp_OrderInfo: `Thanh toan don hang ${input.orderId}`, vnp_OrderType: "other",
    vnp_Locale: "vn", vnp_ReturnUrl: `${config.appUrl}/api/v1/payments/vnpay/return`,
    vnp_CreateDate: vnpayDate(input.createdAt), vnp_ExpireDate: vnpayDate(input.expiresAt), vnp_IpAddr: input.ip,
  }, config.secret);
  return `${config.paymentUrl}?${data}&vnp_SecureHash=${hash}`;
}
