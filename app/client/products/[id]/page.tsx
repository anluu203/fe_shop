"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { productApi } from "../../../../lib/api/products";
import type { Product } from "../../../../lib/types";
import { formatPrice } from "../../../../lib/utils/format";
import { useCart } from "../../../../contexts/CartContext";
import { useAuth } from "../../../../contexts/AuthContext";
import { PageSpinner } from "../../../../components/ui/Spinner";
import Button from "../../../../components/ui/Button";
import Link from "next/link";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { addItem, isLoading: cartLoading } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    productApi
      .getOne(id)
      .then(setProduct)
      .catch(() => setError("Không tìm thấy sản phẩm"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddToCart = async () => {
    if (!user) {
      router.push("/client/auth/login");
      return;
    }
    setAdding(true);
    try {
      await addItem(product!.id, qty);
      setAdded(true);
      setTimeout(() => setAdded(false), 2500);
    } finally {
      setAdding(false);
    }
  };

  if (loading) return <PageSpinner />;
  if (error || !product) {
    return (
      <div
        style={{ textAlign: "center", padding: "80px 0", color: "var(--text-muted)" }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}><i className="fa fa-meh-o" /></div>
        <h2 style={{ color: "var(--text-secondary)", marginBottom: 12 }}>
          Không tìm thấy sản phẩm
        </h2>
        <Link
          href="/client/products"
          style={{ color: "var(--primary)", fontWeight: 600 }}
        >
          <i className="fa fa-arrow-left" style={{ marginRight: 4 }} /> Quay lại danh sách
        </Link>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--bg-page)", minHeight: "100vh" }}>
      {/* Breadcrumb */}
      <div
        style={{
          background: "var(--bg-card)",
          borderBottom: "1px solid var(--border)",
          padding: "12px 0",
        }}
      >
        <div
          className="container"
          style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", gap: 6, flexWrap: "wrap" }}
        >
          <Link href="/client" style={{ color: "var(--primary)" }}>
            Trang chủ
          </Link>
          <span>›</span>
          <Link href="/client/products" style={{ color: "var(--primary)" }}>
            Sản phẩm
          </Link>
          <span>›</span>
          <Link
            href={`/client/products?parentId=${product.category?.parent?.id}`}
            style={{ color: "var(--primary)" }}
          >
            {product.category?.parent?.name}
          </Link>
          <span>›</span>
          <span
            className="line-clamp-1"
            style={{ color: "var(--text-secondary)" }}
          >
            {product.name}
          </span>
        </div>
      </div>

      <div className="container" style={{ padding: "32px 32px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 40,
            alignItems: "start",
          }}
        >
          {/* Image */}
          <div
            style={{
              background: "var(--bg-card)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border)",
              padding: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              aspectRatio: "1",
              position: "sticky",
              top: "calc(var(--header-height) + 16px)",
            }}
          >
            {product.imageUrl && !imgError ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                onError={() => setImgError(true)}
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                }}
              />
            ) : (
              <div
                style={{
                  fontSize: 80,
                  opacity: 0.2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <i className="fa fa-desktop" />
              </div>
            )}
          </div>

          {/* Info */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Category badge */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span
                style={{
                  background: "var(--primary-bg)",
                  color: "var(--primary-dark)",
                  padding: "4px 12px",
                  borderRadius: "var(--radius-full)",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {product.category?.parent?.name}
              </span>
              <span
                style={{
                  background: "var(--bg-section)",
                  color: "var(--text-secondary)",
                  padding: "4px 12px",
                  borderRadius: "var(--radius-full)",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {product.category?.name}
              </span>
            </div>

            <h1
              style={{
                fontSize: "clamp(18px, 3vw, 26px)",
                fontWeight: 900,
                color: "var(--text-primary)",
                lineHeight: 1.3,
                letterSpacing: "-0.3px",
              }}
            >
              {product.name}
            </h1>

            {/* Price */}
            <div
              style={{
                background: "var(--accent-bg)",
                borderRadius: "var(--radius-md)",
                padding: "16px 20px",
                border: "1px solid rgba(249,115,22,0.2)",
              }}
            >
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 900,
                  color: "var(--accent)",
                  letterSpacing: "-1px",
                  lineHeight: 1,
                }}
              >
                {formatPrice(product.price)}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginTop: 6,
                }}
              >
                Giá đã bao gồm VAT
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <div
                style={{
                  background: "var(--bg-card)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                  padding: "16px",
                }}
              >
                <h3
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--text-secondary)",
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Mô tả sản phẩm
                </h3>
                <p
                  style={{
                    fontSize: 14,
                    color: "var(--text-secondary)",
                    lineHeight: 1.7,
                    whiteSpace: "pre-line",
                  }}
                >
                  {product.description}
                </p>
              </div>
            )}

            {/* Quantity */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                }}
              >
                Số lượng:
              </span>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  border: "1.5px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  overflow: "hidden",
                }}
              >
                <QtyBtn
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                >
                  −
                </QtyBtn>
                <span
                  style={{
                    width: 48,
                    textAlign: "center",
                    fontWeight: 700,
                    fontSize: 15,
                    color: "var(--text-primary)",
                  }}
                >
                  {qty}
                </span>
                <QtyBtn
                  onClick={() => setQty((q) => Math.min(999, q + 1))}
                  disabled={qty >= 999}
                >
                  +
                </QtyBtn>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 12 }}>
              <Button
                id="add-to-cart-detail-btn"
                variant="accent"
                size="lg"
                fullWidth
                loading={adding}
                onClick={handleAddToCart}
                icon={<i className={`fa ${added ? "fa-check" : "fa-shopping-cart"}`} />}
              >
                {added ? "Đã thêm!" : "Thêm vào giỏ"}
              </Button>
            </div>

            {added && (
              <div
                style={{
                  background: "var(--success-bg)",
                  color: "#15803d",
                  padding: "12px 16px",
                  borderRadius: "var(--radius-md)",
                  fontSize: 14,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  animation: "fadeIn 0.3s ease",
                }}
              >
                <span><i className="fa fa-check-circle" style={{ marginRight: 6 }} /> Đã thêm vào giỏ hàng!</span>
                <Link
                  href="/client/cart"
                  style={{ color: "#15803d", fontWeight: 700, textDecoration: "underline" }}
                >
                  Xem giỏ <i className="fa fa-arrow-right" style={{ marginLeft: 2 }} />
                </Link>
              </div>
            )}

            {/* Trust badges */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              {[
                { icon: "fa-check-circle", text: "Hàng chính hãng 100%" },
                { icon: "fa-refresh", text: "Đổi trả 7 ngày" },
                { icon: "fa-shield", text: "Bảo hành chính hãng" },
                { icon: "fa-truck", text: "Giao hàng toàn quốc" },
              ].map((item) => (
                <div
                  key={item.text}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 12px",
                    background: "var(--bg-section)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    fontWeight: 600,
                  }}
                >
                  <i className={`fa ${item.icon}`} style={{ width: 16, textAlign: "center", color: "var(--primary)" }} />
                  {item.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .product-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function QtyBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 36,
        height: 36,
        background: disabled ? "var(--bg-section)" : "var(--bg-card)",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 18,
        color: disabled ? "var(--text-disabled)" : "var(--text-primary)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background var(--transition)",
        fontFamily: "var(--font-sans)",
      }}
      onMouseEnter={(e) => {
        if (!disabled)
          (e.currentTarget as HTMLButtonElement).style.background =
            "var(--primary-bg)";
      }}
      onMouseLeave={(e) => {
        if (!disabled)
          (e.currentTarget as HTMLButtonElement).style.background =
            "var(--bg-card)";
      }}
    >
      {children}
    </button>
  );
}
