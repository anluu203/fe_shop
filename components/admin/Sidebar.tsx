"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
const NAV_ITEMS = [
  { href: "/admin", label: "Tổng quan", icon: "fa-th-large", exact: true },
  { href: "/admin/orders", label: "Đơn mua sách", icon: "fa-shopping-bag" },
  { href: "/admin/products", label: "Danh mục sách", icon: "fa-book" },
  { href: "/admin/reviews", label: "Đánh giá", icon: "fa-star-o" },
  { href: "/admin/categories", label: "Thể loại", icon: "fa-folder-open-o" },
  { href: "/admin/chatbot", label: "Chatbot AI", icon: "fa-comments-o" },
  { href: "/admin/reports", label: "Báo cáo doanh thu", icon: "fa-line-chart" },
  // { href: "/admin/warranty", label: "Đổi trả", icon: "fa-refresh" },
  // { href: "/admin/consultation", label: "Tư vấn", icon: "fa-lightbulb-o" },
];
export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();
  return (
    <header className="admin-masthead">
      <div className="admin-masthead-top">
        <Link href="/admin" className="brand-lockup">
          <img src="/images/bookstore-logo.svg" alt="" width="34" height="34" />
          <strong>
            BookStore<span>WORKSPACE</span>
          </strong>
        </Link>
        <div className="workspace-identity">
          <span className="workspace-live">
            <i className="fa fa-circle" aria-hidden="true" /> Không gian quản
            trị
          </span>
          <Link href="/client">
            Xem website <i className="fa fa-external-link" aria-hidden="true" />
          </Link>
          <span className="admin-avatar" title={user?.username}>
            {user?.username?.charAt(0) ?? "A"}
          </span>
          <button
            id="admin-logout-btn"
            onClick={() => {
              logout();
              router.push("/client/auth/login");
            }}
            aria-label="Đăng xuất quản trị"
          >
            <i className="fa fa-sign-out" aria-hidden="true" />
          </button>
        </div>
      </div>
      <nav className="admin-navigation" aria-label="Quản trị">
        {NAV_ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
            >
              <i className={`fa ${item.icon}`} aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
