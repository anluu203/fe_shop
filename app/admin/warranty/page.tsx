"use client";

import { useEffect, useState } from "react";
import { adminServiceClasses as ui, ServiceAdminIntro, ServiceFeedback, WarrantyStatusBadge } from "../../../components/admin/customer-service-ui";
import { adminCustomerServices, customerServices, subscribeCustomerServices, WARRANTY_STATUS_FLOW, WARRANTY_STATUS_LABEL } from "../../../lib/services/customer-services";
import { formatDate, formatDateOnly } from "../../../lib/utils/format";
import type { AdminWarrantyRequest, WarrantyStatus } from "../../../lib/types/customer-services";

const products = customerServices.getWarrantyProducts();

function requestKey(request: AdminWarrantyRequest) {
  return JSON.stringify([request.ownerId, request.id]);
}

export default function AdminWarrantyPage() {
  const [snapshot, setSnapshot] = useState(() => adminCustomerServices.loadWarrantyRequests());
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [success, setSuccess] = useState("");
  useEffect(() => subscribeCustomerServices(() => setSnapshot(adminCustomerServices.loadWarrantyRequests())), []);

  const keyword = search.trim().toLocaleLowerCase("vi-VN");
  const filtered = snapshot.requests.filter((request) => {
    const product = products.find((item) => item.id === request.productId);
    return (!status || request.status === status) &&
      [request.id, request.contactName, request.phone, request.ownerId ?? "Hồ sơ mẫu", product?.name, product?.serial, product?.orderCode]
        .some((value) => value?.toLocaleLowerCase("vi-VN").includes(keyword));
  });
  const selected = snapshot.requests.find((request) => requestKey(request) === selectedKey);

  function update(request: AdminWarrantyRequest, nextStatus: WarrantyStatus, note: string) {
    const result = adminCustomerServices.updateWarrantyRequest(request.ownerId, request.id, nextStatus, note);
    setSnapshot(result);
    setSuccess(`Đã cập nhật phiếu ${request.id}.`);
  }

  return (
    <div>
      <ServiceAdminIntro title="Quản lý bảo hành" description="Tiếp nhận, kiểm tra và cập nhật tiến độ bảo hành. Hiển thị phiếu mẫu và phiếu user đã tạo trên cùng trình duyệt; thay đổi sẽ được phản ánh ở trang khách hàng.">
        <button type="button" className={ui.secondary} onClick={() => setSnapshot(adminCustomerServices.loadWarrantyRequests())}><i className="fa fa-refresh" aria-hidden="true" /> Làm mới</button>
      </ServiceAdminIntro>
      <ServiceFeedback warning={snapshot.warning} success={success} />
      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {WARRANTY_STATUS_FLOW.map((item) => (
          <button key={item} type="button" onClick={() => setStatus(status === item ? "" : item)} aria-pressed={status === item}
            className="rounded-xl border border-[var(--border)] bg-white p-4 text-left aria-pressed:border-primary aria-pressed:bg-[var(--primary-bg)]">
            <span className={ui.muted}>{WARRANTY_STATUS_LABEL[item]}</span>
            <strong className="mt-1 block text-2xl font-extrabold text-primary-dark">{snapshot.requests.filter((request) => request.status === item).length}</strong>
          </button>
        ))}
      </div>
      <div className={`${ui.panel} mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]`}>
        <label className={ui.label} htmlFor="admin-warranty-search">Tìm phiếu bảo hành
          <input id="admin-warranty-search" type="search" className={ui.control} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Mã phiếu, tên khách, điện thoại, serial..." />
        </label>
        <label className={ui.label} htmlFor="admin-warranty-status">Trạng thái
          <select id="admin-warranty-status" className={ui.control} value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Tất cả trạng thái</option>
            {WARRANTY_STATUS_FLOW.map((item) => <option key={item} value={item}>{WARRANTY_STATUS_LABEL[item]}</option>)}
          </select>
        </label>
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className={ui.panel} aria-label="Danh sách phiếu bảo hành">
          <h3 className="mb-4 text-lg font-bold">Danh sách phiếu ({filtered.length})</h3>
          {filtered.length === 0 ? <p className={`${ui.muted} py-8 text-center`}>Không tìm thấy phiếu bảo hành phù hợp.</p> :
            <div className="space-y-3">{filtered.map((request) => {
              const product = products.find((item) => item.id === request.productId);
              return <button key={requestKey(request)} type="button" onClick={() => { setSelectedKey(requestKey(request)); setSuccess(""); }}
                aria-pressed={selectedKey === requestKey(request)} className="w-full rounded-xl border border-[var(--border)] p-4 text-left transition-colors hover:bg-[var(--bg-hover)] aria-pressed:border-primary aria-pressed:bg-[var(--primary-bg)]">
                <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm [overflow-wrap:anywhere]">{request.id}</strong><WarrantyStatusBadge status={request.status} /></div>
                <p className="mt-2 text-sm font-semibold">{product?.name}</p>
                <p className={`${ui.muted} mt-1`}>{request.contactName} · {request.phone}</p>
                <p className={`${ui.muted} mt-1 [overflow-wrap:anywhere]`}>{request.ownerId ? `Tài khoản: ${request.ownerId}` : "Hồ sơ mẫu dùng chung"}</p>
                <p className={`${ui.muted} mt-1`}>Ngày gửi: {formatDate(request.createdAt)}</p>
              </button>;
            })}</div>}
        </section>
        {selected ? <WarrantyDetails key={`${requestKey(selected)}-${selected.timeline.length}`} request={selected} onUpdate={update} /> :
          <div className={`${ui.panel} py-16 text-center`}><i className="fa fa-shield mb-4 text-4xl text-primary-light" aria-hidden="true" /><h3 className="font-bold">Chọn phiếu để xem và xử lý</h3><p className={`${ui.muted} mt-2`}>Thông tin sản phẩm, liên hệ và lịch sử xử lý sẽ hiển thị tại đây.</p></div>}
      </div>
    </div>
  );
}

