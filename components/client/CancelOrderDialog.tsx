"use client";

import { useState } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";

export default function CancelOrderDialog({ open, paid, onClose, onConfirm }: { open: boolean; paid: boolean; onClose: () => void; onConfirm: (reason: string) => Promise<void> }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    if (!reason.trim() || busy) return;
    setBusy(true); setError("");
    try { await onConfirm(reason.trim()); setReason(""); onClose(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Không hủy được đơn."); }
    finally { setBusy(false); }
  }
  return <Modal open={open} onClose={() => { if (!busy) onClose(); }} title="Xác nhận hủy đơn hàng" footer={<><Button variant="ghost" disabled={busy} onClick={onClose}>Giữ đơn</Button><Button loading={busy} disabled={!reason.trim()} onClick={() => void submit()}>Xác nhận hủy</Button></>}>
    <p>Đơn sẽ ngừng xử lý và số lượng sách được trả về kho.</p>
    {paid && <p className="order-payment-notice">Đơn đã thanh toán. Cửa hàng sẽ hoàn tiền thủ công; bạn có thể theo dõi tiến độ tại chi tiết đơn.</p>}
    <label className="order-payment-field">Lý do hủy<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={2000} rows={3} disabled={busy} /></label>
    {error && <p role="alert" className="order-payment-error">{error}</p>}
  </Modal>;
}
