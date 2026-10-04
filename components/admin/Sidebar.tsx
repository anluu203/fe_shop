"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: "fa-tachometer", exact: true },
  { href: "/admin/orders", label: "Đơn hàng", icon: "fa-shopping-bag" },
  { href: "/admin/products", label: "Sản phẩm", icon: "fa-desktop" },
  { href: "/admin/categories", label: "Danh mục", icon: "fa-folder-open" },
  { href: "/admin/stores", label: "Cửa hàng", icon: "fa-building" },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (item: (typeof NAV_ITEMS)[0]) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  return (
    <aside
      style={{
        width: "var(--sidebar-width)",
        background: "#0f172a",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "24px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <Link
          href="/admin"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              background: "var(--primary)",
              borderRadius: "var(--radius-md)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              fontWeight: 900,
              flexShrink: 0,
              color: "#fff",
            }}
          >
            <i className="fa fa-bolt" />
          </div>
          <div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: "#f8fafc",
                letterSpacing: "-0.3px",
              }}
            >
              TechParts
            </div>
            <div
              style={{
                fontSize: 10,
                color: "var(--primary-light)",
                fontWeight: 600,
                letterSpacing: "1px",
                textTransform: "uppercase",
              }}
            >
              Admin Panel
            </div>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "16px 12px" }}>
        <div
          style={{
            fontSize: 10,
            color: "#475569",
            fontWeight: 700,
            letterSpacing: "1px",
            textTransform: "uppercase",
            padding: "0 8px 10px",
          }}
        >
          Quản lý
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                id={`admin-nav-${item.label.toLowerCase().replace(/\s+/, "-")}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: "var(--radius-md)",
                  background: active ? "rgba(65,141,191,0.18)" : "none",
                  color: active ? "var(--primary-light)" : "#94a3b8",
                  fontWeight: active ? 700 : 500,
                  fontSize: 14,
                  textDecoration: "none",
                  transition: "all var(--transition)",
                  borderLeft: active ? "3px solid var(--primary)" : "3px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLAnchorElement).style.background =
                      "rgba(255,255,255,0.05)";
                    (e.currentTarget as HTMLAnchorElement).style.color = "#cbd5e1";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLAnchorElement).style.background = "none";
                    (e.currentTarget as HTMLAnchorElement).style.color = "#94a3b8";
                  }
                }}
              >
                <i className={`fa ${item.icon}`} style={{ fontSize: 16, width: 20, textAlign: "center", flexShrink: 0 }} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom links */}
      <div
        style={{
          padding: "16px 12px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <Link
          href="/client"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            borderRadius: "var(--radius-md)",
            color: "#64748b",
            fontSize: 13,
            fontWeight: 500,
            textDecoration: "none",
            transition: "all var(--transition)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background =
              "rgba(255,255,255,0.05)";
            (e.currentTarget as HTMLAnchorElement).style.color = "#94a3b8";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background = "none";
            (e.currentTarget as HTMLAnchorElement).style.color = "#64748b";
          }}
        >
          <i className="fa fa-home" style={{ fontSize: 16, width: 20, textAlign: "center" }} />
          Về trang khách hàng
        </Link>
      </div>
    </aside>
  );
}
