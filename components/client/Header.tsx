"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useCart } from "../../contexts/CartContext";

export default function Header() {
  const { user, isAdmin, logout } = useAuth();
  const { itemCount } = useCart();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (search.trim()) {
      router.push(`/client/products?search=${encodeURIComponent(search.trim())}`);
    }
  };

  return (
    <header className={`sticky top-0 z-100 bg-primary transition-shadow duration-200 ${scrolled ? "shadow-[0_2px_16px_rgba(65,141,191,0.3)]" : "shadow-none"}`}>
      <div className="mx-auto flex min-h-[var(--header-height)] w-full max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8 max-[640px]:flex-wrap max-[640px]:justify-between max-[640px]:gap-3 max-[640px]:py-2.5">
        <Link href="/client" aria-label="Tech Store — Trang chủ" className="flex shrink-0 items-center gap-2 no-underline">
          <Image src="/images/Logo_Tech_Store_RGB.jpg" alt="Logo Tech Store" width={44} height={44}
            className="size-11 rounded-[var(--radius-sm)] object-contain" />
        </Link>
        <form onSubmit={handleSearch} className="relative min-w-0 max-w-[600px] flex-1 max-[640px]:order-3 max-[640px]:max-w-none max-[640px]:basis-full">
          <input type="search" id="header-search" aria-label="Tìm kiếm sản phẩm" value={search}
            onChange={(event) => setSearch(event.target.value)} placeholder="Tìm kiếm linh kiện máy tính..."
            className="w-full rounded-full border-0 bg-white py-2.5 pr-[52px] pl-[18px] text-sm text-[var(--text-primary)] shadow-[0_2px_8px_rgba(0,0,0,0.1)] outline-none" />
          <button type="submit" id="header-search-btn" aria-label="Tìm kiếm"
            className="absolute top-1/2 right-1 flex size-[38px] -translate-y-1/2 items-center justify-center rounded-full border-0 bg-accent text-base text-white">
            <i className="fa fa-search" aria-hidden="true" />
          </button>
        </form>
        <div className="flex shrink-0 items-center gap-2">
          <Link href="/client/cart" id="cart-link"
            className="relative flex flex-col items-center gap-0.5 rounded-[var(--radius-md)] px-2.5 py-1.5 text-white no-underline transition-colors duration-200 hover:bg-white/15">
            <i className="fa fa-shopping-cart text-xl" aria-hidden="true" />
            <span className="text-[11px] font-semibold">Giỏ hàng</span>
            {itemCount > 0 && (
              <span className="absolute top-0.5 right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-white">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </Link>
          {user ? (
            <div className="relative" ref={userMenuRef}>
              <button id="user-menu-btn" onClick={() => setUserMenuOpen(!userMenuOpen)} aria-expanded={userMenuOpen}
                className={`flex flex-col items-center gap-0.5 rounded-[var(--radius-md)] border-0 px-2.5 py-1.5 text-white transition-colors duration-200 hover:bg-white/15 ${userMenuOpen ? "bg-white/15" : "bg-transparent"}`}>
                <i className="fa fa-user text-xl" aria-hidden="true" />
                <span className="max-w-20 overflow-hidden text-[11px] font-semibold text-ellipsis whitespace-nowrap">{user.username}</span>
              </button>
              {userMenuOpen && (
                <div className="absolute top-[calc(100%+8px)] right-0 min-w-[200px] overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-lg)]">
                  <div className="border-b border-[var(--border)] bg-[var(--primary-bg)] px-4 py-3">
                    <div className="text-sm font-bold text-[var(--text-primary)]">{user.username}</div>
                    <div className="text-xs text-[var(--text-muted)]">{user.email}</div>
                  </div>
                  <DropdownItem href="/client/profile" icon="fa-user" onClick={() => setUserMenuOpen(false)}>Tài khoản của tôi</DropdownItem>
                  <DropdownItem href="/client/orders" icon="fa-archive" onClick={() => setUserMenuOpen(false)}>Đơn hàng</DropdownItem>
                  <DropdownItem href="/client/warranty" icon="fa-shield" onClick={() => setUserMenuOpen(false)}>Bảo hành của tôi</DropdownItem>
                  {isAdmin && <DropdownItem href="/admin" icon="fa-cog" onClick={() => setUserMenuOpen(false)}>Quản trị</DropdownItem>}
                  <div className="mt-1 border-t border-[var(--border)]" />
                  <button id="logout-btn" onClick={() => { logout(); setUserMenuOpen(false); router.push("/client"); }}
                    className="flex w-full items-center gap-2.5 border-0 bg-transparent px-4 py-2.5 text-sm font-medium text-[var(--danger)] transition-colors duration-200 hover:bg-[var(--danger-bg)]">
                    <i className="fa fa-sign-out" aria-hidden="true" /> Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-1.5">
              <Link href="/client/auth/login" id="login-link" className="rounded-[var(--radius-md)] border-[1.5px] border-white/40 bg-white/15 px-4 py-2 text-[13px] font-semibold text-white no-underline transition-colors max-[640px]:px-2.5">Đăng nhập</Link>
              <Link href="/client/auth/register" id="register-link" className="rounded-[var(--radius-md)] border-[1.5px] border-white bg-white px-4 py-2 text-[13px] font-bold text-primary no-underline transition-colors max-[640px]:px-2.5">Đăng ký</Link>
            </div>
          )}
        </div>
      </div>
      <nav className="mx-auto flex w-full max-w-7xl gap-6 px-4 pt-2 pb-2.5 text-[13px] font-semibold text-white sm:px-6 lg:px-8 max-[640px]:flex-wrap max-[640px]:gap-[18px]" aria-label="Dịch vụ khách hàng">
        <Link href="/client/warranty" className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-white"><i className="fa fa-shield" aria-hidden="true" /> Bảo hành</Link>
        <Link href="/client/consultation" className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-white"><i className="fa fa-lightbulb-o" aria-hidden="true" /> Tư vấn chọn sản phẩm</Link>
      </nav>
    </header>
  );
}

function DropdownItem({ href, icon, children, onClick }: {
  href: string;
  icon: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link href={href} onClick={onClick} className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] no-underline transition-colors duration-200 hover:bg-[var(--primary-bg)]">
      <i className={`fa ${icon} w-4 text-center`} aria-hidden="true" />{children}
    </Link>
  );
}
