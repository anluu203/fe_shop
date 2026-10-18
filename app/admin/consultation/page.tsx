"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminServiceClasses as ui, ServiceAdminIntro, ServiceFeedback } from "../../../components/admin/customer-service-ui";
import { adminCustomerServices, customerServices, subscribeCustomerServices } from "../../../lib/services/customer-services";
import { formatPrice } from "../../../lib/utils/format";
import type { ComponentType, ConsultationProductInput, ManagedConsultationProduct, Usage } from "../../../lib/types/customer-services";

const options = customerServices.getConsultationOptions();

export default function AdminConsultationPage() {
  const [snapshot, setSnapshot] = useState(() => adminCustomerServices.loadConsultationProducts());
  const [editor, setEditor] = useState<ManagedConsultationProduct | "new" | null>(null);
  const [search, setSearch] = useState("");
  const [component, setComponent] = useState("");
  const [usage, setUsage] = useState("");
  const [visibility, setVisibility] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  useEffect(() => subscribeCustomerServices(() => setSnapshot(adminCustomerServices.loadConsultationProducts())), []);

  const keyword = search.trim().toLocaleLowerCase("vi-VN");
  const filtered = snapshot.products.filter((product) => product.name.toLocaleLowerCase("vi-VN").includes(keyword) &&
    (!component || product.component === component) && (!usage || product.usages.includes(usage as Usage)) &&
    (!visibility || product.isActive === (visibility === "active")));

  function save(input: ConsultationProductInput, id?: string) {
    const result = adminCustomerServices.saveConsultationProduct(input, id);
    setSnapshot(result);
    setEditor(null);
    setError("");
    setSuccess(id ? "Đã cập nhật sản phẩm tư vấn." : "Đã thêm sản phẩm tư vấn.");
  }

  function toggle(product: ManagedConsultationProduct) {
    setError("");
    try {
      setSnapshot(adminCustomerServices.setConsultationProductActive(product.id, !product.isActive));
      setSuccess(product.isActive ? `Đã ẩn ${product.name} khỏi gợi ý của user.` : `Đã bật hiển thị ${product.name}.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Không thể cập nhật sản phẩm."); }
  }

  return <div>
    <ServiceAdminIntro title="Quản lý tư vấn sản phẩm" description="Quản lý danh sách linh kiện, giá, nhu cầu sử dụng và lý do gợi ý. Thay đổi được lưu trên trình duyệt này và áp dụng ngay cho trang tư vấn của khách hàng.">
      <div className="flex flex-wrap gap-2">
        <Link href="/client/consultation" className={ui.secondary}>Xem trang tư vấn</Link>
        <button type="button" className={ui.primary} onClick={() => { setEditor("new"); setSuccess(""); }}><i className="fa fa-plus" aria-hidden="true" /> Thêm sản phẩm tư vấn</button>
      </div>
    </ServiceAdminIntro>
    <ServiceFeedback warning={snapshot.warning} success={success} error={error} />
    <div className="mb-6 grid grid-cols-3 gap-3">
      {[{ label: "Tổng sản phẩm", value: snapshot.products.length }, { label: "Đang hiển thị", value: snapshot.products.filter((product) => product.isActive).length }, { label: "Đang ẩn", value: snapshot.products.filter((product) => !product.isActive).length }].map((stat) => (
        <div className="rounded-xl border border-[var(--border)] bg-white p-4" key={stat.label}><p className={ui.muted}>{stat.label}</p><strong className="mt-1 block text-2xl font-extrabold text-primary-dark">{stat.value}</strong></div>
      ))}
    </div>
    {editor && <CatalogEditor key={editor === "new" ? "new" : editor.id} product={editor === "new" ? undefined : editor} onSave={save} onCancel={() => setEditor(null)} />}
    <div className={`${ui.panel} mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4`}>
      <label className={ui.label} htmlFor="admin-consultation-search">Tìm sản phẩm
        <input id="admin-consultation-search" className={ui.control} type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tên sản phẩm..." />
      </label>
      <label className={ui.label} htmlFor="admin-consultation-component">Loại linh kiện
        <select id="admin-consultation-component" className={ui.control} value={component} onChange={(event) => setComponent(event.target.value)}><option value="">Tất cả linh kiện</option>{options.components.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
      </label>
      <label className={ui.label} htmlFor="admin-consultation-usage">Nhu cầu
        <select id="admin-consultation-usage" className={ui.control} value={usage} onChange={(event) => setUsage(event.target.value)}><option value="">Tất cả nhu cầu</option>{options.usages.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
      </label>
      <label className={ui.label} htmlFor="admin-consultation-visibility">Hiển thị
        <select id="admin-consultation-visibility" className={ui.control} value={visibility} onChange={(event) => setVisibility(event.target.value)}><option value="">Tất cả sản phẩm</option><option value="active">Đang hiển thị</option><option value="hidden">Đang ẩn</option></select>
      </label>
    </div>
    <h3 className="mb-4 text-lg font-bold">Danh sách gợi ý ({filtered.length})</h3>
    {filtered.length === 0 ? <p className={`${ui.panel} py-12 text-center text-sm text-[var(--text-muted)]`}>Không tìm thấy sản phẩm phù hợp với bộ lọc.</p> :
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{filtered.map((product) => (
        <article key={product.id} className={ui.panel}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="rounded-full bg-[var(--primary-bg)] px-2.5 py-1 text-xs font-semibold text-primary-dark">{options.components.find((item) => item.id === product.component)?.label}</span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${product.isActive ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"}`}>{product.isActive ? "Đang hiển thị" : "Đang ẩn"}</span>
          </div>
          <h4 className="mt-3 text-base font-bold [overflow-wrap:anywhere]">{product.name}</h4><p className="my-3 text-xl font-extrabold text-[var(--accent-dark)]">{formatPrice(product.price)}</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--text-secondary)]">{product.specs.map((spec, index) => <li key={index}>{spec}</li>)}</ul>
          <div className="mt-4 space-y-3">{product.usages.map((item) => <div key={item} className="rounded-xl bg-[var(--primary-bg)] p-3 text-[13px] text-primary-dark"><strong>{options.usages.find((option) => option.id === item)?.label}</strong><p className="mt-1 whitespace-pre-wrap [overflow-wrap:anywhere]">{product.reasons[item]}</p></div>)}</div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" className={ui.secondary} aria-label={`Sửa ${product.name}`} onClick={() => { setEditor(product); setSuccess(""); }}>Chỉnh sửa</button>
            <button type="button" className={ui.secondary} aria-label={`${product.isActive ? "Ẩn" : "Hiện"} ${product.name}`} onClick={() => toggle(product)}>{product.isActive ? "Ẩn khỏi gợi ý" : "Bật hiển thị"}</button>
          </div>
        </article>
      ))}</div>}
  </div>;
}

