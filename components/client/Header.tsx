"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useCart } from "../../contexts/CartContext";
export default function Header() {
  const { user, isAdmin, logout } = useAuth();
  const { itemCount } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    function escape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  useEffect(() => setOpen(false), [pathname]);
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim())
      router.push(
        `/client/products?search=${encodeURIComponent(search.trim())}`,
      );
  }
  return (
    <header className="book-site-header">
      <div className="container masthead">
        <Link
          href="/client"
          className="brand-lockup"
          aria-label="BookStore — Trang chủ"
        >
          <img src="/images/bookstore-logo.svg" alt="" width="38" height="38" />
          <strong>
            BookStore<span>NHÀ CỦA NHỮNG NGƯỜI ĐỌC</span>
          </strong>
        </Link>
        <nav className="main-navigation" aria-label="Điều hướng chính">
          {[
            { href: "/client", label: "Trang chủ", exact: true },
            { href: "/client/products", label: "Khám phá sách" },
            // { href: "/client/consultation", label: "Gợi ý cho bạn" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={
                (
                  item.exact
                    ? pathname === item.href
                    : pathname.startsWith(item.href)
                )
                  ? "page"
                  : undefined
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="header-tools">
          <Link
            href="/client/cart"
            id="cart-link"
            className="header-cart"
            aria-label={`Giỏ hàng, ${itemCount} cuốn sách`}
          >
            <i className="fa fa-shopping-bag" aria-hidden="true" />
            <span>{itemCount.toString().padStart(2, "0")}</span>
          </Link>
          {user ? (
            <div className="account-menu" ref={ref}>
              <button
                id="user-menu-btn"
                aria-expanded={open}
                aria-controls="account-dropdown"
                onClick={() => setOpen(!open)}
              >
                <span className="account-initial">
                  {user.username.charAt(0)}
                </span>
                <span className="account-name">{user.username}</span>
                <i className="fa fa-angle-down" aria-hidden="true" />
              </button>
              {open && (
                <div id="account-dropdown" className="account-dropdown">
                  <small>{user.email}</small>
                  <Link href="/client/orders">Đơn mua sách</Link>
                  <Link href="/client/profile">Thông tin cá nhân</Link>
                  <Link href="/client/warranty">Yêu cầu đổi trả</Link>
                  {isAdmin && <Link href="/admin">Không gian quản trị</Link>}
                  <button
                    id="logout-btn"
                    onClick={() => {
                      logout();
                      setOpen(false);
                      router.push("/client");
                    }}
                  >
                    Đăng xuất <i className="fa fa-sign-out" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              id="login-link"
              className="header-login"
              href="/client/auth/login"
            >
              Đăng nhập <i className="fa fa-arrow-right" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
      <div className="container masthead-search">
        <span>ĐỌC. KHÁM PHÁ. CHIA SẺ.</span>
        <form onSubmit={submit}>
          <i className="fa fa-search" aria-hidden="true" />
          <input
            id="header-search"
            aria-label="Tìm kiếm sách"
            placeholder="Một tựa sách, một tác giả, một hành trình..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button id="header-search-btn" type="submit">
            Tìm sách <i className="fa fa-long-arrow-right" aria-hidden="true" />
          </button>
        </form>
        <button className="header-chat-link" type="button" onClick={() => window.dispatchEvent(new Event("bookstore:open-chat"))}>
          Tư vấn chọn sách cùng AI{" "}
          <i className="fa fa-arrow-right" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
