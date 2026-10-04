"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../contexts/AuthContext";
import { useCart } from "../../../contexts/CartContext";
import { formatPrice } from "../../../lib/utils/format";
import { PageSpinner } from "../../../components/ui/Spinner";
import Button from "../../../components/ui/Button";
import type { OrderItem } from "../../../lib/types";

export default function CartPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { cart, isLoading, refreshCart, updateItem, removeItem, clearCart, checkout } = useCart();
  const router = useRouter();
  const [checkingOut, setCheckingOut] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/client/auth/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) refreshCart();
  }, [user]);

  if (authLoading || (!user && !authLoading)) return <PageSpinner />;

  const handleCheckout = async () => {
    if (!cart?.items.length) return;
    setCheckingOut(true);
    try {
      const order = await checkout();
      router.push(`/client/orders/${order.id}`);
    } catch (err: any) {
      alert(err.message ?? "Checkout thất bại");
    } finally {
      setCheckingOut(false);
    }
  };

  const isEmpty = !cart || !cart.items || cart.items.length === 0;

  return (
    <div style={{ background: "var(--bg-page)", minHeight: "100vh" }}>
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)",
          padding: "24px 0",
        }}
      >
        <div className="container">
          <h1
            style={{
              fontSize: 24,
              fontWeight: 900,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <i className="fa fa-shopping-cart" style={{ marginRight: 4 }} /> Giỏ hàng của bạn
          </h1>
        </div>
      </div>

      <div className="container" style={{ padding: "28px 32px" }}>
        {isEmpty ? (
          <div
            style={{
              textAlign: "center",
              padding: "80px 0",
              background: "var(--bg-card)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ fontSize: 64, marginBottom: 20, color: "var(--text-muted)" }}>
              <i className="fa fa-shopping-cart" />
            </div>
            <h2
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "var(--text-primary)",
                marginBottom: 10,
              }}
            >
              Giỏ hàng đang trống
            </h2>
            <p
              style={{
                fontSize: 14,
                color: "var(--text-muted)",
                marginBottom: 28,
              }}
            >
              Hãy khám phá các sản phẩm linh kiện tuyệt vời của chúng tôi!
            </p>
            <Link
              href="/client/products"
              id="cart-shop-now"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "var(--primary)",
                color: "#fff",
                padding: "13px 28px",
                borderRadius: "var(--radius-full)",
                fontWeight: 700,
                fontSize: 15,
                textDecoration: "none",
              }}
            >
              <i className="fa fa-shopping-bag" style={{ marginRight: 4 }} /> Mua sắm ngay
            </Link>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 340px",
              gap: 24,
              alignItems: "start",
            }}
          >
            {/* Cart items */}
            <div>
              {/* Header row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 120px 130px 40px",
                  gap: 16,
                  padding: "12px 20px",
                  background: "var(--bg-section)",
                  borderRadius: "var(--radius-md)",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: 12,
                }}
              >
                <span>Sản phẩm</span>
                <span style={{ textAlign: "center" }}>Số lượng</span>
                <span style={{ textAlign: "right" }}>Thành tiền</span>
                <span />
              </div>

              {/* Items */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {cart.items.map((item: OrderItem) => (
                  <CartItemRow
                    key={item.id}
                    item={item}
                    onUpdate={(q) => updateItem(item.id, q)}
                    onRemove={() => removeItem(item.id)}
                    loading={isLoading}
                  />
                ))}
              </div>

              {/* Clear cart */}
              <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
                {clearConfirm ? (
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                      Xóa toàn bộ?
                    </span>
                    <button
                      id="confirm-clear-cart"
                      onClick={async () => {
                        await clearCart();
                        setClearConfirm(false);
                      }}
                      style={{
                        padding: "6px 14px",
                        background: "var(--danger)",
                        color: "#fff",
                        border: "none",
                        borderRadius: "var(--radius-sm)",
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: "pointer",
                        fontFamily: "var(--font-sans)",
                      }}
                    >
                      Xóa
                    </button>
                    <button
                      onClick={() => setClearConfirm(false)}
                      style={{
                        padding: "6px 14px",
                        background: "var(--bg-section)",
                        color: "var(--text-secondary)",
                        border: "none",
                        borderRadius: "var(--radius-sm)",
                        fontSize: 13,
                        cursor: "pointer",
                        fontFamily: "var(--font-sans)",
                      }}
                    >
                      Hủy
                    </button>
                  </div>
                ) : (
                  <button
                    id="clear-cart-btn"
                    onClick={() => setClearConfirm(true)}
                    style={{
                      fontSize: 13,
                      color: "var(--danger)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontFamily: "var(--font-sans)",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <i className="fa fa-trash" style={{ marginRight: 4 }} /> Xóa tất cả
                  </button>
                )}
              </div>
            </div>

            {/* Order summary */}
            <div
              style={{
                background: "var(--bg-card)",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--border)",
                overflow: "hidden",
                position: "sticky",
                top: "calc(var(--header-height) + 16px)",
              }}
            >
              <div
                style={{
                  padding: "16px 20px",
                  background: "var(--primary-bg)",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <h2
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: "var(--primary-dark)",
                  }}
                >
                  <i className="fa fa-list-alt" style={{ marginRight: 6 }} /> Thông tin đơn hàng
                </h2>
              </div>
              <div style={{ padding: "20px" }}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 14,
                      color: "var(--text-secondary)",
                    }}
                  >
                    <span>Tạm tính ({cart.items.reduce((s, i) => s + i.quantity, 0)} sản phẩm)</span>
                    <span style={{ fontWeight: 600 }}>
                      {formatPrice(cart.totalPrice)}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 14,
                      color: "var(--text-secondary)",
                    }}
                  >
                    <span>Phí vận chuyển</span>
                    <span style={{ color: "var(--success)", fontWeight: 600 }}>
                      Miễn phí
                    </span>
                  </div>
                  <div
                    style={{
                      height: 1,
                      background: "var(--border)",
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ fontWeight: 800, fontSize: 15 }}>
                      Tổng cộng
                    </span>
                    <span
                      style={{
                        fontWeight: 900,
                        fontSize: 22,
                        color: "var(--accent)",
                        letterSpacing: "-0.5px",
                      }}
                    >
                      {formatPrice(cart.totalPrice)}
                    </span>
                  </div>
                </div>

                <Button
                  id="checkout-btn"
                  variant="accent"
                  size="lg"
                  fullWidth
                  loading={checkingOut}
                  onClick={handleCheckout}
                  icon={<i className="fa fa-bolt" />}
                >
                  Đặt hàng ngay
                </Button>

                <Link
                  href="/client/products"
                  style={{
                    display: "block",
                    textAlign: "center",
                    marginTop: 12,
                    fontSize: 13,
                    color: "var(--primary)",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  <i className="fa fa-arrow-left" style={{ marginRight: 4 }} /> Tiếp tục mua sắm
                </Link>

                {/* Trust */}
                <div
                  style={{
                    marginTop: 20,
                    paddingTop: 16,
                    borderTop: "1px solid var(--border)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {[
                    { icon: "fa-lock", text: "Thanh toán an toàn" },
                    { icon: "fa-check-circle", text: "Hàng chính hãng" },
                    { icon: "fa-truck", text: "Giao hàng nhanh" },
                  ].map((item) => (
                    <div
                      key={item.text}
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <i className={`fa ${item.icon}`} style={{ width: 14, textAlign: "center" }} />
                      {item.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CartItemRow({
  item,
  onUpdate,
  onRemove,
  loading,
}: {
  item: OrderItem;
  onUpdate: (qty: number) => Promise<void>;
  onRemove: () => Promise<void>;
  loading: boolean;
}) {
  const [qty, setQty] = useState(item.quantity);
  const [updating, setUpdating] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleQtyChange = async (newQty: number) => {
    if (newQty < 1 || newQty > 999) return;
    setQty(newQty);
    setUpdating(true);
    try {
      await onUpdate(newQty);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 120px 130px 40px",
        gap: 16,
        alignItems: "center",
        background: "var(--bg-card)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)",
        padding: "14px 20px",
        transition: "border-color var(--transition)",
      }}
    >
      {/* Product info */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 64,
            height: 64,
            background: "var(--bg-section)",
            borderRadius: "var(--radius-sm)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {item.product?.imageUrl && !imgError ? (
            <img
              src={item.product.imageUrl}
              alt={item.product.name}
              onError={() => setImgError(true)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                padding: 4,
              }}
            />
          ) : (
            <span style={{ fontSize: 24, opacity: 0.3 }}><i className="fa fa-desktop" /></span>
          )}
        </div>
        <div>
          <Link
            href={`/client/products/${item.productId}`}
            className="line-clamp-2"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
              textDecoration: "none",
              lineHeight: 1.4,
            }}
          >
            {item.product?.name}
          </Link>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            Đơn giá: {formatPrice(item.unitPrice)}
          </div>
        </div>
      </div>

      {/* Qty control */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1.5px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          overflow: "hidden",
        }}
      >
        <button
          onClick={() => handleQtyChange(qty - 1)}
          disabled={qty <= 1 || updating || loading}
          style={{
            width: 28,
            height: 30,
            background: "var(--bg-section)",
            border: "none",
            cursor: qty > 1 ? "pointer" : "not-allowed",
            fontSize: 16,
            color: "var(--text-secondary)",
            fontFamily: "var(--font-sans)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          −
        </button>
        <span
          style={{
            width: 36,
            textAlign: "center",
            fontWeight: 700,
            fontSize: 14,
            color: "var(--text-primary)",
          }}
        >
          {updating ? "..." : qty}
        </span>
        <button
          onClick={() => handleQtyChange(qty + 1)}
          disabled={qty >= 999 || updating || loading}
          style={{
            width: 28,
            height: 30,
            background: "var(--bg-section)",
            border: "none",
            cursor: qty < 999 ? "pointer" : "not-allowed",
            fontSize: 16,
            color: "var(--text-secondary)",
            fontFamily: "var(--font-sans)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          +
        </button>
      </div>

      {/* Subtotal */}
      <div
        style={{
          textAlign: "right",
          fontWeight: 800,
          fontSize: 14,
          color: "var(--accent)",
        }}
      >
        {formatPrice(
          String(parseInt(item.unitPrice) * qty)
        )}
      </div>

      {/* Remove */}
      <button
        id={`remove-item-${item.id}`}
        onClick={onRemove}
        disabled={loading}
        aria-label="Xóa sản phẩm"
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: "var(--danger-bg)",
          border: "none",
          color: "var(--danger)",
          cursor: "pointer",
          fontSize: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all var(--transition)",
          fontFamily: "var(--font-sans)",
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.background =
            "var(--danger)")
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.background =
            "var(--danger-bg)")
        }
      >
        <i className="fa fa-trash" />
      </button>
    </div>
  );
}