function CatalogEditor({ product, onSave, onCancel }: {
  product?: ManagedConsultationProduct;
  onSave: (input: ConsultationProductInput, id?: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(product?.name ?? "");
  const [component, setComponent] = useState<ComponentType>(product?.component ?? "cpu");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [specs, setSpecs] = useState(product?.specs.join("\n") ?? "");
  const [usages, setUsages] = useState<Usage[]>(product?.usages ?? ["office"]);
  const [reasons, setReasons] = useState<Partial<Record<Usage, string>>>({ ...product?.reasons });
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [error, setError] = useState("");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      onSave({ name, component, price: Number(price), specs: specs.split("\n").map((line) => line.trim()).filter(Boolean), usages, reasons, isActive }, product?.id);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Không thể lưu sản phẩm."); }
  }

  return <section className={`${ui.panel} mb-6`} aria-label="Biểu mẫu sản phẩm tư vấn">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-bold">{product ? "Chỉnh sửa sản phẩm tư vấn" : "Thêm sản phẩm tư vấn"}</h3><button type="button" className={ui.secondary} onClick={onCancel}>Đóng biểu mẫu</button></div>
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <label className={ui.label} htmlFor="consultation-name">Tên sản phẩm<input autoFocus id="consultation-name" className={ui.control} value={name} maxLength={200} onChange={(event) => setName(event.target.value)} required /></label>
        <label className={ui.label} htmlFor="consultation-type">Loại linh kiện<select id="consultation-type" className={ui.control} value={component} onChange={(event) => setComponent(event.target.value as ComponentType)}>{options.components.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label className={ui.label} htmlFor="consultation-price">Giá tham khảo (VNĐ)<input id="consultation-price" className={ui.control} type="number" min="1" step="1" value={price} onChange={(event) => setPrice(event.target.value)} required /></label>
      </div>
      <label className={ui.label} htmlFor="consultation-specs">Thông số chính (mỗi dòng một thông số)<textarea id="consultation-specs" className={`${ui.control} min-h-24 resize-y`} value={specs} maxLength={3000} onChange={(event) => setSpecs(event.target.value)} required /></label>
      <fieldset><legend className="mb-3 text-sm font-semibold">Nhu cầu phù hợp</legend><div className="flex flex-wrap gap-4">{options.usages.map((item) => (
        <label key={item.id} className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-primary" checked={usages.includes(item.id)} onChange={(event) => setUsages(event.target.checked ? [...usages, item.id] : usages.filter((usage) => usage !== item.id))} />{item.label}</label>
      ))}</div></fieldset>
      <div className="grid gap-4 xl:grid-cols-3">{usages.map((usage) => (
        <label key={usage} className={ui.label} htmlFor={`reason-${usage}`}>Lý do phù hợp: {options.usages.find((item) => item.id === usage)?.label}
          <textarea id={`reason-${usage}`} className={`${ui.control} min-h-28 resize-y`} value={reasons[usage] ?? ""} maxLength={2000} required onChange={(event) => setReasons({ ...reasons, [usage]: event.target.value })} />
        </label>
      ))}</div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-primary" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />Hiển thị trong kết quả tư vấn của user</label>
      <ServiceFeedback error={error} />
      <div className="flex flex-wrap gap-2"><button type="submit" className={ui.primary}>Lưu sản phẩm</button><button type="button" className={ui.secondary} onClick={onCancel}>Hủy</button></div>
    </form>
  </section>;
}
