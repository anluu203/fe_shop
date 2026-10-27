"use client";

import { useCallback, useRef, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { adminServiceClasses as ui, ServiceAdminIntro, ServiceFeedback, WarrantyStatusBadge } from "../../../components/admin/customer-service-ui";
import Pagination from "../../../components/ui/Pagination";
import { adminWarrantyApi } from "../../../lib/api/warranties";
import { ApiRequestError } from "../../../lib/api/client";
import { useWarrantyErrorHandler, useWarrantyResource } from "../../../lib/hooks/use-warranty-resource";
import { WARRANTY_STATUS_FLOW, WARRANTY_STATUS_LABEL } from "../../../lib/services/warranty";
import { formatDate, formatDateOnly } from "../../../lib/utils/format";
import type { WarrantyRequest, WarrantyRequestQuery, WarrantyStatus } from "../../../lib/types/warranty";

export default function AdminWarrantyPage() {
  const { user } = useAuth();
  if (!user || user.role !== "ADMIN") return null;
  return <AdminWarrantyDashboard key={user.id} />;
}

function AdminWarrantyDashboard() {
  const [query, setQuery] = useState<WarrantyRequestQuery>({ page: 1, pageSize: 20, search: "" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [success, setSuccess] = useState("");
  const [actionError, setActionError] = useState("");
  const [updating, setUpdating] = useState(false);
  const updateLock = useRef(false);
  const handleError = useWarrantyErrorHandler();
  const loadList = useCallback(async () => {
    const [requests, stats] = await Promise.all([adminWarrantyApi.getRequests(query), adminWarrantyApi.getStats()]);
    return { requests, stats };
  }, [query]);
  const loadDetail = useCallback(() => selectedId ? adminWarrantyApi.getRequest(selectedId) : Promise.resolve(null), [selectedId]);
  const list = useWarrantyResource(loadList);
  const detail = useWarrantyResource(loadDetail);
  const selected = detail.data?.id === selectedId ? detail.data : null;

  function refresh() {
    list.refresh();
    detail.refresh();
  }

  function filterStatus(status?: WarrantyStatus) {
    setQuery({ ...query, status, page: 1 });
    setSelectedId(null);
    setActionError("");
  }

  async function update(request: WarrantyRequest, status: WarrantyStatus, note: string) {
    if (updateLock.current) return;
    updateLock.current = true;
    setUpdating(true);
    setActionError("");
    setSuccess("");
    try {
      const updated = await adminWarrantyApi.updateRequest(request.id, status, note);
      setSuccess(`Đã cập nhật phiếu ${updated.ticketCode}.`);
      setQuery((previous) => ({ ...previous, page: 1 }));
      refresh();
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 409) refresh();
      const message = handleError(error);
      setActionError(message);
      throw new Error(message);
    } finally {
      updateLock.current = false;
      setUpdating(false);
    }
  }

  return (
    <div>
      <ServiceAdminIntro demo={false} title="Quản lý bảo hành" description="Tiếp nhận, kiểm tra và cập nhật tiến độ bảo hành của khách hàng.">
        <button type="button" className={ui.secondary} disabled={list.loading || detail.loading || updating} onClick={refresh}>
          <i className="fa fa-refresh" aria-hidden="true" /> Làm mới
        </button>
      </ServiceAdminIntro>
      <ServiceFeedback error={actionError || list.error} success={success} />
      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {WARRANTY_STATUS_FLOW.map((item) => (
          <button key={item} type="button" disabled={updating} onClick={() => filterStatus(query.status === item ? undefined : item)} aria-pressed={query.status === item}
            className="rounded-xl border border-[var(--border)] bg-white p-4 text-left aria-pressed:border-primary aria-pressed:bg-[var(--primary-bg)] disabled:opacity-50">
            <span className={ui.muted}>{WARRANTY_STATUS_LABEL[item]}</span>
            <strong className="mt-1 block text-2xl font-extrabold text-primary-dark">{list.data?.stats[item] ?? "—"}</strong>
          </button>
        ))}
      </div>
      <div className={`${ui.panel} mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]`}>
        <label className={ui.label} htmlFor="admin-warranty-search">Tìm phiếu bảo hành
          <input id="admin-warranty-search" type="search" maxLength={200} disabled={updating} className={ui.control} value={query.search}
            onChange={(event) => { setQuery({ ...query, search: event.target.value, page: 1 }); setSelectedId(null); }}
            placeholder="Mã phiếu, tên khách, điện thoại, serial..." />
        </label>
        <label className={ui.label} htmlFor="admin-warranty-status">Trạng thái
          <select id="admin-warranty-status" disabled={updating} className={ui.control} value={query.status ?? ""}
            onChange={(event) => filterStatus((event.target.value || undefined) as WarrantyStatus | undefined)}>
            <option value="">Tất cả trạng thái</option>
            {WARRANTY_STATUS_FLOW.map((item) => <option key={item} value={item}>{WARRANTY_STATUS_LABEL[item]}</option>)}
          </select>
        </label>
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className={ui.panel} aria-label="Danh sách phiếu bảo hành" aria-busy={list.loading}>
          <h3 className="mb-4 text-lg font-bold">Danh sách phiếu {list.data ? `(${list.data.requests.totalCount})` : ""}</h3>
          {list.loading && <p className={`${ui.muted} mb-4`} role="status">Đang tải phiếu bảo hành...</p>}
          {list.data && (list.data.requests.items.length === 0 ? <p className={`${ui.muted} py-8 text-center`}>Không tìm thấy phiếu bảo hành phù hợp.</p> :
            <div className="space-y-3">{list.data.requests.items.map((request) => (
              <button key={request.id} type="button" disabled={list.loading || updating} onClick={() => { setSelectedId(request.id); setSuccess(""); setActionError(""); }}
                aria-pressed={selectedId === request.id} className="w-full rounded-xl border border-[var(--border)] p-4 text-left transition-colors hover:bg-[var(--bg-hover)] aria-pressed:border-primary aria-pressed:bg-[var(--primary-bg)] disabled:opacity-50">
                <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm [overflow-wrap:anywhere]">{request.ticketCode}</strong><WarrantyStatusBadge status={request.status} /></div>
                <p className="mt-2 text-sm font-semibold">{request.product.name}</p>
                <p className={`${ui.muted} mt-1`}>{request.contactName} · {request.phone}</p>
                <p className={`${ui.muted} mt-1 [overflow-wrap:anywhere]`}>{request.ownerId ? `Tài khoản: ${request.ownerId}` : "Phiếu cũ chưa gắn tài khoản"}</p>
                <p className={`${ui.muted} mt-1`}>Ngày gửi: {formatDate(request.createdAt)}</p>
              </button>
            ))}</div>)}
          {list.data && !list.loading && !updating && <Pagination page={list.data.requests.pageNumber} totalPages={list.data.requests.totalPages}
            onChange={(page) => { setQuery({ ...query, page }); setSelectedId(null); }} />}
        </section>
        <div>
          <ServiceFeedback error={detail.error} />
          {selectedId && detail.loading && <p className={`${ui.muted} mb-4`} role="status">Đang tải chi tiết phiếu...</p>}
          {selected ? <WarrantyDetails key={`${selected.id}-${selected.updatedAt}-${selected.timeline.length}`} request={selected}
            disabled={updating || detail.loading} onUpdate={update} /> : !detail.error &&
            <div className={`${ui.panel} py-16 text-center`}><i className="fa fa-shield mb-4 text-4xl text-primary-light" aria-hidden="true" />
              <h3 className="font-bold">{selectedId ? "Đang mở phiếu bảo hành" : "Chọn phiếu để xem và xử lý"}</h3>
              <p className={`${ui.muted} mt-2`}>Thông tin sản phẩm, liên hệ và lịch sử xử lý sẽ hiển thị tại đây.</p>
            </div>}
        </div>
      </div>
    </div>
  );
}

function WarrantyDetails({ request, disabled, onUpdate }: {
  request: WarrantyRequest;
  disabled: boolean;
  onUpdate: (request: WarrantyRequest, status: WarrantyStatus, note: string) => Promise<void>;
}) {
  const product = request.product;
  const step = WARRANTY_STATUS_FLOW.indexOf(request.status);
  const [status, setStatus] = useState<WarrantyStatus>(WARRANTY_STATUS_FLOW[Math.min(step + 1, 3)]);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;
    setError("");
    if (!note.trim() || note.trim().length > 2000) {
      setError("Ghi chú xử lý phải có từ 1 đến 2000 ký tự.");
      return;
    }
    try { await onUpdate(request, status, note); setNote(""); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Không thể cập nhật phiếu."); }
  }

  return <section className={ui.panel} aria-label="Chi tiết phiếu bảo hành">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-bold">Chi tiết phiếu</h3><WarrantyStatusBadge status={request.status} /></div>
    <p className="text-sm font-semibold [overflow-wrap:anywhere]">{request.ticketCode}</p>
    <dl className="my-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 [&_dt]:text-[var(--text-muted)] [&_dd]:font-medium [&_dd]:[overflow-wrap:anywhere]">
      <div><dt>Sản phẩm</dt><dd>{product.name}</dd></div><div><dt>Serial</dt><dd>{product.serial ?? "Chưa cập nhật"}</dd></div>
      <div><dt>Mã đơn</dt><dd>{product.orderCode ?? "Chưa cập nhật"}</dd></div>
      <div><dt>Ngày nhận hàng / bắt đầu bảo hành</dt><dd>{product.purchasedAt ? formatDateOnly(product.purchasedAt) : "Chưa xác định"}</dd></div>
      <div><dt>Bảo hành đến</dt><dd>{product.expiresAt ? formatDateOnly(product.expiresAt) : "Chưa xác định"}</dd></div>
      <div><dt>Tên liên hệ</dt><dd>{request.contactName}</dd></div><div><dt>Điện thoại</dt><dd>{request.phone}</dd></div>
      <div><dt>Tài khoản</dt><dd>{request.ownerId ?? "Phiếu cũ chưa gắn tài khoản"}</dd></div>
    </dl>
    <h4 className="text-sm font-bold">Mô tả lỗi</h4><p className="mt-2 text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">{request.description}</p>
    <h4 className="mt-6 mb-3 text-sm font-bold">Lịch sử xử lý</h4>
    <ol className="ml-1 space-y-4 border-l-2 border-[var(--primary-border)] pl-4">{request.timeline.map((entry, index) => (
      <li key={index} className="text-sm"><strong>{WARRANTY_STATUS_LABEL[entry.status]}</strong><time dateTime={entry.date} className={`block ${ui.muted}`}>{formatDate(entry.date)}</time><p className="mt-1 whitespace-pre-wrap [overflow-wrap:anywhere]">{entry.note}</p></li>
    ))}</ol>
    {request.status === "completed" ? <p className="mt-6 rounded-xl bg-green-50 p-4 text-sm text-green-800">Phiếu đã hoàn tất.</p> :
      <form onSubmit={submit} className="mt-6 border-t border-[var(--border)] pt-5" noValidate>
        <fieldset disabled={disabled} className="space-y-4">
          <h4 className="font-bold">Cập nhật xử lý</h4>
          <label className={ui.label} htmlFor="warranty-next-status">Trạng thái xử lý
            <select id="warranty-next-status" className={ui.control} value={status} onChange={(event) => setStatus(event.target.value as WarrantyStatus)}>
              {WARRANTY_STATUS_FLOW.slice(step, step + 2).map((item) => <option key={item} value={item}>{WARRANTY_STATUS_LABEL[item]}</option>)}
            </select>
          </label>
          <label className={ui.label} htmlFor="warranty-note">Ghi chú xử lý (khách hàng sẽ thấy nội dung này)
            <textarea id="warranty-note" className={`${ui.control} min-h-28 resize-y`} required maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Kết quả kiểm tra hoặc nội dung xử lý..." />
          </label>
          <ServiceFeedback error={error} />
          <button type="submit" className={ui.primary}>{disabled ? "Đang xử lý..." : "Lưu cập nhật"}</button>
        </fieldset>
      </form>}
  </section>;
}
