"use client";
import { useRef, useState } from "react";
import { productApi } from "../../lib/api/products";
import type { Product } from "../../lib/types";
import { USE_MOCK } from "../../lib/mock/config";

export default function StockAdjustment({ product, onUpdated }: { product: Product; onUpdated: (product: Product) => void }) {
  const [delta, setDelta] = useState(""), [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const pending = useRef<{ key: string; body: string } | null>(null);
  if (USE_MOCK) return null;
  return <form className="mt-6 space-y-3 rounded-xl border p-5" onSubmit={async (event) => {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError("");
    const body = { delta: Number(delta), reason: reason.trim() };
    const encoded = JSON.stringify(body);
    if (pending.current?.body !== encoded) pending.current = { key: crypto.randomUUID(), body: encoded };
    try { onUpdated(await productApi.adjustStock(product.id, body, pending.current!.key)); pending.current = null; setDelta(""); setReason(""); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Không cập nhật được tồn kho."); }
    finally { setBusy(false); }
  }}>
    <h3 className="font-bold">Tồn kho hiện tại: {product.stockQuantity ?? 0} cuốn</h3>
    <label className="block">Số lượng điều chỉnh (số dương để nhập, số âm để giảm)<input className="mt-1 w-full rounded border p-2" required type="number" step="1" min="-1000000" max="1000000" value={delta} onChange={(event) => setDelta(event.target.value)} /></label>
    <label className="block">Lý do<input className="mt-1 w-full rounded border p-2" required maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <button type="submit" disabled={busy} className="rounded bg-[var(--primary)] px-4 py-2 text-white">{busy ? "Đang lưu…" : "Điều chỉnh tồn kho"}</button>
  </form>;
}
