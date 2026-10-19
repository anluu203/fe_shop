"use client";

import { useEffect, useState } from "react";
import Button from "../../../components/ui/Button";
import Badge from "../../../components/ui/Badge";
import { serviceClasses as ui } from "../../../components/client/customer-service-classes";
import { customerServices, subscribeCustomerServices } from "../../../lib/services/customer-services";
import { formatPrice } from "../../../lib/utils/format";
import type { ComponentType, ConsultationQuery, Usage } from "../../../lib/types/customer-services";

const options = customerServices.getConsultationOptions();

export default function ConsultationPage() {
  const [, refreshCatalog] = useState(0);
  useEffect(() => subscribeCustomerServices(() => refreshCatalog((revision) => revision + 1)), []);
  const [usage, setUsage] = useState<Usage>("relaxation");
  const [component, setComponent] = useState<ComponentType>("literature");
  const [budget, setBudget] = useState("200000");
  const [query, setQuery] = useState<ConsultationQuery | null>(null);
  const [error, setError] = useState("");
  const products = query ? customerServices.recommend(query) : [];

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(budget);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      setError("Vui lòng nhập ngân sách là số nguyên lớn hơn 0.");
      return;
    }
    setError("");
    setQuery({ usage, component, budget: amount });
  }

  function reset() {
    setUsage("relaxation");
    setComponent("literature");
    setBudget("200000");
    setQuery(null);
    setError("");
  }

  return (
    <>
      <section className={ui.hero}>
        <div className={ui.container}>
          <span className={ui.demo}>Dữ liệu minh họa</span>
          <h1 className={ui.title}><i className="fa fa-lightbulb-o" aria-hidden="true" /> Tư vấn chọn sách</h1>
          <p className={ui.subtitle}>Chọn sách phù hợp với nhu cầu và ngân sách của bạn.</p>
        </div>
      </section>
      <div className={`${ui.container} ${ui.content}`}>
        <div className={ui.notice}>
          Giá và sách dưới đây dùng để trải nghiệm tính năng. Gợi ý áp dụng cho từng sách; hãy xem thông tin tác giả và giới thiệu sách trước khi lựa chọn.
        </div>
        <div className={ui.layout}>
          <form className={ui.panel} onSubmit={handleSubmit} noValidate>
            <h2 className={ui.panelTitle}>Bạn đang cần gì?</h2>
            <fieldset className="mb-[18px] min-w-0 border-0">
              <legend className="mb-2 text-[13px] font-semibold">Nhu cầu sử dụng</legend>
              {options.usages.map((item) => (
                <button key={item.id} type="button" className={ui.usage}
                  aria-pressed={usage === item.id} onClick={() => setUsage(item.id)}>
                  <i className={`fa ${item.icon} w-[25px] text-center text-[21px]`} aria-hidden="true" />
                  <span><strong className="block text-[13px]">{item.label}</strong><small className="text-xs font-normal">{item.description}</small></span>
                </button>
              ))}
            </fieldset>
            <label className={ui.field} htmlFor="consultation-component">
              Loại sách
              <select id="consultation-component" className={ui.control} value={component}
                onChange={(event) => setComponent(event.target.value as ComponentType)}>
                {options.components.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <label className={ui.field} htmlFor="consultation-budget">
              Ngân sách tối đa cho một cuốn sách (VNĐ)
              <input id="consultation-budget" type="number" inputMode="numeric" min="1" step="1"
                className={ui.control} value={budget} onChange={(event) => setBudget(event.target.value)}
                aria-invalid={!!error} aria-describedby={error ? "budget-error" : "budget-hint"} />
              {error ? <span id="budget-error" className={ui.error} role="alert">{error}</span> :
                <span id="budget-hint" className={ui.muted}>Ví dụ: 200000 = 200.000 ₫</span>}
            </label>
            <div className={ui.actions}>
              <Button type="submit" icon={<i className="fa fa-search" aria-hidden="true" />}>Xem gợi ý</Button>
              <Button type="button" variant="ghost" onClick={reset}>Đặt lại</Button>
            </div>
          </form>
          <section aria-label="Kết quả tư vấn" aria-live="polite">
            {!query ? (
              <div className={ui.emptyPanel}>
                <i className={`fa fa-sliders ${ui.emptyIcon}`} aria-hidden="true" />
                <h2 className={ui.emptyTitle}>Tìm sách phù hợp với bạn</h2>
                <p className={ui.muted}>Chọn nhu cầu, loại sách và ngân sách, sau đó bấm “Xem gợi ý”.</p>
              </div>
            ) : (
              <>
                <div className={`${ui.row} mb-[18px]`}>
                  <h2 className="text-xl font-extrabold">{products.length} sách phù hợp</h2>
                  <span className={ui.muted}>Giá từ thấp đến cao</span>
                </div>
                <p className={`${ui.muted} mb-[18px]`}>
                  {options.usages.find((item) => item.id === query.usage)?.label} · {options.components.find((item) => item.id === query.component)?.label} · Tối đa {formatPrice(query.budget)}
                </p>
                {products.length === 0 ? (
                  <div className={ui.emptyPanel}>
                    <i className={`fa fa-search ${ui.emptyIcon}`} aria-hidden="true" />
                    <h2 className={ui.emptyTitle}>Chưa có gợi ý phù hợp</h2>
                    <p className={ui.muted}>Thử tăng ngân sách hoặc chọn nhu cầu, loại sách khác trong bộ dữ liệu mẫu.</p>
                  </div>
                ) : (
                  <div className={ui.grid}>
                    {products.map((product) => (
                      <article key={product.id} className={ui.panel}>
                        <Badge variant="primary">{options.components.find((item) => item.id === product.component)?.label}</Badge>
                        <h3 className={ui.cardTitle}>{product.name}</h3>
                        <div className={ui.price}>{formatPrice(product.price)}</div>
                        <ul className={ui.specs}>{product.specs.map((spec) => <li key={spec}>{spec}</li>)}</ul>
                        <div className={ui.reason}>
                          <strong><i className="fa fa-check-circle" aria-hidden="true" /> Vì sao phù hợp?</strong>
                          <p className="mt-1.5">{product.reasons[query.usage]}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
