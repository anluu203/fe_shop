"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { consultationApi, returnsApi } from "../../lib/api/customer-services";
import type { ComponentType, ConsultationProduct, CustomerServicesData, Usage, WarrantyProduct, WarrantyRequest } from "../../lib/types/customer-services";
import { WARRANTY_STATUS_LABEL } from "../../lib/services/customer-services";
import { formatPrice, formatDate } from "../../lib/utils/format";
import { serviceClasses as ui } from "./customer-service-classes";

const emptyOptions: Pick<CustomerServicesData, "usages" | "components"> = { usages: [], components: [] };
export function DatabaseConsultation() {
  const [options, setOptions] = useState(emptyOptions);
  const [usage, setUsage] = useState<Usage>("relaxation"), [component, setComponent] = useState<ComponentType>("literature");
  const [budget, setBudget] = useState("200000"), [books, setBooks] = useState<ConsultationProduct[]>([]);
  const [error, setError] = useState(""), [busy, setBusy] = useState(false), [searched, setSearched] = useState(false);
  useEffect(() => { let active = true; consultationApi.options().then((value) => { if (active) setOptions(value); }).catch((error) => { if (active) setError(error.message); }); return () => { active = false; }; }, []);
  return <><section className={ui.hero}><div className={ui.container}><h1 className={ui.title}>Tư vấn chọn sách</h1><p className={ui.subtitle}>Tìm sách theo nhu cầu, chủ đề và ngân sách của bạn.</p></div></section>
    <div className={`${ui.container} ${ui.content}`}><form className={`${ui.panel} space-y-4`} onSubmit={async (event) => {
      event.preventDefault(); setBusy(true); setError("");
      try { setBooks(await consultationApi.recommend({ usage, component, budget: Number(budget) })); setSearched(true); }
      catch (caught) { setError(caught instanceof Error ? caught.message : "Không tải được gợi ý."); }
      finally { setBusy(false); }
    }}>
      <label className={ui.field}>Nhu cầu<select className={ui.control} value={usage} onChange={(event) => setUsage(event.target.value as Usage)}>{options.usages.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <label className={ui.field}>Chủ đề<select className={ui.control} value={component} onChange={(event) => setComponent(event.target.value as ComponentType)}>{options.components.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <label className={ui.field}>Ngân sách (VND)<input className={ui.control} type="number" min="1" max="999999999999" required value={budget} onChange={(event) => setBudget(event.target.value)} /></label>
      <button className="rounded bg-[var(--primary)] px-4 py-2 text-white" disabled={busy || !options.usages.length}>{busy ? "Đang tìm…" : "Tìm sách phù hợp"}</button>
    </form>{error && <p role="alert" className={ui.noticeWarning}>{error}</p>}
    {searched && !books.length && <p className="py-6">Chưa có sách phù hợp. Hãy thử ngân sách hoặc chủ đề khác.</p>}
    <div className={`${ui.grid} mt-6`}>{books.map((book) => <article key={book.id} className={ui.panel}><h2 className="font-bold">{book.name}</h2><p>{formatPrice(book.price)}</p><ul className="my-3 list-inside list-disc">{book.specs.map((spec, index) => <li key={index}>{spec}</li>)}</ul><p>{book.reasons[usage]}</p><Link className="mt-3 inline-block underline" href={`/client/products/${book.id}`}>Xem sách</Link></article>)}</div></div>
  </>;
}

export function DatabaseReturns() {
  const { user, isLoading } = useAuth();
  const [products, setProducts] = useState<WarrantyProduct[]>([]), [requests, setRequests] = useState<WarrantyRequest[]>([]);
  const [productId, setProductId] = useState(""), [quantity, setQuantity] = useState(1);
  const [contactName, setContactName] = useState(""), [phone, setPhone] = useState(""), [description, setDescription] = useState("");
  const [error, setError] = useState(""), [success, setSuccess] = useState(""), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try { const [items, rows] = await Promise.all([returnsApi.eligible(), returnsApi.mine()]); setProducts(items); setRequests(rows); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Không tải được hồ sơ."); }
    finally { setLoading(false); }
  }, [user]);
  useEffect(() => {
    if (!user) return;
    let active = true;
    Promise.all([returnsApi.eligible(), returnsApi.mine()]).then(([items, rows]) => {
      if (active) { setProducts(items); setRequests(rows); setContactName(user.username); setPhone(user.phoneNumber ?? ""); }
    }).catch((caught) => { if (active) setError(caught.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);
  if (isLoading) return <p className="p-8">Đang tải…</p>;
  if (!user) return <p className="p-8"><Link href="/client/auth/login">Đăng nhập để xem đổi trả của bạn.</Link></p>;
  const selected = products.find((item) => item.id === productId);
  return <><section className={ui.hero}><div className={ui.container}><h1 className={ui.title}>Đổi trả của tôi</h1><p className={ui.subtitle}>Gửi yêu cầu cho sách đã giao và còn hạn đổi trả.</p></div></section>
    <div className={`${ui.container} ${ui.content}`}>
      <button type="button" className="mb-4 underline" disabled={loading} onClick={() => void load()}>Làm mới</button>
      {error && <p role="alert" className={ui.noticeWarning}>{error}</p>}{success && <p role="status" className={ui.noticeSuccess}>{success}</p>}
      {loading ? <p>Đang tải hồ sơ…</p> : !products.length ? <p className="mb-6">Chưa có sách còn số lượng và thời hạn đổi trả.</p> : <form className={`${ui.panel} space-y-4`} onSubmit={async (event) => {
        event.preventDefault(); if (busy) return; setBusy(true); setError(""); setSuccess("");
        try { const request = await returnsApi.create({ productId, quantity, contactName, phone, description }); setSuccess(`Đã gửi yêu cầu #${request.id}.`); setProductId(""); setQuantity(1); setDescription(""); await load(); }
        catch (caught) { setError(caught instanceof Error ? caught.message : "Không gửi được yêu cầu."); }
        finally { setBusy(false); }
      }}>
        <label className={ui.field}>Sách cần đổi trả<select className={ui.control} required value={productId} onChange={(event) => { setProductId(event.target.value); setQuantity(1); }}><option value="">Chọn sách đã mua</option>{products.map((item) => <option key={item.id} value={item.id}>{item.name} — Đơn {item.orderCode} — hạn {item.expiresAt}</option>)}</select></label>
        <label className={ui.field}>Số lượng<input className={ui.control} type="number" min="1" max={selected?.remainingQuantity ?? 1} required value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /></label>
        <label className={ui.field}>Người liên hệ<input className={ui.control} required maxLength={150} value={contactName} onChange={(event) => setContactName(event.target.value)} /></label>
        <label className={ui.field}>Điện thoại<input className={ui.control} required maxLength={20} value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
        <label className={ui.field}>Lý do<textarea className={ui.control} required minLength={5} maxLength={3000} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
        <button className="rounded bg-[var(--primary)] px-4 py-2 text-white" disabled={busy}>{busy ? "Đang gửi…" : "Gửi yêu cầu"}</button>
      </form>}
      <h2 className="my-6 text-xl font-bold">Lịch sử yêu cầu ({requests.length})</h2><div className="space-y-4">{requests.map((request) => <article key={request.id} className={ui.panel}><h3 className="font-bold">#{request.id} — {request.bookName} ({request.quantity} cuốn)</h3><p>{WARRANTY_STATUS_LABEL[request.status]}</p><p>{request.description}</p>{request.resolution && <p>Kết quả: {request.resolution === "refund" ? `Hoàn ${formatPrice(request.refundAmount ?? "0")}` : "Đổi sách"}</p>}<ol className="mt-3 space-y-2">{request.timeline.map((event, index) => <li key={index}>{formatDate(event.date)} — {WARRANTY_STATUS_LABEL[event.status]}: {event.note}</li>)}</ol></article>)}</div>
    </div></>;
}
