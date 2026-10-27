"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../contexts/AuthContext";
import { PageSpinner } from "../../../components/ui/Spinner";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Pagination from "../../../components/ui/Pagination";
import { serviceClasses as ui } from "../../../components/client/customer-service-classes";
import { warrantyApi } from "../../../lib/api/warranties";
import { ApiRequestError } from "../../../lib/api/client";
import { useWarrantyErrorHandler, useWarrantyResource } from "../../../lib/hooks/use-warranty-resource";
import { COVERAGE_LABEL, validateWarrantyInput, WARRANTY_STATUS_LABEL } from "../../../lib/services/warranty";
import { formatDate, formatDateOnly } from "../../../lib/utils/format";
import type { User } from "../../../lib/types";
import type { WarrantyProduct, WarrantyProductQuery, WarrantyRequest, WarrantyRequestInput, WarrantyRequestQuery } from "../../../lib/types/warranty";

export default function WarrantyPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!isLoading && !user) router.replace("/client/auth/login");
  }, [isLoading, user, router]);

  if (isLoading || !user) return <PageSpinner />;
  return <WarrantyDashboard key={user.id} user={user} />;
}

function WarrantyDashboard({ user }: { user: User }) {
  const [productQuery, setProductQuery] = useState<WarrantyProductQuery>({ page: 1, pageSize: 12, search: "", coverage: "all" });
  const [requestQuery, setRequestQuery] = useState<WarrantyRequestQuery>({ page: 1, pageSize: 10 });
  const [historyProduct, setHistoryProduct] = useState<WarrantyProduct | null>(null);
  const [success, setSuccess] = useState("");
  const [actionError, setActionError] = useState("");
  const handleError = useWarrantyErrorHandler();
  const loadProducts = useCallback(() => warrantyApi.getProducts(productQuery), [productQuery]);
  const loadRequests = useCallback(() => warrantyApi.getRequests(requestQuery), [requestQuery]);
  const products = useWarrantyResource(loadProducts);
  const requests = useWarrantyResource(loadRequests);

  function refresh() {
    products.refresh();
    requests.refresh();
  }

  async function submit(input: WarrantyRequestInput) {
    setActionError("");
    setSuccess("");
    try {
      const request = await warrantyApi.createRequest(input);
      setSuccess(`Đã tạo phiếu ${request.ticketCode}. Yêu cầu đang ở trạng thái “${WARRANTY_STATUS_LABEL[request.status]}”.`);
      setHistoryProduct(null);
      setRequestQuery({ page: 1, pageSize: 10 });
      refresh();
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 409) refresh();
      const message = handleError(error);
      setActionError(message);
      throw new Error(message);
    }
  }

  function showHistory(product: WarrantyProduct | null) {
    setHistoryProduct(product);
    setRequestQuery({ page: 1, pageSize: 10, productId: product?.id });
    document.getElementById("warranty-history")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <section className={ui.hero}>
        <div className={ui.container}>
          <h1 className={ui.title}><i className="fa fa-shield" aria-hidden="true" /> Bảo hành của tôi</h1>
          <p className={ui.subtitle}>Tra cứu thời hạn bảo hành, gửi yêu cầu và theo dõi tiến độ xử lý.</p>
        </div>
      </section>
      <div className={`${ui.container} ${ui.content}`}>
        {actionError && <div className={ui.noticeWarning} role="alert">{actionError}</div>}
        {success && <div className={ui.noticeSuccess} role="status">{success}</div>}
        <div className={`${ui.row} mb-5`}>
          <p className={ui.muted}>Hồ sơ bảo hành được tạo khi đơn hàng hoàn tất và bàn giao thành công.</p>
          <Button type="button" variant="outline" onClick={refresh} disabled={products.loading || requests.loading}>Làm mới</Button>
        </div>
        <div className={ui.toolbar}>
          <label className={ui.field} htmlFor="warranty-search">
            Tìm sản phẩm bảo hành
            <input id="warranty-search" className={ui.control} type="search" maxLength={200} value={productQuery.search}
              onChange={(event) => setProductQuery({ ...productQuery, search: event.target.value, page: 1 })} placeholder="Tên sản phẩm, serial hoặc mã đơn..." />
          </label>
          <label className={ui.field} htmlFor="warranty-filter">
            Thời hạn bảo hành
            <select id="warranty-filter" className={ui.control} value={productQuery.coverage}
              onChange={(event) => setProductQuery({ ...productQuery, coverage: event.target.value as WarrantyProductQuery["coverage"], page: 1 })}>
              <option value="all">Tất cả</option>
              {Object.entries(COVERAGE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
        <div className={`${ui.row} mb-[18px]`}>
          <h2 className="text-xl font-extrabold">Sản phẩm của bạn</h2>
          <span className={ui.muted} aria-live="polite">{products.data ? `${products.data.totalCount} sản phẩm` : ""}</span>
        </div>
        {products.error && <div className={ui.noticeWarning} role="alert">{products.error}</div>}
        {products.loading && <p className={`${ui.muted} mb-4`} role="status">Đang tải sản phẩm bảo hành...</p>}
        {products.data && <div aria-busy={products.loading}>
          {products.data.items.length === 0 ? (
            <div className={ui.emptyPanel}>
              <i className={`fa fa-search ${ui.emptyIcon}`} aria-hidden="true" />
              <h2 className={ui.emptyTitle}>Không tìm thấy sản phẩm bảo hành</h2>
              <p className={ui.muted}>Thử thay đổi bộ lọc. Sản phẩm chỉ xuất hiện sau khi đơn hàng hoàn tất.</p>
            </div>
          ) : <div className={ui.grid}>
            {products.data.items.map((product) => <WarrantyCard key={product.id} product={product} user={user}
              refreshing={products.loading} onSubmit={submit} onShowHistory={() => showHistory(product)} />)}
          </div>}
          {!products.loading && <Pagination page={products.data.pageNumber} totalPages={products.data.totalPages}
            onChange={(page) => setProductQuery({ ...productQuery, page })} />}
        </div>}

        <section id="warranty-history" className="mt-10 scroll-mt-6" aria-label="Lịch sử bảo hành">
          <div className={`${ui.row} mb-5`}>
            <div>
              <h2 className="text-xl font-extrabold">Lịch sử bảo hành {requests.data ? `(${requests.data.totalCount} phiếu)` : ""}</h2>
              <p className={ui.muted}>{historyProduct ? historyProduct.name : "Tất cả sản phẩm của bạn"}</p>
            </div>
            {historyProduct && <Button type="button" variant="ghost" onClick={() => showHistory(null)}>Xem tất cả phiếu</Button>}
          </div>
          {requests.error && <div className={ui.noticeWarning} role="alert">{requests.error}</div>}
          {requests.loading && <p className={`${ui.muted} mb-4`} role="status">Đang tải lịch sử bảo hành...</p>}
          {requests.data && <div aria-busy={requests.loading}>
            {requests.data.items.length === 0 ? <p className={ui.emptyPanel}>Chưa có yêu cầu bảo hành.</p> :
              <div className={ui.stack}>{requests.data.items.map((request) => <WarrantyHistory key={request.id} request={request} />)}</div>}
            {!requests.loading && <Pagination page={requests.data.pageNumber} totalPages={requests.data.totalPages}
              onChange={(page) => setRequestQuery({ ...requestQuery, page })} />}
          </div>}
        </section>
      </div>
    </>
  );
}

function WarrantyCard({ product, user, refreshing, onSubmit, onShowHistory }: {
  product: WarrantyProduct;
  user: User;
  refreshing: boolean;
  onSubmit: (input: WarrantyRequestInput) => Promise<void>;
  onShowHistory: () => void;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ contactName: user.username, phone: "", description: "" });
  const [errors, setErrors] = useState<ReturnType<typeof validateWarrantyInput>>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submitLock = useRef(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current || !product.canRequest || refreshing) return;
    const input = { productId: product.id, ...form };
    const nextErrors = validateWarrantyInput(input);
    setErrors(nextErrors);
    setSubmitError("");
    if (Object.keys(nextErrors).length) return;
    submitLock.current = true;
    setSubmitting(true);
    try {
      await onSubmit(input);
      setFormOpen(false);
      setForm({ contactName: user.username, phone: "", description: "" });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Không thể tạo yêu cầu. Vui lòng thử lại.");
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  }

  return (
    <article className={ui.panel}>
      <Badge variant={product.coverageStatus === "active" ? "success" : product.coverageStatus === "expired" ? "danger" : "neutral"}>
        {COVERAGE_LABEL[product.coverageStatus]}
      </Badge>
      <h3 className={ui.cardTitle}>{product.name}</h3>
      <dl className={ui.metadata}>
        <div><dt>Serial</dt><dd>{product.serial ?? "Chưa cập nhật"}</dd></div>
        <div><dt>Mã đơn</dt><dd>{product.orderCode}</dd></div>
        <div><dt>Thiết bị số</dt><dd>{product.unitNumber}</dd></div>
        <div><dt>Ngày nhận hàng / bắt đầu bảo hành</dt><dd>{formatDateOnly(product.purchasedAt)}</dd></div>
        <div><dt>Bảo hành đến hết ngày</dt><dd>{product.expiresAt ? formatDateOnly(product.expiresAt) : "Chưa xác định"}</dd></div>
      </dl>
      <div className={ui.actions}>
        <Button type="button" variant="outline" disabled={!product.canRequest || refreshing || submitting} onClick={() => setFormOpen(!formOpen)}
          aria-expanded={formOpen && product.canRequest} aria-controls={`form-${product.id}`}>
          {formOpen && product.canRequest ? "Đóng biểu mẫu" : "Gửi yêu cầu bảo hành"}
        </Button>
        <Button type="button" variant="ghost" onClick={onShowHistory}>Xem lịch sử</Button>
      </div>
      {!product.canRequest && <p className={`${ui.muted} mt-2`}>
        {product.activeRequestId ? "Sản phẩm đang có phiếu xử lý. Chọn Xem lịch sử để theo dõi tiến độ." :
          product.coverageStatus === "active" ? "Sản phẩm hiện chưa thể gửi yêu cầu. Vui lòng làm mới hoặc liên hệ cửa hàng." : COVERAGE_LABEL[product.coverageStatus]}
      </p>}
      {submitError && <p className={`${ui.error} mt-3`} role="alert">{submitError}</p>}
      {formOpen && product.canRequest && (
        <form id={`form-${product.id}`} className={ui.form} onSubmit={handleSubmit} noValidate>
          <h3 className="mb-4 text-base font-bold">Thông tin yêu cầu</h3>
          <fieldset disabled={submitting || refreshing} className={ui.stack}>
            <Input id={`contact-${product.id}`} label="Tên liên hệ" autoComplete="name" required maxLength={200}
              value={form.contactName} error={errors.contactName} aria-invalid={!!errors.contactName}
              onChange={(event) => setForm({ ...form, contactName: event.target.value })} />
            <Input id={`phone-${product.id}`} label="Số điện thoại" type="tel" autoComplete="tel" required maxLength={30}
              value={form.phone} error={errors.phone} aria-invalid={!!errors.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            <label className={ui.field} htmlFor={`description-${product.id}`}>
              Mô tả lỗi
              <textarea id={`description-${product.id}`} className={`${ui.control} min-h-[110px] resize-y`} required maxLength={2000}
                value={form.description} aria-invalid={!!errors.description}
                aria-describedby={errors.description ? `description-error-${product.id}` : undefined}
                onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Mô tả tình trạng và thời điểm xảy ra lỗi..." />
              {errors.description && <span id={`description-error-${product.id}`} className={ui.error}>{errors.description}</span>}
            </label>
            {Object.keys(errors).length > 0 && <p className={ui.error} role="alert">Vui lòng kiểm tra các trường thông tin được đánh dấu.</p>}
            <div className={ui.actions}>
              <Button type="submit" loading={submitting}>Gửi yêu cầu</Button>
              <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>Hủy</Button>
            </div>
          </fieldset>
        </form>
      )}
    </article>
  );
}

function WarrantyHistory({ request }: { request: WarrantyRequest }) {
  return <details className={ui.panel}>
    <summary className={ui.summary}>
      <span className="[overflow-wrap:anywhere]">{request.ticketCode} · {request.product.name}</span>
      <Badge variant={request.status === "completed" ? "success" : "warning"}>{WARRANTY_STATUS_LABEL[request.status]}</Badge>
    </summary>
    <dl className={`${ui.metadata} mt-4`}>
      <div><dt>Serial</dt><dd>{request.product.serial ?? "Chưa cập nhật"}</dd></div>
      <div><dt>Mã đơn</dt><dd>{request.product.orderCode ?? "Chưa cập nhật"}</dd></div>
      <div><dt>Ngày gửi</dt><dd>{formatDate(request.createdAt)}</dd></div>
      <div><dt>Liên hệ</dt><dd>{request.contactName} · {request.phone}</dd></div>
    </dl>
    <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{request.description}</p>
    <ol className={ui.timeline}>
      {request.timeline.map((entry, index) => (
        <li key={index} className={ui.timelineItem}>
          <strong>{WARRANTY_STATUS_LABEL[entry.status]}</strong>
          <time className={ui.timelineTime} dateTime={entry.date}>{formatDate(entry.date)}</time>
          <span className="whitespace-pre-wrap [overflow-wrap:anywhere]">{entry.note}</span>
        </li>
      ))}
    </ol>
  </details>;
}
