"use client";

import { useState } from "react";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import { formatPrice } from "../../../lib/utils/format";
import styles from "./cart.module.css";

// Local preview data only. These values are never sent to the order API.
const FREE_SHIPPING_MINIMUM = 500_000;
const DELIVERY_OPTIONS = [
  { id: "standard", name: "Giao hàng tiêu chuẩn", estimate: "Dự kiến 3–5 ngày làm việc", fee: 30_000, icon: "fa-truck" },
  { id: "express", name: "Giao hàng nhanh", estimate: "Dự kiến 1–2 ngày làm việc", fee: 50_000, icon: "fa-bolt" },
] as const;

const PROMOTIONS = [
  { code: "LINHKIEN5", title: "Giảm 5%, tối đa 100.000 ₫", minimum: 500_000, rate: 0.05, maximum: 100_000 },
  { code: "GIAM100K", title: "Giảm ngay 100.000 ₫", minimum: 2_000_000, rate: 0, maximum: 100_000 },
] as const;

export type DeliveryMethod = (typeof DELIVERY_OPTIONS)[number]["id"];

export function getCartPreview(subtotal: number, deliveryMethod: DeliveryMethod, promotionCode: string) {
  const delivery = DELIVERY_OPTIONS.find((option) => option.id === deliveryMethod) ?? DELIVERY_OPTIONS[0];
  const promotion = PROMOTIONS.find((option) => option.code === promotionCode && subtotal >= option.minimum);
  const discount = promotion
    ? Math.min(subtotal, promotion.rate ? Math.floor(subtotal * promotion.rate) : promotion.maximum, promotion.maximum)
    : 0;
  const shippingFee = delivery.id === "standard" && subtotal >= FREE_SHIPPING_MINIMUM ? 0 : delivery.fee;

  return { subtotal, shippingFee, discount, total: Math.max(0, subtotal - discount + shippingFee), promotion };
}

