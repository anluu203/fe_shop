"use client";

import { useEffect, useState } from "react";
import { adminOrderApi } from "../../lib/api/admin-orders";
import type { OrderStatus } from "../../lib/types";
import { ORDER_STATUS_LABEL } from "../../lib/types";
import { PageSpinner } from "../../components/ui/Spinner";
import Link from "next/link";

interface StatItem {
  status: Exclude<OrderStatus, "AddingItem">;
  count: number;
  icon: string;
  color: string;
  bg: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<StatItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const statuses: Exclude<OrderStatus, "AddingItem">[] = [
      "Processing",
      "Preparing",
      "Shipping",
      "Done",
    ];

    Promise.all(
      statuses.map((status) =>
        adminOrderApi.getAll({ status, pageSize: 1 }).then((r) => ({
          status,
          count: r.totalCount,
        }))
      )
    )
      .then((results) => {
        const totalOrders = results.reduce((s, r) => s + r.count, 0);
        setTotal(totalOrders);
        setStats([
          {
            ...results[0],
            icon: "fa-refresh",
            color: "#1d4ed8",
            bg: "var(--info-bg)",
          },
          {
            ...results[1],
            icon: "fa-cube",
            color: "#b45309",
            bg: "var(--warning-bg)",
          },
          {
            ...results[2],
            icon: "fa-truck",
            color: "var(--primary-dark)",
            bg: "var(--primary-bg)",
          },
          {
            ...results[3],
            icon: "fa-check-circle",
            color: "#15803d",
            bg: "var(--success-bg)",
          },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSpinner />;

  return (
    <div>
      {/* Welcome */}
      <div
        style={{
          background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)",
          borderRadius: "var(--radius-lg)",
          padding: "28px 32px",
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: "#fff",
              marginBottom: 6,
            }}
          >
            Chào mừng, Admin!
          </h2>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 14 }}>
            Tổng cộng <strong style={{ color: "#fff" }}>{total}</strong> đơn hàng cần quản lý
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link
            href="/admin/products/new"
            id="admin-add-product-btn"
            style={{
              padding: "10px 20px",
              background: "#fff",
              color: "var(--primary-dark)",
              borderRadius: "var(--radius-md)",
              fontWeight: 700,
              fontSize: 13,
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <i className="fa fa-plus" /> Thêm sản phẩm
          </Link>
          <Link
            href="/admin/orders"
            id="admin-view-orders-btn"
            style={{
              padding: "10px 20px",
              background: "rgba(255,255,255,0.15)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: "var(--radius-md)",
              fontWeight: 700,
              fontSize: 13,
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <i className="fa fa-archive" /> Xem đơn hàng
          </Link>
        </div>
      </div>

      {/* Stats cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        {/* Total */}
        <div
          style={{
            background: "var(--bg-card)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)",
            padding: "22px 24px",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "var(--radius-md)",
              background: "var(--primary-bg)",
              color: "var(--primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              flexShrink: 0,
            }}
          >
            <i className="fa fa-tachometer" />
          </div>
          <div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 900,
                color: "var(--primary)",
                lineHeight: 1,
              }}
            >
              {total}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
              Tổng đơn hàng
            </div>
          </div>
        </div>

        {stats.map((s) => (
          <Link
            key={s.status}
            href={`/admin/orders?status=${s.status}`}
            id={`admin-stat-${s.status}`}
            style={{
              background: "var(--bg-card)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border)",
              padding: "22px 24px",
              display: "flex",
              alignItems: "center",
              gap: 16,
              textDecoration: "none",
              transition: "all var(--transition)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.boxShadow =
                "var(--shadow-md)";
              (e.currentTarget as HTMLAnchorElement).style.transform =
                "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none";
              (e.currentTarget as HTMLAnchorElement).style.transform = "none";
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "var(--radius-md)",
                background: s.bg,
                color: s.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                flexShrink: 0,
              }}
            >
              <i className={`fa ${s.icon}`} />
            </div>
            <div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 900,
                  color: s.color,
                  lineHeight: 1,
                }}
              >
                {s.count}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                {ORDER_STATUS_LABEL[s.status]}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
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
            padding: "16px 24px",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-section)",
          }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 800, color: "var(--text-secondary)" }}>
            <i className="fa fa-bolt" style={{ marginRight: 6 }} /> Thao tác nhanh
          </h3>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 1,
            background: "var(--border)",
          }}
        >
          {[
            { label: "Xử lý đơn chờ", href: "/admin/orders?status=Processing", icon: "fa-refresh" },
            { label: "Thêm sản phẩm mới", href: "/admin/products/new", icon: "fa-plus" },
            { label: "Quản lý danh mục", href: "/admin/categories", icon: "fa-folder-open" },
            { label: "Quản lý cửa hàng", href: "/admin/stores", icon: "fa-building" },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "16px 20px",
                background: "var(--bg-card)",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--text-primary)",
                textDecoration: "none",
                transition: "background var(--transition)",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.background =
                  "var(--primary-bg)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.background =
                  "var(--bg-card)")
              }
            >
              <i className={`fa ${item.icon}`} style={{ fontSize: 18, width: 20, textAlign: "center", color: "var(--primary)" }} />
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
