"use client";
import { useCallback, useEffect, useState } from "react";
import { consultationApi, returnsApi, type ConsultationInput, type ReturnUpdate } from "../../lib/api/customer-services";
import { productApi } from "../../lib/api/products";
import type { Product } from "../../lib/types";
import type { AdminWarrantyRequest, ComponentType, CustomerServicesData, ManagedConsultationProduct, Usage, WarrantyStatus } from "../../lib/types/customer-services";
import { WARRANTY_STATUS_LABEL } from "../../lib/services/customer-services";
import { formatDate, formatPrice } from "../../lib/utils/format";
import { adminServiceClasses as ui, ServiceFeedback } from "./customer-service-ui";

const initial: ConsultationInput = { bookId: "", component: "literature", usages: [], specs: [], reasons: {}, isActive: true };
export function DatabaseAdminConsultation() {
  const [products, setProducts] = useState<ManagedConsultationProduct[]>([]), [books, setBooks] = useState<Product[]>([]);
  const [options, setOptions] = useState<Pick<CustomerServicesData, "usages" | "components">>({ usages: [], components: [] });
  const [form, setForm] = useState<ConsultationInput>(initial), [editing, setEditing] = useState<string | null>(null), [open, setOpen] = useState(false);
  const [specs, setSpecs] = useState(""), [bookSearch, setBookSearch] = useState("");
  const [error, setError] = useState(""), [success, setSuccess] = useState(""), [busy, setBusy] = useState(false);
  const load = useCallback(async () => { const [rows, choices] = await Promise.all([consultationApi.list(), consultationApi.options()]); setProducts(rows); setOptions(choices); }, []);
  useEffect(() => { let active = true; Promise.all([consultationApi.list(), consultationApi.options()]).then(([rows, choices]) => { if (active) { setProducts(rows); setOptions(choices); } }).catch((caught) => { if (active) setError(caught.message); }); return () => { active = false; }; }, []);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => { productApi.getAll({ search: bookSearch, pageSize: 100, includeInactive: true }).then((page) => { if (active) setBooks(page.items); }).catch((caught) => { if (active) setError(caught.message); }); }, 200);
    return () => { active = false; clearTimeout(timer); };
  }, [bookSearch]);
  function edit(product?: ManagedConsultationProduct) {
    setEditing(product?.id ?? null); setForm(product ? { bookId: product.id, component: product.component, usages: product.usages, specs: product.specs, reasons: product.reasons, isActive: product.isActive } : initial); setSpecs(product?.specs.join("\n") ?? ""); setOpen(true); setSuccess("");
  }
  return <div><h2 className="mb-3 text-2xl font-bold">Quản lý tư vấn sách</h2><p className="mb-5">Hồ sơ tư vấn gắn với sách trong danh mục. Tên và giá được cập nhật theo sách.</p>
    <ServiceFeedback error={error} success={success} /><button type="button" className={ui.primary} onClick={() => edit()}>Thêm hồ sơ tư vấn</button>
    {open && <form className={`${ui.panel} my-5 space-y-4`} onSubmit={async (event) => {
      event.preventDefault(); if (busy) return; setBusy(true); setError("");
      try { const input = { ...form, specs: specs.split("\n").map((line) => line.trim()).filter(Boolean) }; if (editing) await consultationApi.update(editing, input); else await consultationApi.create(input); await load(); setOpen(false); setSuccess("Đã lưu hồ sơ tư vấn."); }
      catch (caught) { setError(caught instanceof Error ? caught.message : "Không lưu được hồ sơ."); }
      finally { setBusy(false); }
    }}>
      {!editing && <label className={ui.label}>Tìm sách<input className={ui.control} value={bookSearch} onChange={(event) => setBookSearch(event.target.value)} placeholder="Tên, tác giả hoặc ISBN" /></label>}
      <label className={ui.label}>Sách<select className={ui.control} required disabled={!!editing} value={form.bookId} onChange={(event) => setForm({ ...form, bookId: event.target.value })}><option value="">Chọn sách</option>{editing && !books.some((book) => book.id === editing) && <option value={editing}>{products.find((book) => book.id === editing)?.name}</option>}{books.map((book) => <option key={book.id} value={book.id}>{book.name} — {formatPrice(book.price)}</option>)}</select></label>
      <label className={ui.label}>Chủ đề<select className={ui.control} value={form.component} onChange={(event) => setForm({ ...form, component: event.target.value as ComponentType })}>{options.components.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
      <fieldset className="space-y-3"><legend>Nhu cầu đọc và lý do gợi ý</legend>{options.usages.map((option) => <div key={option.id}><label><input type="checkbox" checked={form.usages.includes(option.id)} onChange={(event) => setForm({ ...form, usages: event.target.checked ? [...form.usages, option.id] : form.usages.filter((usage) => usage !== option.id) })} /> {option.label}</label>{form.usages.includes(option.id) && <textarea className={`${ui.control} mt-2`} required maxLength={1000} aria-label={`Lý do cho ${option.label}`} value={form.reasons[option.id] ?? ""} onChange={(event) => setForm({ ...form, reasons: { ...form.reasons, [option.id]: event.target.value } })} />}</div>)}</fieldset>
      <label className={ui.label}>Điểm nổi bật (mỗi dòng một ý)<textarea className={ui.control} value={specs} onChange={(event) => setSpecs(event.target.value)} /></label>
      <label><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} /> Hiển thị trong gợi ý</label>
      <div className="flex gap-2"><button className={ui.primary} disabled={busy}>{busy ? "Đang lưu…" : "Lưu"}</button><button type="button" className={ui.secondary} onClick={() => setOpen(false)}>Đóng</button></div>
    </form>}
    <div className="mt-5 grid gap-4 lg:grid-cols-2">{products.map((product) => <article key={product.id} className={ui.panel}><h3 className="font-bold">{product.name}</h3><p>{formatPrice(product.price)} · {product.isActive ? "Đang hiển thị" : "Đang ẩn"}</p><p>{product.specs.join(" · ")}</p><div className="my-3">{product.usages.map((usage: Usage) => <p key={usage}>{options.usages.find((item) => item.id === usage)?.label}: {product.reasons[usage]}</p>)}</div><button className={ui.secondary} onClick={() => edit(product)}>Chỉnh sửa</button></article>)}</div>
  </div>;
}

