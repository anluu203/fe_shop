"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { imageSrc } from "../../lib/utils/image";

const BREADCRUMB_MAP: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/orders": "Quản lý đơn hàng",
  "/admin/products": "Quản lý sản phẩm",
  "/admin/products/new": "Thêm sản phẩm mới",
  "/admin/categories": "Quản lý danh mục",
  "/admin/stores": "Quản lý cửa hàng",
  "/admin/warranty": "Quản lý bảo hành",
  "/admin/consultation": "Quản lý tư vấn sản phẩm",
};

export default function Topbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();
  const avatar = imageSrc(user?.avatarUrl);

  return (
    <header className="sticky top-0 z-50 flex min-h-[var(--header-height)] shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 shadow-[var(--shadow-sm)] lg:px-6">
      <h1 className="min-w-0 text-base font-extrabold tracking-[-0.3px] text-[var(--text-primary)] sm:text-lg">{BREADCRUMB_MAP[pathname] ?? "Admin"}</h1>
      <div className="flex shrink-0 items-center gap-3">
        <div className="hidden items-center gap-2.5 rounded-full border border-[var(--primary-border)] bg-[var(--primary-bg)] px-3.5 py-2 sm:flex">
          <div className="flex size-[30px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-[13px] font-extrabold text-white">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt={user?.username ?? ""} className="size-full object-cover" onError={(event) => { event.currentTarget.hidden = true; }} />
            ) : user?.username?.charAt(0).toUpperCase() ?? "A"}
          </div>
          <div><div className="text-[13px] leading-tight font-bold text-[var(--text-primary)]">{user?.username}</div><div className="text-[11px] font-semibold text-primary"><i className="fa fa-shield mr-1" aria-hidden="true" />Admin</div></div>
        </div>
        <button id="admin-logout-btn" onClick={() => { logout(); router.push("/client/auth/login"); }} className="rounded-[var(--radius-md)] border border-[var(--danger)] bg-[var(--danger-bg)] px-3.5 py-2 text-[13px] font-bold text-[var(--danger)] transition-colors hover:bg-[var(--danger)] hover:text-white">Đăng xuất</button>
      </div>
    </header>
  );
}
