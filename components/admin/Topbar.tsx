"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { useRouter } from "next/navigation";

const BREADCRUMB_MAP: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/orders": "Quản lý đơn hàng",
  "/admin/products": "Quản lý sản phẩm",
  "/admin/products/new": "Thêm sản phẩm mới",
  "/admin/categories": "Quản lý danh mục",
  "/admin/stores": "Quản lý cửa hàng",
};

export default function Topbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  const title = BREADCRUMB_MAP[pathname] ?? "Admin";

  return (
    <header
      style={{
        height: "var(--header-height)",
        background: "var(--bg-card)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        position: "sticky",
        top: 0,
        zIndex: 50,
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Left: Title */}
      <div>
        <h1
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: "var(--text-primary)",
            letterSpacing: "-0.3px",
          }}
        >
          {title}
        </h1>
      </div>

      {/* Right: User info */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 14px",
            background: "var(--primary-bg)",
            borderRadius: "var(--radius-full)",
            border: "1px solid var(--primary-border)",
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "var(--primary)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            {user?.username?.charAt(0).toUpperCase() ?? "A"}
          </div>
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--text-primary)",
                lineHeight: 1.2,
              }}
            >
              {user?.username}
            </div>
            <div style={{ fontSize: 11, color: "var(--primary)", fontWeight: 600 }}>
              <i className="fa fa-shield" style={{ marginRight: 4 }} /> Admin
            </div>
          </div>
        </div>

        <button
          id="admin-logout-btn"
          onClick={() => {
            logout();
            router.push("/client/auth/login");
          }}
          style={{
            padding: "8px 14px",
            background: "var(--danger-bg)",
            color: "var(--danger)",
            border: "1px solid var(--danger)",
            borderRadius: "var(--radius-md)",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
            transition: "all var(--transition)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "var(--danger)";
            (e.currentTarget as HTMLButtonElement).style.color = "#fff";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "var(--danger-bg)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--danger)";
          }}
        >
          Đăng xuất
        </button>
      </div>
    </header>
  );
}