export function DatabaseAdminReturns() {
  const [requests, setRequests] = useState<AdminWarrantyRequest[]>([]), [selectedId, setSelectedId] = useState("");
  const [status, setStatus] = useState<WarrantyStatus>("checking"), [note, setNote] = useState("");
  const [resolution, setResolution] = useState<"exchange" | "refund">("exchange"), [restock, setRestock] = useState(0), [replacement, setReplacement] = useState("");
  const [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false);
  const [error, setError] = useState(""), [success, setSuccess] = useState("");
  const [books, setBooks] = useState<Product[]>([]);
  const load = useCallback(async () => setRequests(await returnsApi.all()), []);
  useEffect(() => { let active = true; Promise.all([returnsApi.all(), productApi.getAll({ pageSize: 100 })]).then(([rows, page]) => { if (active) { setRequests(rows); setBooks(page.items); } }).catch((caught) => { if (active) setError(caught.message); }); return () => { active = false; }; }, []);
  const selected = requests.find((request) => request.id === selectedId);
  function choose(row: AdminWarrantyRequest) { setSelectedId(row.id); setStatus(({ received: "checking", checking: "repairing", repairing: "completed" } as Record<string, WarrantyStatus>)[row.status] ?? row.status); setNote(""); setRestock(0); setReplacement(""); setConfirmed(false); setResolution("exchange"); setSuccess(""); }
  return <div><h2 className="mb-3 text-2xl font-bold">Quản lý đổi trả</h2><p className="mb-4">Xử lý yêu cầu từ các đơn đã giao; xác nhận số sách nhập lại và kết quả đổi trả.</p><ServiceFeedback error={error} success={success} />
    <button className={`${ui.secondary} mb-4`} onClick={() => void load().catch((caught) => setError(caught.message))}>Làm mới</button>
    <div className="grid items-start gap-5 xl:grid-cols-2"><section className={ui.panel}><h3 className="mb-3 font-bold">Phiếu đổi trả ({requests.length})</h3>{!requests.length && <p>Chưa có yêu cầu.</p>}{requests.map((request) => <button key={request.id} type="button" className="mb-3 block w-full rounded border p-3 text-left" aria-pressed={selectedId === request.id} onClick={() => choose(request)}><strong>#{request.id} — {request.bookName}</strong><p>{request.contactName} · {request.phone} · {request.quantity} cuốn</p><p>{WARRANTY_STATUS_LABEL[request.status]}</p></button>)}</section>
    {selected && <section className={ui.panel}><h3 className="font-bold">Phiếu #{selected.id}</h3><p>{selected.description}</p><ol className="my-4 space-y-2">{selected.timeline.map((event, index) => <li key={index}>{formatDate(event.date)} — {WARRANTY_STATUS_LABEL[event.status]}: {event.note}</li>)}</ol>
      {["completed", "rejected"].includes(selected.status) ? <p>Phiếu đã kết thúc. {selected.resolution === "refund" && `Đã hoàn ${formatPrice(selected.refundAmount ?? "0")}.`}</p> : <form className="space-y-4" onSubmit={async (event) => {
        event.preventDefault(); if (busy) return; setBusy(true); setError("");
        try { const body: ReturnUpdate = { status, note }; if (status === "completed") Object.assign(body, { resolution, restockQuantity: restock, ...(replacement ? { replacementBookId: replacement } : {}), refundConfirmed: confirmed }); await returnsApi.update(selected.id, body); await load(); setSuccess("Đã cập nhật tiến độ đổi trả."); }
        catch (caught) { setError(caught instanceof Error ? caught.message : "Không cập nhật được phiếu."); }
        finally { setBusy(false); }
      }}><label className={ui.label}>Trạng thái<select className={ui.control} value={status} onChange={(event) => setStatus(event.target.value as WarrantyStatus)}>{([({ received: "checking", checking: "repairing", repairing: "completed" } as Record<string, WarrantyStatus>)[selected.status], "rejected"] as WarrantyStatus[]).map((value) => <option key={value} value={value}>{WARRANTY_STATUS_LABEL[value]}</option>)}</select></label>
        <label className={ui.label}>Ghi chú tiến độ (khách hàng xem được)<textarea className={ui.control} required maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} /></label>
        {status === "completed" && <>
          <label className={ui.label}>Kết quả<select className={ui.control} value={resolution} onChange={(event) => setResolution(event.target.value as "exchange" | "refund")}><option value="exchange">Đổi sách</option><option value="refund">Hoàn tiền COD thủ công</option></select></label>
          <label className={ui.label}>Số sách trả đủ chất lượng để nhập lại tồn<input className={ui.control} required type="number" min="0" max={selected.quantity ?? 1} value={restock} onChange={(event) => setRestock(Number(event.target.value))} /></label>
          {resolution === "exchange" ? <label className={ui.label}>Sách thay thế<select className={ui.control} value={replacement} onChange={(event) => setReplacement(event.target.value)}><option value="">Đổi cùng loại sách đã mua</option>{books.map((book) => <option key={book.id} value={book.id}>{book.name} — tồn {book.stockQuantity ?? 0}</option>)}</select></label> : <label><input type="checkbox" required checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /> Tôi xác nhận đã hoàn tiền cho khách.</label>}
        </>}
        <button className={ui.primary} disabled={busy}>{busy ? "Đang lưu…" : "Cập nhật"}</button>
      </form>}
    </section>}</div>
  </div>;
}
