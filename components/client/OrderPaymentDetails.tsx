"use client";

import type { Order } from "../../lib/types";
import { formatDate, formatPrice } from "../../lib/utils/format";

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  UNPAID: "Chưa thanh toán", PAID: "Đã thanh toán", REFUND_PENDING: "Chờ hoàn tiền", REFUNDED: "Đã hoàn tiền",
};
const ATTEMPT_LABEL: Record<string, string> = { PENDING: "Đang chờ thanh toán", SUCCEEDED: "Thành công", FAILED: "Không thành công", EXPIRED: "Link đã hết hạn" };
const METHOD_LABEL: Record<string, string> = { COD: "Tiền mặt khi nhận hàng (COD)", VNPAY: "VNPay", BANK_TRANSFER: "Chuyển khoản", E_WALLET: "Ví điện tử" };

export default function OrderPaymentDetails({ order, admin = false }: { order: Order; admin?: boolean }) {
  return <section className="order-payment-panel" aria-label="Thông tin thanh toán">
    <h2>Thông tin thanh toán</h2>
    <p>Phương thức: <strong>{METHOD_LABEL[order.paymentMethod ?? "COD"] ?? order.paymentMethod}</strong></p>
    <p>Trạng thái: <strong>{PAYMENT_STATUS_LABEL[order.paymentStatus ?? "UNPAID"] ?? order.paymentStatus}</strong></p>
    {order.shippingName && <p>Người nhận: {order.shippingName} · {order.shippingPhone}</p>}
    {order.shippingAddress && <p>Địa chỉ: {order.shippingAddress}</p>}
    {!!order.paymentRefunds?.length && <div className="order-payment-history">
      <h3>Hoàn tiền</h3>
      {order.paymentRefunds.map((refund) => <div key={refund.id} className="order-payment-record">
        <p><strong>{formatPrice(refund.amount)}</strong> · {refund.status === "REFUNDED" ? "Đã hoàn tiền" : "Chờ cửa hàng hoàn tiền"}</p>
        <p>{refund.reason}{refund.confirmedAt ? ` · ${formatDate(refund.confirmedAt)}` : ""}</p>
        {admin && refund.reference && <p>Mã đối soát: {refund.reference} · {refund.note}</p>}
      </div>)}
    </div>}
    {!!order.payments?.length && <details className="order-payment-history"><summary>Lịch sử thanh toán ({order.payments.length})</summary>
      {order.payments.map((payment) => <div key={payment.id} className="order-payment-record">
        <p>{formatPrice(payment.amount)} · {ATTEMPT_LABEL[payment.status] ?? payment.status} · {formatDate(payment.createdAt)}</p>
        {admin && <p>Mã tham chiếu: {payment.id}{payment.gatewayTransactionNo ? ` · Mã VNPay: ${payment.gatewayTransactionNo}` : ""}</p>}
      </div>)}
    </details>}
    {!!order.events?.length && <details className="order-payment-history"><summary>Lịch sử đơn hàng</summary>
      {order.events.map((event, index) => <p key={`${event.createdAt}-${index}`} className="order-payment-record">{formatDate(event.createdAt)} · {event.note}</p>)}
    </details>}
  </section>;
}
