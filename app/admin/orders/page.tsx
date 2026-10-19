"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { subscribeMockData, USE_MOCK } from "../../../lib/mock/config";
import Link from "next/link";
import { adminOrderApi } from "../../../lib/api/admin-orders";
import type { Order, OrderStatus, Page } from "../../../lib/types";
import { ORDER_STATUS_LABEL } from "../../../lib/types";
import { formatPrice, formatDate, shortId } from "../../../lib/utils/format";
import { PageSpinner } from "../../../components/ui/Spinner";
import Badge from "../../../components/ui/Badge";
import Pagination from "../../../components/ui/Pagination";

const STATUS_OPTIONS: { value: Exclude<OrderStatus, "AddingItem"> | ""; label: string }[] = [
  { value: "", label: "Tất cả đơn" },
  { value: "Processing", label: "Đang xử lý" },
  { value: "Preparing", label: "Đang đóng gói" },
  { value: "Shipping", label: "Đang giao" },
  { value: "Done", label: "Hoàn thành" },
];

function getStatusVariant(status: string) {
  const map: Record<string, "info" | "warning" | "primary" | "success" | "neutral"> = {
    Processing: "info",
    Preparing: "warning",
    Shipping: "primary",
    Done: "success",
  };
  return map[status] ?? "neutral";
}

function AdminOrdersContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const statusParam = (searchParams.get("status") ?? "") as Exclude<OrderStatus, "AddingItem"> | "";
  const pageParam = parseInt(searchParams.get("page") ?? "1", 10);

  const [data, setData] = useState<Page<Order> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    adminOrderApi
      .getAll({
        status: statusParam || undefined,
        page: pageParam,
        pageSize: 20,
      })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [statusParam, pageParam]);

  useEffect(() => {
    load();
    return USE_MOCK ? subscribeMockData(load) : undefined;
  }, [load]);

  const setStatus = (s: string) => {
    const params = new URLSearchParams();
    if (s) params.set("status", s);
    router.push(`/admin/orders?${params.toString()}`);
  };

  const setPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`/admin/orders?${params.toString()}`);
  };

  return (
    <div>
      {/* Filter tabs */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            id={`filter-${opt.value || "all"}`}
            onClick={() => setStatus(opt.value)}
            style={{
              padding: "8px 18px",
              borderRadius: "var(--radius-full)",
              border: "1.5px solid",
              borderColor: statusParam === opt.value ? "var(--primary)" : "var(--border)",
              background: statusParam === opt.value ? "var(--primary)" : "var(--bg-card)",
              color: statusParam === opt.value ? "#fff" : "var(--text-secondary)",
              fontWeight: statusParam === opt.value ? 700 : 500,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
              transition: "all var(--transition)",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="admin-orders-table"
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
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text-secondary)" }}>
            <i className="fa fa-archive" style={{ marginRight: 6 }} /> Danh sách đơn hàng
            {data && (
              <span style={{ fontWeight: 400, color: "var(--text-muted)", marginLeft: 8 }}>
                ({data.totalCount} đơn)
              </span>
            )}
          </span>
          <button
            onClick={load}
            style={{
              fontSize: 12,
              color: "var(--primary)",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontFamily: "var(--font-sans)",
            }}
          >
            <i className="fa fa-refresh" style={{ marginRight: 4 }} /> Làm mới
          </button>
        </div>

        {loading ? (
          <PageSpinner />
        ) : (
          <>
            {/* Header row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "140px 1fr 140px 130px 120px 100px",
                gap: 12,
                padding: "10px 20px",
                background: "var(--bg-section)",
                borderBottom: "1px solid var(--border)",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              <span>Mã đơn</span>
              <span>Khách hàng</span>
              <span>Trạng thái</span>
              <span style={{ textAlign: "right" }}>Tổng tiền</span>
              <span>Ngày đặt</span>
              <span style={{ textAlign: "center" }}>Chi tiết</span>
            </div>

            {data?.items.map((order) => (
              <div
                key={order.id!}
                style={{
                  display: "grid",
                  gridTemplateColumns: "140px 1fr 140px 130px 120px 100px",
                  gap: 12,
                  padding: "14px 20px",
                  borderBottom: "1px solid var(--border)",
                  alignItems: "center",
                  transition: "background var(--transition)",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.background =
                    "var(--bg-hover)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.background = "none")
                }
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    fontFamily: "monospace",
                  }}
                >
                  {shortId(order.id!)}
                </span>
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {order.user?.username ?? "N/A"}
                  </div>
                  <div
                    style={{ fontSize: 11, color: "var(--text-muted)" }}
                  >
                    {order.user?.email}
                  </div>
                </div>
                <Badge variant={getStatusVariant(order.status)} dot>
                  {ORDER_STATUS_LABEL[order.status]}
                </Badge>
                <span
                  style={{
                    textAlign: "right",
                    fontWeight: 800,
                    fontSize: 13,
                    color: "var(--accent)",
                  }}
                >
                  {formatPrice(order.totalPrice)}
                </span>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {order.createdAt ? formatDate(order.createdAt) : "—"}
                </span>
                <div style={{ textAlign: "center" }}>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    id={`admin-order-${order.id}`}
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--primary)",
                      textDecoration: "none",
                      padding: "5px 12px",
                      border: "1.5px solid var(--primary)",
                      borderRadius: "var(--radius-sm)",
                      transition: "all var(--transition)",
                      display: "inline-block",
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
                    Xem <i className="fa fa-arrow-right" style={{ marginLeft: 2 }} />
                  </Link>
                </div>
              </div>
            ))}

            {data?.items.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 0",
                  color: "var(--text-muted)",
                }}
              >
                <div style={{ fontSize: 48, marginBottom: 12 }}><i className="fa fa-inbox" /></div>
                <p>Không có đơn hàng nào</p>
              </div>
            )}
          </>
        )}
      </div>

      {data && (
        <Pagination
          page={data.pageNumber}
          totalPages={data.totalPages}
          onChange={setPage}
        />
      )}
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <AdminOrdersContent />
    </Suspense>
  );
}
