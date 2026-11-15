"use client";

import { useState } from "react";
import type { Order } from "../../lib/types";
import { adminOrderApi } from "../../lib/api/admin-orders";
import { formatPrice } from "../../lib/utils/format";
import Modal from "../ui/Modal";
import Button from "../ui/Button";

export default function OrderRefundActions({ order, onUpdate }: { order: Order; onUpdate: (order: Order) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const refund = order.paymentRefunds?.find((row) => row.id === selected);
  async function submit() {
    if (!refund || !confirmed || !reference.trim() || !note.trim() || busy) return;
    setBusy(true); setError("");
    try {
      onUpdate(await adminOrderApi.confirmRefund(order.id!, refund.id, { reference: reference.trim(), note: note.trim(), refundConfirmed: true }));
      setSelected(null);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Không xác nhận được hoàn tiền."); }
    finally { setBusy(false); }
  }
  return <>
    <div className="order-payment-actions">
      {order.paymentRefunds?.filter((row) => row.status === "PENDING").map((row) => <Button key={row.id} variant="outline" onClick={() => { setSelected(row.id); setReference(""); setNote(""); setConfirmed(false); setError(""); }}>Xác nhận hoàn {formatPrice(row.amount)}</Button>)}
    </div>
    <Modal open={Boolean(refund)} onClose={() => { if (!busy) setSelected(null); }} title="Xác nhận đã hoàn tiền" footer={<><Button variant="ghost" disabled={busy} onClick={() => setSelected(null)}>Đóng</Button><Button loading={busy} disabled={!confirmed || !reference.trim() || !note.trim()} onClick={() => void submit()}>Lưu xác nhận</Button></>}>
      <p>Khoản cần hoàn: <strong>{formatPrice(refund?.amount ?? "0")}</strong>.</p>
      <p>Thực hiện chuyển trả tiền cho khách trước khi xác nhận tại đây.</p>
      <label className="order-payment-field">Mã giao dịch hoàn tiền<input value={reference} onChange={(event) => setReference(event.target.value)} maxLength={150} disabled={busy} /></label>
      <label className="order-payment-field">Ghi chú đối soát<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} rows={3} disabled={busy} /></label>
      <label><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={busy} /> Tôi xác nhận đã hoàn đủ tiền cho khách</label>
      {error && <p role="alert" className="order-payment-error">{error}</p>}
    </Modal>
  </>;
}
