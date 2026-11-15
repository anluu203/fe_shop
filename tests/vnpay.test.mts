import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { createPaymentUrl, paymentAmount, paymentIp, signedQuery, verifiedVnpayFields, vnpayConfig, vnpayDate } from "../lib/server/vnpay";

const config = { tmnCode: "TEST1234", secret: "payment-test-secret", appUrl: "https://shop.example", paymentUrl: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html" };
test("VNPay signing encodes sorted values exactly once and uses GMT+7 dates", () => {
  const expected = "a=hello+world%2B%26&z=%C4%91";
  const signed = signedQuery({ z: "đ", a: "hello world+&" }, config.secret);
  assert.equal(signed.data, expected);
  assert.equal(signed.hash, createHmac("sha512", config.secret).update(expected).digest("hex"));
  assert.equal(vnpayDate(new Date("2026-11-15T18:30:00Z")), "20261116013000");
  assert.equal(paymentAmount("90000"), "9000000");
  assert.equal(paymentAmount("9999999999"), "999999999900");
  for (const amount of ["0", "-1", "10000000000"]) assert.throws(() => paymentAmount(amount));
});

test("VNPay URL contains immutable amount, unique reference, return URL and expiry", () => {
  const payment = new URL(createPaymentUrl(config, { id: "payment-123", orderId: 123, amount: "90000", createdAt: new Date("2026-11-15T12:00:00Z"), expiresAt: new Date("2026-11-15T12:15:00Z"), ip: "127.0.0.1" }));
  assert.equal(payment.origin, "https://sandbox.vnpayment.vn");
  assert.equal(payment.searchParams.get("vnp_CreateDate"), "20261115190000");
  assert.equal(payment.searchParams.get("vnp_ExpireDate"), "20261115191500");
  assert.equal(payment.searchParams.get("vnp_ReturnUrl"), "https://shop.example/api/v1/payments/vnpay/return");
  assert.equal(payment.searchParams.get("vnp_TxnRef"), "payment-123");
  assert.equal(payment.searchParams.get("vnp_Amount"), "9000000");
});

test("callback verification rejects tampering, duplicate parameters and wrong merchant", () => {
  const fields = { vnp_TmnCode: config.tmnCode, vnp_TxnRef: "payment-123", vnp_Amount: "9000000", vnp_ResponseCode: "00", vnp_TransactionStatus: "00", vnp_TransactionNo: "123456" };
  const sign = (values: Record<string, string>) => { const result = signedQuery(values, config.secret); return new URLSearchParams(`${result.data}&vnp_SecureHash=${result.hash}`); };
  assert.ok(verifiedVnpayFields(sign(fields), config));
  const changed = sign(fields); changed.set("vnp_Amount", "1");
  assert.equal(verifiedVnpayFields(changed, config), null);
  const duplicate = sign(fields); duplicate.append("vnp_Amount", fields.vnp_Amount);
  assert.equal(verifiedVnpayFields(duplicate, config), null);
  assert.equal(verifiedVnpayFields(sign({ ...fields, vnp_TmnCode: "OTHER123" }), config), null);
  const invalid = sign(fields); invalid.set("vnp_SecureHash", "xx");
  assert.equal(verifiedVnpayFields(invalid, config), null);
});

test("VNPay availability requires server credentials and restricts redirects to sandbox", () => {
  const saved = { ...process.env };
  try {
    delete process.env.VNPAY_TMN_CODE; delete process.env.VNPAY_HASH_SECRET;
    assert.equal(vnpayConfig(), null);
    Object.assign(process.env, { VNPAY_TMN_CODE: config.tmnCode, VNPAY_HASH_SECRET: config.secret, APP_URL: config.appUrl, VNPAY_URL: config.paymentUrl });
    assert.ok(vnpayConfig());
    process.env.VNPAY_URL = "https://attacker.example/pay"; assert.equal(vnpayConfig(), null);
    process.env.VNPAY_URL = config.paymentUrl; process.env.APP_URL = "javascript:alert(1)"; assert.equal(vnpayConfig(), null);
    process.env.TRUST_PROXY = "false";
    assert.equal(paymentIp(new Request(config.appUrl, { headers: { "x-forwarded-for": "1.1.1.1" } })), "127.0.0.1");
    process.env.TRUST_PROXY = "true";
    assert.equal(paymentIp(new Request(config.appUrl, { headers: { "x-forwarded-for": "1.1.1.1, 2.2.2.2" } })), "1.1.1.1");
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
  }
});
