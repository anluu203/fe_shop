"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../../contexts/AuthContext";
import { orderApi } from "../../../../lib/api/orders";
import type { Order } from "../../../../lib/types";
import { ORDER_STATUS_LABEL, ORDER_STATUS_FLOW } from "../../../../lib/types";
import { formatPrice, formatDate, shortId } from "../../../../lib/utils/format";
import { PageSpinner } from "../../../../components/ui/Spinner";
import Badge from "../../../../components/ui/Badge";

function getStatusVariant(status: string) {
  const map: Record<string, "info" | "warning" | "primary" | "success" | "neutral"> = {
    Processing: "info",
    Preparing: "warning",
    Shipping: "primary",
    Done: "success",
  };
  return map[status] ?? "neutral";
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.push("/client/auth/login");
  }, [user, authLoading]);

  useEffect(() => {
    if (!id || !user) return;
    orderApi
      .getOne(id)
      .then(setOrder)
      .catch(() => router.push("/client/orders"))
      .finally(() => setLoading(false));
  }, [id, user]);

  if (authLoading || loading) return <PageSpinner />;
  if (!order) return null;

  const statusIndex = ORDER_STATUS_FLOW.indexOf(order.status);

  return (
    <div style={{ background: "var(--bg-page)", minHeight: "100vh" }}>
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)",
          padding: "28px 0",
        }}
      >
        <div className="container">
          <Link
            href="/client/orders"
            style={{
              color: "rgba(255,255,255,0.75)",
              fontSize: 13,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              marginBottom: 10,
            }}
          >
            <i className="fa fa-arrow-left" /> Lịch sử đơn hàng
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>
              Đơn hàng {shortId(order.id!)}
            </h1>
            <Badge variant={getStatusVariant(order.status)} dot>
              {ORDER_STATUS_LABEL[order.status]}
            </Badge>
          </div>
          {order.createdAt && (
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 6 }}>
              Đặt lúc: {formatDate(order.createdAt)}
            </p>
          )}
        </div>
      </div>

      <div className="container" style={{ padding: "28px 32px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 320px",
            gap: 24,
            alignItems: "start",
          }}
        >
          {/* Items */}
          <div>
            {/* Status tracker */}
            <div
              style={{
                background: "var(--bg-card)",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--border)",
                padding: "24px",
                marginBottom: 16,
              }}
            >
              <h2
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: "var(--text-secondary)",
                  marginBottom: 20,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                <i className="fa fa-truck" style={{ marginRight: 6 }} /> Trạng thái đơn hàng
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                {(["Processing", "Preparing", "Shipping", "Done"] as const).map(
                  (status, i, arr) => {
                    const sIdx = ORDER_STATUS_FLOW.indexOf(status);
                    const isActive = sIdx <= statusIndex;
                    const isCurrent = status === order.status;
                    return (
                      <div
                        key={status}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          flex: i < arr.length - 1 ? 1 : undefined,
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: "50%",
                              background: isActive ? "var(--primary)" : "var(--bg-section)",
                              border: `2px solid ${isActive ? "var(--primary)" : "var(--border)"}`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 14,
                              color: isActive ? "#fff" : "var(--text-muted)",
                              fontWeight: 700,
                              boxShadow: isCurrent ? "0 0 0 4px var(--primary-bg)" : "none",
                              transition: "all 0.3s",
                            }}
                          >
                            {isActive ? <i className="fa fa-check" /> : i + 1}
                          </div>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: isCurrent ? 700 : 500,
                              color: isCurrent ? "var(--primary)" : "var(--text-muted)",
                              textAlign: "center",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {ORDER_STATUS_LABEL[status]}
                          </span>
                        </div>
                        {i < arr.length - 1 && (
                          <div
                            style={{
                              flex: 1,
                              height: 2,
                              background: sIdx < statusIndex ? "var(--primary)" : "var(--border)",
                              margin: "0 6px",
                              marginBottom: 22,
                              transition: "background 0.3s",
                            }}
                          />
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            </div>

            {/* Product list */}
            <div
              style={{
                background: "var(--bg-card)",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--border)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid var(--border)",
                  background: "var(--bg-section)",
                }}
              >
                <h2 style={{ fontSize: 14, fontWeight: 800, color: "var(--text-secondary)" }}>
                  <i className="fa fa-cube" style={{ marginRight: 6 }} /> Sản phẩm ({order.items.length})
                </h2>
              </div>
              <div>
                {order.items.map((item, i) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "16px 20px",
                      borderBottom:
                        i < order.items.length - 1
                          ? "1px solid var(--border)"
                          : "none",
                    }}
                  >
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
                      {item.product?.imageUrl ? (
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                            padding: 4,
                          }}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <i className="fa fa-desktop" style={{ fontSize: 24, opacity: 0.3, color: "var(--text-muted)" }} />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        className="line-clamp-2"
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}
                      >
                        {item.product?.name}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                        Đơn giá: {formatPrice(item.unitPrice)} × {item.quantity}
                      </div>
                    </div>
                    <div
                      style={{
                        fontWeight: 800,
                        color: "var(--accent)",
                        fontSize: 15,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatPrice(String(parseInt(item.unitPrice) * item.quantity))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div>
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
                  borderBottom: "1px solid var(--border)",
                  background: "var(--primary-bg)",
                }}
              >
                <h2 style={{ fontSize: 14, fontWeight: 800, color: "var(--primary-dark)" }}>
                  <i className="fa fa-money" style={{ marginRight: 6 }} /> Tóm tắt đơn hàng
                </h2>
              </div>
              <div style={{ padding: "20px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
                  <SummaryRow label="Mã đơn" value={shortId(order.id!)} />
                  <SummaryRow label="Trạng thái">
                    <Badge variant={getStatusVariant(order.status)} dot>
                      {ORDER_STATUS_LABEL[order.status]}
                    </Badge>
                  </SummaryRow>
                  <SummaryRow
                    label="Số sản phẩm"
                    value={`${order.items.reduce((s, i) => s + i.quantity, 0)} sản phẩm`}
                  />
                  {order.createdAt && (
                    <SummaryRow label="Ngày đặt" value={formatDate(order.createdAt)} />
                  )}
                  <div style={{ height: 1, background: "var(--border)" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 800, fontSize: 15 }}>Tổng cộng</span>
                    <span
                      style={{
                        fontWeight: 900,
                        fontSize: 22,
                        color: "var(--accent)",
                        letterSpacing: "-0.5px",
                      }}
                    >
                      {formatPrice(order.totalPrice)}
                    </span>
                  </div>
                </div>
                <Link
                  href="/client/products"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    background: "var(--primary)",
                    color: "#fff",
                    padding: "11px",
                    borderRadius: "var(--radius-md)",
                    fontWeight: 700,
                    fontSize: 14,
                    textDecoration: "none",
                    marginTop: 8,
                  }}
                >
                  <i className="fa fa-shopping-bag" /> Tiếp tục mua sắm
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{label}</span>
      {children ?? (
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
          {value}
        </span>
      )}
    </div>
  );
}