export function CartDeliveryPreview({
  recipientName,
  method,
  subtotal,
  onMethodChange,
}: {
  recipientName: string;
  method: DeliveryMethod;
  subtotal: number;
  onMethodChange: (method: DeliveryMethod) => void;
}) {
  const [address, setAddress] = useState({
    name: recipientName,
    phone: "0901 234 567",
    street: "123 Nguyễn Văn Cừ, Phường Chợ Quán, TP. Hồ Chí Minh",
    note: "Gọi cho tôi trước khi giao hàng.",
  });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(address);
  const [error, setError] = useState("");

  return (
    <section className={styles.panel} aria-labelledby="delivery-heading">
      <div className={styles.panelHeading}>
        <h2 id="delivery-heading"><i className="fa fa-map-marker" aria-hidden="true" /> Thông tin giao hàng</h2>
        <span className={styles.previewBadge}>Xem trước</span>
      </div>
      <p className={styles.notice}>
        Địa chỉ, phí giao hàng và ưu đãi là dữ liệu minh họa, chưa áp dụng khi đặt hàng.
      </p>

      {editing ? (
        <form className={styles.addressForm} onSubmit={(event) => {
          event.preventDefault();
          if (!draft.name.trim() || !draft.street.trim()) {
            setError("Vui lòng nhập họ tên và địa chỉ nhận hàng.");
            return;
          }
          if (!/^(0\d{9}|\+84\d{9})$/.test(draft.phone.replace(/\s/g, ""))) {
            setError("Vui lòng nhập số điện thoại hợp lệ (10 chữ số hoặc +84).");
            return;
          }
          setAddress({ name: draft.name.trim(), phone: draft.phone.trim(), street: draft.street.trim(), note: draft.note.trim() });
          setEditing(false);
          setError("");
        }}>
          <div className={styles.formGrid}>
            <Input id="delivery-name" label="Người nhận" value={draft.name} required maxLength={100} autoComplete="name"
              onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            <Input id="delivery-phone" label="Số điện thoại" type="tel" value={draft.phone} required maxLength={20} autoComplete="tel"
              onChange={(event) => setDraft({ ...draft, phone: event.target.value })} />
          </div>
          <Input id="delivery-address" label="Địa chỉ nhận hàng" value={draft.street} required maxLength={300} autoComplete="street-address"
            onChange={(event) => setDraft({ ...draft, street: event.target.value })} />
          <Input id="delivery-note" label="Ghi chú giao hàng (không bắt buộc)" value={draft.note} maxLength={300}
            onChange={(event) => setDraft({ ...draft, note: event.target.value })} />
          {error && <p className={styles.error} role="alert">{error}</p>}
          <div className={styles.actions}>
            <Button type="submit" size="sm">Lưu thông tin mẫu</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>Hủy</Button>
          </div>
        </form>
      ) : (
        <div className={styles.address}>
          <div className={styles.addressDetails}>
            <p><strong>{address.name}</strong><span className={styles.phone}>{address.phone}</span><span className={styles.sampleBadge}>Địa chỉ mẫu</span></p>
            <p>{address.street}</p>
            {address.note && <p className={styles.muted}>Ghi chú: {address.note}</p>}
          </div>
          <button className={styles.textButton} type="button" onClick={() => {
            setDraft(address);
            setError("");
            setEditing(true);
          }}>Thay đổi</button>
        </div>
      )}

      <fieldset className={styles.deliveryOptions}>
        <legend>Phương thức giao hàng</legend>
        <div className={styles.optionGrid}>
          {DELIVERY_OPTIONS.map((option) => {
            const fee = option.id === "standard" && subtotal >= FREE_SHIPPING_MINIMUM ? 0 : option.fee;
            return (
              <label className={`${styles.deliveryOption} ${method === option.id ? styles.selected : ""}`} key={option.id}>
                <input type="radio" name="delivery-method" value={option.id} checked={method === option.id}
                  onChange={() => onMethodChange(option.id)} />
                <span className={styles.optionDetails}>
                  <strong><i className={`fa ${option.icon}`} aria-hidden="true" /> {option.name}</strong>
                  <span>{option.estimate}</span>
                  <b className={fee === 0 ? styles.savings : ""}>{fee === 0 ? "Miễn phí" : formatPrice(fee)}</b>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className={styles.shippingHint}>
        <i className="fa fa-info-circle" aria-hidden="true" />
        <span>{subtotal >= FREE_SHIPPING_MINIMUM
          ? "Đơn hàng đủ điều kiện miễn phí giao tiêu chuẩn trong bản xem trước."
          : `Mua thêm ${formatPrice(FREE_SHIPPING_MINIMUM - subtotal)} để được miễn phí giao tiêu chuẩn.`}</span>
      </div>
    </section>
  );
}

export function CartPromotionPreview({
  subtotal,
  code,
  onChange,
}: {
  subtotal: number;
  code: string;
  onChange: (code: string) => void;
}) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const applied = PROMOTIONS.find((promotion) => promotion.code === code && subtotal >= promotion.minimum);

  const applyCode = (value: string) => {
    const normalized = value.trim().toUpperCase();
    const promotion = PROMOTIONS.find((option) => option.code === normalized);
    if (!promotion) {
      setError("Mã không hợp lệ. Hãy thử LINHKIEN5 hoặc GIAM100K.");
      return;
    }
    if (subtotal < promotion.minimum) {
      setError(`Đơn hàng cần đạt ${formatPrice(promotion.minimum)} để dùng mã ${promotion.code}.`);
      return;
    }
    onChange(promotion.code);
    setInput("");
    setError("");
  };

  return (
    <section className={styles.panel} aria-labelledby="promotion-heading">
      <div className={styles.panelHeading}>
        <h2 id="promotion-heading"><i className="fa fa-tags" aria-hidden="true" /> Khuyến mãi cho giỏ hàng</h2>
        <span className={styles.previewBadge}>Ưu đãi mẫu</span>
      </div>
      <p className={styles.muted}>Chọn 1 mã giảm giá cho danh sách sản phẩm. Có thể dùng cùng ưu đãi miễn phí giao tiêu chuẩn.</p>
      <form className={styles.couponForm} onSubmit={(event) => { event.preventDefault(); applyCode(input); }}>
        <div>
          <label className={styles.inputLabel} htmlFor="promotion-code">Mã khuyến mãi</label>
          <input id="promotion-code" value={input} placeholder="Nhập mã khuyến mãi" autoComplete="off" maxLength={30}
            aria-invalid={!!error} aria-describedby={error ? "promotion-error" : undefined}
            onChange={(event) => { setInput(event.target.value); setError(""); }} />
        </div>
        <Button type="submit" variant="outline" size="sm">Áp dụng thử</Button>
      </form>
      {error && <p id="promotion-error" className={styles.error} role="alert">{error}</p>}
      <div className={styles.promotionList}>
        {PROMOTIONS.map((promotion) => {
          const eligible = subtotal >= promotion.minimum;
          const selected = code === promotion.code;
          return (
            <div key={promotion.code} className={`${styles.promotion} ${selected && eligible ? styles.selected : ""}`}>
              <div className={styles.ticketIcon}><i className="fa fa-ticket" aria-hidden="true" /></div>
              <div className={styles.promotionDetails}>
                <strong>{promotion.title}</strong>
                <span>Đơn từ {formatPrice(promotion.minimum)}</span>
                <code>{promotion.code}</code>
                {!eligible && <span className={styles.muted}>Mua thêm {formatPrice(promotion.minimum - subtotal)} để sử dụng</span>}
              </div>
              <button type="button" className={styles.textButton} disabled={!eligible && !selected}
                aria-label={`${selected ? "Bỏ chọn" : "Chọn"} mã ${promotion.code}`}
                onClick={() => { if (selected) { onChange(""); setError(""); } else { applyCode(promotion.code); } }}>
                {selected ? "Bỏ chọn" : eligible ? "Chọn mã" : "Chưa đủ điều kiện"}
              </button>
            </div>
          );
        })}
      </div>
      <p className={applied ? styles.savings : styles.muted} role="status">
        {applied ? `Đã áp dụng thử mã ${applied.code}. Tổng dự kiến đã được cập nhật.`
          : code ? `Mã ${code} không còn đủ điều kiện sau khi thay đổi giỏ hàng. Chưa tính giảm giá.`
          : "Chưa chọn mã khuyến mãi. Các ưu đãi chỉ dùng để xem trước."}
      </p>
    </section>
  );
}

export function CartProductPromotion({ unitPrice }: { unitPrice: string }) {
  return (
    <p className={styles.productPromotion}>
      <i className={`fa ${Number(unitPrice) >= 1_000_000 ? "fa-gift" : "fa-tag"}`} aria-hidden="true" />
      {Number(unitPrice) >= 1_000_000
        ? "Quà tặng mẫu: bộ vệ sinh máy tính"
        : "Ưu đãi mẫu: mã LINHKIEN5 cho đơn từ 500.000 ₫"}
    </p>
  );
}
