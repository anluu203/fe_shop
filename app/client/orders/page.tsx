"use client";
import { imageSrc } from "../../../lib/utils/image";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../contexts/AuthContext";
import { subscribeMockData, USE_MOCK } from "../../../lib/mock/config";
import { orderApi } from "../../../lib/api/orders";
import type { Order } from "../../../lib/types";
import { ORDER_STATUS_LABEL } from "../../../lib/types";
import { formatPrice, formatDate, shortId } from "../../../lib/utils/format";
import { PageSpinner } from "../../../components/ui/Spinner";
import Badge from "../../../components/ui/Badge";

function getStatusVariant(status: string) {
  const map: Record<string, "info" | "warning" | "primary" | "success" | "neutral"> = {
    Processing: "info",
    Preparing: "warning",
    Shipping: "primary",
    Done: "success",
  };
  return map[status] ?? "neutral";
}

export default function OrdersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.push("/client/auth/login");
  }, [user, authLoading]);

  useEffect(() => {
    if (user) {
      const loadOrders = () => orderApi
        .getHistory()
        .then(setOrders)
        .catch(() => setOrders([]))
        .finally(() => setLoading(false));
      void loadOrders();
      return USE_MOCK ? subscribeMockData(() => { void loadOrders(); }) : undefined;
    }
  }, [user]);

  if (authLoading || loading) return <PageSpinner />;

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
          <h1
            style={{
              fontSize: "calc(24px * var(--font-scale))",
              fontWeight: 900,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <i className="fa fa-archive" style={{ marginRight: 4 }} /> Đơn hàng của tôi
          </h1>
          <p style={{ color: "rgba(255,255,255,0.75)", marginTop: 6, fontSize: "calc(14px * var(--font-scale))" }}>
            {orders.length} đơn hàng
          </p>
        </div>
      </div>

      <div className="container" style={{ padding: "28px 32px" }}>
        {orders.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "80px 0",
              background: "var(--bg-card)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ fontSize: "calc(64px * var(--font-scale))", marginBottom: 20, color: "var(--text-muted)" }}>
              <i className="fa fa-archive" />
            </div>
            <h2
              style={{
                fontSize: "calc(20px * var(--font-scale))",
                fontWeight: 800,
                color: "var(--text-primary)",
                marginBottom: 10,
              }}
            >
              Chưa có đơn hàng nào
            </h2>
            <p style={{ color: "var(--text-muted)", marginBottom: 28, fontSize: "calc(14px * var(--font-scale))" }}>
              Đặt hàng ngay để trải nghiệm dịch vụ của BookStore!
            </p>
            <Link
              href="/client/products"
              id="orders-shop-now"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "var(--primary)",
                color: "#fff",
                padding: "12px 28px",
                borderRadius: "var(--radius-full)",
                fontWeight: 700,
                fontSize: "calc(14px * var(--font-scale))",
                textDecoration: "none",
              }}
            >
              <i className="fa fa-shopping-bag" style={{ marginRight: 4 }} /> Mua sắm ngay
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {orders.map((order) => (
              <div
                key={order.id!}
                style={{
                  background: "var(--bg-card)",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--border)",
                  overflow: "hidden",
                  transition: "box-shadow var(--transition)",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.boxShadow =
                    "var(--shadow-md)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.boxShadow = "none")
                }
              >
                {/* Order header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 20px",
                    borderBottom: "1px solid var(--border)",
                    background: "var(--bg-section)",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span
                      style={{
                        fontSize: "calc(13px * var(--font-scale))",
                        fontWeight: 800,
                        color: "var(--text-primary)",
                      }}
                    >
                      {shortId(order.id!)}
                    </span>
                    <Badge variant={getStatusVariant(order.status)} dot>
                      {ORDER_STATUS_LABEL[order.status]}
                    </Badge>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <span style={{ fontSize: "calc(12px * var(--font-scale))", color: "var(--text-muted)" }}>
                      {order.createdAt ? formatDate(order.createdAt) : ""}
                    </span>
                    <span
                      style={{
                        fontSize: "calc(16px * var(--font-scale))",
                        fontWeight: 900,
                        color: "var(--accent)",
                      }}
                    >
                      {formatPrice(order.totalPrice)}
                    </span>
                  </div>
                </div>

                {/* Items preview */}
                <div style={{ padding: "14px 20px" }}>
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    {order.items.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            background: "var(--bg-section)",
                            borderRadius: "var(--radius-sm)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden",
                            flexShrink: 0,
                          }}
                        >
                          {item.product?.imageUrl ? (
                            <img
                              src={imageSrc(item.product.imageUrl)}
                              alt={item.product.name}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "contain",
                                padding: 4,
                              }}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display =
                                  "none";
                              }}
                            />
                          ) : (
                            <span style={{ fontSize: "calc(20px * var(--font-scale))", opacity: 0.3 }}><i className="fa fa-book" /></span>
                          )}
                        </div>
                        <div>
                          <div
                            className="line-clamp-1"
                            style={{
                              fontSize: "calc(12px * var(--font-scale))",
                              fontWeight: 600,
                              color: "var(--text-primary)",
                              maxWidth: 160,
                            }}
                          >
                            {item.product?.name}
                          </div>
                          <div
                            style={{
                              fontSize: "calc(11px * var(--font-scale))",
                              color: "var(--text-muted)",
                            }}
                          >
                            x{item.quantity}
                          </div>
                        </div>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <span
                        style={{
                          fontSize: "calc(12px * var(--font-scale))",
                          color: "var(--text-muted)",
                          fontWeight: 600,
                        }}
                      >
                        +{order.items.length - 3} sách khác
                      </span>
                    )}
                    <Link
                      href={`/client/orders/${order.id}`}
                      id={`order-detail-${order.id}`}
                      style={{
                        marginLeft: "auto",
                        fontSize: "calc(13px * var(--font-scale))",
                        fontWeight: 700,
                        color: "var(--primary)",
                        textDecoration: "none",
                        padding: "6px 14px",
                        border: "1.5px solid var(--primary)",
                        borderRadius: "var(--radius-sm)",
                        transition: "all var(--transition)",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLAnchorElement).style.background =
                          "var(--primary)";
                        (e.currentTarget as HTMLAnchorElement).style.color = "#fff";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLAnchorElement).style.background =
                          "transparent";
                        (e.currentTarget as HTMLAnchorElement).style.color =
                          "var(--primary)";
                      }}
                    >
                      Xem chi tiết <i className="fa fa-arrow-right" style={{ marginLeft: 4 }} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
