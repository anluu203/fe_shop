"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../contexts/AuthContext";
import { PageSpinner } from "../../../components/ui/Spinner";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import { serviceClasses as ui } from "../../../components/client/customer-service-classes";
import { customerServices, isWarrantyActive, subscribeCustomerServices, validateWarrantyInput, WARRANTY_STATUS_LABEL } from "../../../lib/services/customer-services";
import { formatDate, formatDateOnly } from "../../../lib/utils/format";
import type { User } from "../../../lib/types";
import type { WarrantyProduct, WarrantyRequest, WarrantyRequestInput } from "../../../lib/types/customer-services";

export default function WarrantyPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!isLoading && !user) router.replace("/client/auth/login");
  }, [isLoading, user, router]);

  if (isLoading || !user) return <PageSpinner />;
  // Remount all account-specific state on account changes.
  return <WarrantyDashboard key={user.id} user={user} />;
}

function WarrantyDashboard({ user }: { user: User }) {
  const [snapshot, setSnapshot] = useState(() => customerServices.loadWarrantyRequests(user.id));
  useEffect(() => subscribeCustomerServices(() => setSnapshot(customerServices.loadWarrantyRequests(user.id))), [user.id]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [success, setSuccess] = useState("");
  const products = customerServices.getWarrantyProducts();
  const normalized = search.trim().toLocaleLowerCase("vi-VN");
  const filtered = products.filter((product) => {
    const matchesSearch = [product.name, product.serial, product.orderCode]
      .some((value) => value.toLocaleLowerCase("vi-VN").includes(normalized));
    const active = isWarrantyActive(product);
    return matchesSearch && (filter === "all" || (filter === "active" ? active : !active));
  });

  function submit(input: WarrantyRequestInput) {
    const result = customerServices.createWarrantyRequest(user.id, input);
    setSnapshot({ requests: result.requests, warning: result.warning });
    setSuccess(`Đã tạo phiếu ${result.request.id}. Yêu cầu minh họa đang ở trạng thái “Đã tiếp nhận”.`);
  }

  return (
    <>
      <section className={ui.hero}>
        <div className={ui.container}>
          <span className={ui.demo}>Dữ liệu minh họa</span>
          <h1 className={ui.title}><i className="fa fa-shield" aria-hidden="true" /> Bảo hành của tôi</h1>
          <p className={ui.subtitle}>Tra cứu thời hạn bảo hành, gửi yêu cầu và theo dõi tiến độ xử lý.</p>
        </div>
      </section>
      <div className={`${ui.container} ${ui.content}`}>
        <div className={ui.notice}>
          Đây là hồ sơ mẫu để trải nghiệm, không phải đơn hàng thực tế. Yêu cầu mới chỉ lưu trên trình duyệt này theo tài khoản của bạn, chưa được gửi đến cửa hàng.
        </div>
        {snapshot.warning && <div className={ui.noticeWarning} role="alert">{snapshot.warning}</div>}
        {success && <div className={ui.noticeSuccess} role="status">{success}</div>}
        <div className={ui.toolbar}>
          <label className={ui.field} htmlFor="warranty-search">
            Tìm sản phẩm bảo hành
            <input id="warranty-search" className={ui.control} type="search" value={search}
              onChange={(event) => setSearch(event.target.value)} placeholder="Tên sản phẩm, serial hoặc mã đơn..." />
          </label>
          <label className={ui.field} htmlFor="warranty-filter">
            Thời hạn bảo hành
            <select id="warranty-filter" className={ui.control} value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="all">Tất cả</option><option value="active">Còn hạn</option><option value="expired">Hết hạn</option>
            </select>
          </label>
        </div>
        <div className={`${ui.row} mb-[18px]`}>
          <h2 className="text-xl font-extrabold">Sản phẩm của bạn</h2>
          <span className={ui.muted} aria-live="polite">{filtered.length} / {products.length} sản phẩm</span>
        </div>
        {filtered.length === 0 ? (
          <div className={ui.emptyPanel}>
            <i className={`fa fa-search ${ui.emptyIcon}`} aria-hidden="true" />
            <h2 className={ui.emptyTitle}>Không tìm thấy sản phẩm</h2><p className={ui.muted}>Thử từ khóa khác hoặc thay đổi bộ lọc.</p>
          </div>
        ) : (
          <div className={ui.grid}>
            {filtered.map((product) => (
              <WarrantyCard key={product.id} product={product} user={user}
                requests={snapshot.requests.filter((request) => request.productId === product.id)} onSubmit={submit} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function WarrantyCard({ product, user, requests, onSubmit }: {
  product: WarrantyProduct;
  user: User;
  requests: WarrantyRequest[];
  onSubmit: (input: WarrantyRequestInput) => void;
}) {
  const active = isWarrantyActive(product);
  const pending = requests.some((request) => request.status !== "completed");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ contactName: user.username, phone: "", description: "" });
  const [errors, setErrors] = useState<ReturnType<typeof validateWarrantyInput>>({});
  const [submitError, setSubmitError] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = { productId: product.id, ...form };
    const nextErrors = validateWarrantyInput(input);
    setErrors(nextErrors);
    setSubmitError("");
    if (Object.keys(nextErrors).length) return;
    try {
      onSubmit(input);
      setFormOpen(false);
      setForm({ contactName: user.username, phone: "", description: "" });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Không thể tạo yêu cầu. Vui lòng thử lại.");
    }
  }

  return (
    <article className={ui.panel}>
      <Badge variant={active ? "success" : "danger"}>{active ? "Còn hạn bảo hành" : "Hết hạn bảo hành"}</Badge>
      <h3 className={ui.cardTitle}>{product.name}</h3>
      <dl className={ui.metadata}>
        <div><dt>Serial</dt><dd>{product.serial}</dd></div>
        <div><dt>Mã đơn mẫu</dt><dd>{product.orderCode}</dd></div>
        <div><dt>Ngày mua</dt><dd>{formatDateOnly(product.purchasedAt)}</dd></div>
        <div><dt>Bảo hành đến hết ngày</dt><dd>{formatDateOnly(product.expiresAt)}</dd></div>
      </dl>
      <Button type="button" variant="outline" disabled={!active || pending} onClick={() => setFormOpen(!formOpen)}
        aria-expanded={formOpen} aria-controls={`form-${product.id}`}>
        {formOpen ? "Đóng biểu mẫu" : "Gửi yêu cầu bảo hành"}
      </Button>
      {(!active || pending) && <p className={`${ui.muted} mt-2`}>
        {!active ? "Sản phẩm đã hết thời hạn bảo hành." : "Sản phẩm đang có phiếu xử lý. Bạn có thể xem tiến độ bên dưới."}
      </p>}
      {formOpen && active && !pending && (
        <form id={`form-${product.id}`} className={ui.form} onSubmit={handleSubmit} noValidate>
          <h3 className="mb-4 text-base font-bold">Thông tin yêu cầu</h3>
          <div className={ui.stack}>
            <Input id={`contact-${product.id}`} label="Tên liên hệ" autoComplete="name" required maxLength={100}
              value={form.contactName} error={errors.contactName} aria-invalid={!!errors.contactName}
              onChange={(event) => setForm({ ...form, contactName: event.target.value })} />
            <Input id={`phone-${product.id}`} label="Số điện thoại" type="tel" autoComplete="tel" required maxLength={20}
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
          </div>
          {Object.keys(errors).length > 0 && <p className={`${ui.error} mb-3`} role="alert">Vui lòng kiểm tra các trường thông tin được đánh dấu.</p>}
          {submitError && <p className={`${ui.error} mb-3`} role="alert">{submitError}</p>}
          <div className={ui.actions}>
            <Button type="submit">Gửi yêu cầu</Button>
            <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>Hủy</Button>
          </div>
        </form>
      )}
      <details className={ui.detail} open={pending || undefined}>
        <summary className={ui.summary}>Chi tiết & lịch sử bảo hành ({requests.length} phiếu)</summary>
        {requests.length === 0 ? <p className={`${ui.muted} mt-3`}>Chưa có yêu cầu bảo hành cho sản phẩm này.</p> :
          requests.map((request) => (
            <section className={ui.request} key={request.id} aria-label={`Phiếu ${request.id}`}>
              <div className={ui.row}>
                <strong className="text-[13px]">{request.id}</strong>
                <Badge variant={request.status === "completed" ? "success" : "warning"}>{WARRANTY_STATUS_LABEL[request.status]}</Badge>
              </div>
              <p className={ui.muted}>{request.contactName} · {request.phone}</p>
              <p>{request.description}</p>
              <ol className={ui.timeline}>
                {request.timeline.map((entry, index) => (
                  <li key={`${entry.status}-${index}`} className={ui.timelineItem}>
                    <strong>{WARRANTY_STATUS_LABEL[entry.status]}</strong>
                    <time className={ui.timelineTime} dateTime={entry.date}>{formatDate(entry.date)}</time>
                    <span>{entry.note}</span>
                  </li>
                ))}
              </ol>
            </section>
          ))}
      </details>
    </article>
  );
}
