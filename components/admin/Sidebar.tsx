"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: "fa-tachometer", exact: true },
  { href: "/admin/orders", label: "Đơn hàng", icon: "fa-shopping-bag" },
  { href: "/admin/products", label: "Sản phẩm", icon: "fa-desktop" },
  { href: "/admin/categories", label: "Danh mục", icon: "fa-folder-open" },
  { href: "/admin/stores", label: "Cửa hàng", icon: "fa-building" },
  { href: "/admin/warranty", label: "Bảo hành", icon: "fa-shield" },
  { href: "/admin/consultation", label: "Tư vấn sản phẩm", icon: "fa-lightbulb-o" },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex w-full min-w-0 shrink-0 flex-col bg-[#0f172a] lg:sticky lg:top-0 lg:h-screen lg:w-[var(--sidebar-width)] lg:overflow-y-auto">
      <div className="border-b border-white/6 px-5 py-3 lg:py-6">
        <Link href="/admin" className="flex items-center gap-2.5 no-underline">
          <Image src="/images/Logo_Tech_Store_RGB.jpg" alt="Logo Tech Store" width={38} height={38} className="size-[38px] shrink-0 rounded-[var(--radius-md)] object-contain" />
          <div><div className="text-base font-extrabold tracking-[-0.3px] text-slate-50">TechParts</div><div className="text-[10px] font-semibold tracking-[1px] text-primary-light uppercase">Admin Panel</div></div>
        </Link>
      </div>
      <nav className="min-w-0 flex-1 px-3 py-3 lg:py-4" aria-label="Quản trị">
        <div className="hidden px-2 pb-2.5 text-[10px] font-bold tracking-[1px] text-slate-600 uppercase lg:block">Quản lý</div>
        <div className="flex gap-[3px] overflow-x-auto lg:flex-col lg:overflow-x-visible">
          {NAV_ITEMS.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return <Link key={item.href} href={item.href} id={`admin-nav-${item.label.toLowerCase().replace(/\s+/, "-")}`} aria-current={active ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2.5 rounded-[var(--radius-md)] border-l-[3px] px-3 py-2.5 text-sm whitespace-nowrap no-underline transition-colors ${active ? "border-primary bg-[rgba(65,141,191,0.18)] font-bold text-primary-light" : "border-transparent font-medium text-slate-400 hover:bg-white/5 hover:text-slate-300"}`}>
              <i className={`fa ${item.icon} w-5 shrink-0 text-center text-base`} aria-hidden="true" />{item.label}
            </Link>;
          })}
        </div>
      </nav>
      <div className="hidden border-t border-white/6 px-3 py-4 lg:block">
        <Link href="/client" className="flex items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2.5 text-[13px] font-medium text-slate-500 no-underline transition-colors hover:bg-white/5 hover:text-slate-400"><i className="fa fa-home w-5 text-center text-base" aria-hidden="true" />Về trang khách hàng</Link>
      </div>
    </aside>
  );
}