function WarrantyDetails({ request, onUpdate }: { request: AdminWarrantyRequest; onUpdate: (request: AdminWarrantyRequest, status: WarrantyStatus, note: string) => void }) {
  const product = products.find((item) => item.id === request.productId)!;
  const step = WARRANTY_STATUS_FLOW.indexOf(request.status);
  const [status, setStatus] = useState<WarrantyStatus>(WARRANTY_STATUS_FLOW[Math.min(step + 1, 3)]);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try { onUpdate(request, status, note); } catch (caught) { setError(caught instanceof Error ? caught.message : "Không thể cập nhật phiếu."); }
  }

  return <section className={ui.panel} aria-label="Chi tiết phiếu bảo hành">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-bold">Chi tiết phiếu</h3><WarrantyStatusBadge status={request.status} /></div>
    <p className="text-sm font-semibold [overflow-wrap:anywhere]">{request.id}</p>
    <dl className="my-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 [&_dt]:text-[var(--text-muted)] [&_dd]:font-medium [&_dd]:[overflow-wrap:anywhere]">
      <div><dt>Sản phẩm</dt><dd>{product.name}</dd></div><div><dt>Serial</dt><dd>{product.serial}</dd></div>
      <div><dt>Mã đơn mẫu</dt><dd>{product.orderCode}</dd></div><div><dt>Bảo hành đến</dt><dd>{formatDateOnly(product.expiresAt)}</dd></div>
      <div><dt>Tên liên hệ</dt><dd>{request.contactName}</dd></div><div><dt>Điện thoại</dt><dd>{request.phone}</dd></div>
    </dl>
    <h4 className="text-sm font-bold">Mô tả lỗi</h4><p className="mt-2 text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">{request.description}</p>
    <h4 className="mt-6 mb-3 text-sm font-bold">Lịch sử xử lý</h4>
    <ol className="ml-1 space-y-4 border-l-2 border-[var(--primary-border)] pl-4">{request.timeline.map((entry, index) => (
      <li key={index} className="text-sm"><strong>{WARRANTY_STATUS_LABEL[entry.status]}</strong><time dateTime={entry.date} className={`block ${ui.muted}`}>{formatDate(entry.date)}</time><p className="mt-1 whitespace-pre-wrap [overflow-wrap:anywhere]">{entry.note}</p></li>
    ))}</ol>
    {request.status === "completed" ? <p className="mt-6 rounded-xl bg-green-50 p-4 text-sm text-green-800">Phiếu đã hoàn tất.</p> :
      <form onSubmit={submit} className="mt-6 space-y-4 border-t border-[var(--border)] pt-5" noValidate>
        <h4 className="font-bold">Cập nhật xử lý</h4>
        <label className={ui.label} htmlFor="warranty-next-status">Trạng thái xử lý
          <select id="warranty-next-status" className={ui.control} value={status} onChange={(event) => setStatus(event.target.value as WarrantyStatus)}>
            {WARRANTY_STATUS_FLOW.slice(step, step + 2).map((item) => <option key={item} value={item}>{WARRANTY_STATUS_LABEL[item]}</option>)}
          </select>
        </label>
        <label className={ui.label} htmlFor="warranty-note">Ghi chú xử lý
          <textarea id="warranty-note" className={`${ui.control} min-h-28 resize-y`} required maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Kết quả kiểm tra hoặc nội dung xử lý..." />
        </label>
        <ServiceFeedback error={error} />
        <button type="submit" className={ui.primary}>Lưu cập nhật</button>
      </form>}
  </section>;
}
