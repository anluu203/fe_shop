"use client";
import { imageSrc } from "../../../../lib/utils/image";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { adminOrderApi } from "../../../../lib/api/admin-orders";
import type { Order, OrderStatus } from "../../../../lib/types";
import { ORDER_STATUS_LABEL, ORDER_STATUS_FLOW } from "../../../../lib/types";
import { formatPrice, formatDate, shortId } from "../../../../lib/utils/format";
import { PageSpinner } from "../../../../components/ui/Spinner";
import Badge from "../../../../components/ui/Badge";
import Button from "../../../../components/ui/Button";

const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  AddingItem: "Processing",
  Processing: "Preparing",
  Preparing: "Shipping",
  Shipping: "Done",
  Done: null,
};

function getStatusVariant(status: string) {
  const map: Record<string, "info" | "warning" | "primary" | "success" | "neutral"> = {
    Processing: "info",
    Preparing: "warning",
    Shipping: "primary",
    Done: "success",
  };
  return map[status] ?? "neutral";
}

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    adminOrderApi
      .getAll({ pageSize: 100 })
      .then((page) => {
        const found = page.items.find((o) => o.id === id);
        if (found) setOrder(found);
        else router.push("/admin/orders");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleAdvanceStatus = async () => {
    if (!order) return;
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    setUpdating(true);
    setError("");
    try {
      const updated = await adminOrderApi.updateStatus(order.id!, { status: next });
      setOrder(updated);
    } catch (err: any) {
      setError(err.message ?? "Cập nhật thất bại");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <PageSpinner />;
  if (!order) return null;

  const nextStatus = NEXT_STATUS[order.status];
  const statusIndex = ORDER_STATUS_FLOW.indexOf(order.status);

  return (
    <div>
      {/* Breadcrumb */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 20,
          fontSize: "calc(13px * var(--font-scale))",
          color: "var(--text-muted)",
        }}
      >
        <Link href="/admin/orders" style={{ color: "var(--primary)", textDecoration: "none" }}>
          Đơn hàng
        </Link>
        <span>›</span>
        <span style={{ color: "var(--text-secondary)" }}>
          {shortId(order.id!)}
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* Main */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Status tracker */}
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
                padding: "14px 20px",
                borderBottom: "1px solid var(--border)",
                background: "var(--bg-section)",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <h2 style={{ fontSize: "calc(14px * var(--font-scale))", fontWeight: 800, color: "var(--text-secondary)" }}>
                <i className="fa fa-truck" style={{ marginRight: 6 }} /> Trạng thái
              </h2>
              <Badge variant={getStatusVariant(order.status)} dot>
                {ORDER_STATUS_LABEL[order.status]}
              </Badge>
            </div>
            <div style={{ padding: "24px" }}>
              {/* Progress bar */}
              <div
                style={{ display: "flex", alignItems: "center", marginBottom: 24 }}
              >
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
                              width: 40,
                              height: 40,
                              borderRadius: "50%",
                              background: isActive ? "var(--primary)" : "var(--bg-section)",
                              border: `2px solid ${isActive ? "var(--primary)" : "var(--border)"}`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "calc(14px * var(--font-scale))",
                              color: isActive ? "#fff" : "var(--text-muted)",
                              fontWeight: 700,
                              boxShadow: isCurrent ? "0 0 0 4px var(--primary-bg)" : "none",
                            }}
                          >
                            {isActive ? <i className="fa fa-check" /> : i + 1}
                          </div>
                          <span
                            style={{
                              fontSize: "calc(11px * var(--font-scale))",
                              fontWeight: isCurrent ? 700 : 500,
                              color: isCurrent ? "var(--primary)" : "var(--text-muted)",
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
                              height: 3,
                              background: sIdx < statusIndex ? "var(--primary)" : "var(--border)",
                              margin: "0 8px",
                              marginBottom: 22,
                              borderRadius: "var(--radius-full)",
                            }}
                          />
                        )}
                      </div>
                    );
                  }
                )}
              </div>

              {/* Error */}
              {error && (
                <div
                  style={{
                    background: "var(--danger-bg)",
                    color: "var(--danger)",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-md)",
                    fontSize: "calc(13px * var(--font-scale))",
                    fontWeight: 600,
                    marginBottom: 14,
                  }}
                >
                  <i className="fa fa-exclamation-triangle" style={{ marginRight: 4 }} /> {error}
                </div>
              )}

              {/* Advance button */}
              {nextStatus ? (
                <Button
                  id="advance-status-btn"
                  variant="primary"
                  loading={updating}
                  onClick={handleAdvanceStatus}
                  icon={<i className="fa fa-bolt" />}
                >
                  Chuyển sang:{" "}
                  {ORDER_STATUS_LABEL[nextStatus]}
                </Button>
              ) : (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 18px",
                    background: "var(--success-bg)",
                    color: "#15803d",
                    borderRadius: "var(--radius-md)",
                    fontSize: "calc(14px * var(--font-scale))",
                    fontWeight: 700,
                  }}
                >
                  <i className="fa fa-check-circle" /> Đơn hàng đã hoàn thành
                </div>
              )}
            </div>
          </div>

          {/* Customer info */}
          {order.user && (
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
                  padding: "14px 20px",
                  borderBottom: "1px solid var(--border)",
                  background: "var(--bg-section)",
                }}
              >
                <h2 style={{ fontSize: "calc(14px * var(--font-scale))", fontWeight: 800, color: "var(--text-secondary)" }}>
                  <i className="fa fa-user" style={{ marginRight: 6 }} /> Thông tin khách hàng
                </h2>
              </div>
              <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { label: "Tên", value: order.user.username },
                  { label: "Email", value: order.user.email },
                  { label: "Vai trò", value: order.user.role },
                  { label: "Ngày tham gia", value: formatDate(order.user.createdAt) },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "calc(13px * var(--font-scale))",
                      paddingBottom: 10,
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <span style={{ color: "var(--text-muted)" }}>{item.label}</span>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Items */}
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
                padding: "14px 20px",
                borderBottom: "1px solid var(--border)",
                background: "var(--bg-section)",
              }}
            >
              <h2 style={{ fontSize: "calc(14px * var(--font-scale))", fontWeight: 800, color: "var(--text-secondary)" }}>
                <i className="fa fa-cube" style={{ marginRight: 6 }} /> Sách ({order.items.length})
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
                    padding: "14px 20px",
                    borderBottom: i < order.items.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
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
                        src={imageSrc(item.product.imageUrl)}
                        alt={item.product.name}
                        style={{ width: "100%", height: "100%", objectFit: "contain", padding: 4 }}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: "calc(22px * var(--font-scale))", opacity: 0.3 }}><i className="fa fa-book" /></span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "calc(13px * var(--font-scale))", fontWeight: 600, color: "var(--text-primary)" }}>
                      {item.product?.name}
                    </div>
                    <div style={{ fontSize: "calc(12px * var(--font-scale))", color: "var(--text-muted)", marginTop: 2 }}>
                      {formatPrice(item.unitPrice)} × {item.quantity}
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, color: "var(--accent)", fontSize: "calc(14px * var(--font-scale))" }}>
                    {formatPrice(String(parseInt(item.unitPrice) * item.quantity))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar summary */}
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
              padding: "14px 20px",
              borderBottom: "1px solid var(--border)",
              background: "var(--primary-bg)",
            }}
          >
            <h2 style={{ fontSize: "calc(14px * var(--font-scale))", fontWeight: 800, color: "var(--primary-dark)" }}>
              <i className="fa fa-money" style={{ marginRight: 6 }} /> Tóm tắt
            </h2>
          </div>
          <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: "Mã đơn", value: shortId(order.id!) },
              { label: "Số sách", value: `${order.items.reduce((s, i) => s + i.quantity, 0)}` },
              { label: "Ngày đặt", value: order.createdAt ? formatDate(order.createdAt) : "—" },
            ].map((row) => (
              <div
                key={row.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "calc(13px * var(--font-scale))",
                  paddingBottom: 10,
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span style={{ color: "var(--text-muted)" }}>{row.label}</span>
                <span style={{ fontWeight: 600 }}>{row.value}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 800, fontSize: "calc(15px * var(--font-scale))" }}>Tổng cộng</span>
              <span style={{ fontWeight: 900, fontSize: "calc(22px * var(--font-scale))", color: "var(--accent)" }}>
                {formatPrice(order.totalPrice)}
              </span>
            </div>
            <Link
              href="/admin/orders"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                marginTop: 8,
                padding: "10px",
                background: "var(--bg-section)",
                borderRadius: "var(--radius-md)",
                fontSize: "calc(13px * var(--font-scale))",
                fontWeight: 600,
                color: "var(--text-secondary)",
                textDecoration: "none",
              }}
            >
              <i className="fa fa-arrow-left" style={{ marginRight: 4 }} /> Quay lại danh sách
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
