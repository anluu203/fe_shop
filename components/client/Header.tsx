"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useCart } from "../../contexts/CartContext";

export default function Header() {
  const { user, isAdmin, logout } = useAuth();
  const { itemCount } = useCart();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/client/products?search=${encodeURIComponent(search.trim())}`);
    }
  };

  return (
    <>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "var(--primary)",
          boxShadow: scrolled ? "0 2px 16px rgba(65,141,191,0.3)" : "none",
          transition: "box-shadow var(--transition)",
        }}
      >
        {/* Top bar */}
        <div
          className="container"
          style={{
            height: "var(--header-height)",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          {/* Logo */}
          <Link
            href="/client"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexShrink: 0,
              textDecoration: "none",
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                background: "#fff",
                borderRadius: "var(--radius-md)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                fontWeight: 900,
                color: "var(--primary)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              }}
            >
              <i className="fa fa-bolt" />
            </div>
            <span
              style={{
                color: "#fff",
                fontWeight: 800,
                fontSize: 20,
                letterSpacing: "-0.5px",
                display: "none",
              }}
              className="logo-text"
            >
              TechParts
            </span>
          </Link>

          {/* Search bar */}
          <form
            onSubmit={handleSearch}
            style={{ flex: 1, maxWidth: 600, position: "relative" }}
          >
            <input
              type="search"
              id="header-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm linh kiện máy tính..."
              style={{
                width: "100%",
                padding: "10px 52px 10px 18px",
                borderRadius: "var(--radius-full)",
                border: "none",
                fontSize: 14,
                background: "#fff",
                color: "var(--text-primary)",
                outline: "none",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}
            />
            <button
              type="submit"
              id="header-search-btn"
              aria-label="Tìm kiếm"
              style={{
                position: "absolute",
                right: 4,
                top: "50%",
                transform: "translateY(-50%)",
                background: "var(--accent)",
                color: "#fff",
                border: "none",
                borderRadius: "var(--radius-full)",
                width: 38,
                height: 38,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: 16,
              }}
            >
              <i className="fa fa-search" />
            </button>
          </form>

          {/* Right actions */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexShrink: 0,
            }}
          >
            {/* Cart */}
            <Link
              href="/client/cart"
              id="cart-link"
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                color: "#fff",
                gap: 2,
                padding: "6px 10px",
                borderRadius: "var(--radius-md)",
                transition: "background var(--transition)",
                textDecoration: "none",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.background =
                  "rgba(255,255,255,0.15)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.background =
                  "transparent")
              }
            >
              <i className="fa fa-shopping-cart" style={{ fontSize: 20 }} />
              <span style={{ fontSize: 11, fontWeight: 600 }}>Giỏ hàng</span>
              {itemCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: 2,
                    right: 4,
                    background: "var(--accent)",
                    color: "#fff",
                    borderRadius: "var(--radius-full)",
                    minWidth: 18,
                    height: 18,
                    fontSize: 11,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 4px",
                    animation: "bounce 0.3s ease",
                  }}
                >
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </Link>

            {/* User menu */}
            {user ? (
              <div style={{ position: "relative" }} ref={userMenuRef}>
                <button
                  id="user-menu-btn"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 2,
                    padding: "6px 10px",
                    borderRadius: "var(--radius-md)",
                    border: "none",
                    background: userMenuOpen
                      ? "rgba(255,255,255,0.15)"
                      : "transparent",
                    color: "#fff",
                    cursor: "pointer",
                    transition: "background var(--transition)",
                  }}
                  onMouseEnter={(e) =>
                    !userMenuOpen &&
                    ((e.currentTarget as HTMLButtonElement).style.background =
                      "rgba(255,255,255,0.15)")
                  }
                  onMouseLeave={(e) =>
                    !userMenuOpen &&
                    ((e.currentTarget as HTMLButtonElement).style.background =
                      "transparent")
                  }
                >
                  <i className="fa fa-user" style={{ fontSize: 20 }} />
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      maxWidth: 80,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {user.username}
                  </span>
                </button>

                {userMenuOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 8px)",
                      right: 0,
                      background: "var(--bg-card)",
                      borderRadius: "var(--radius-md)",
                      boxShadow: "var(--shadow-lg)",
                      border: "1px solid var(--border)",
                      minWidth: 200,
                      animation: "fadeIn 0.15s ease",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        padding: "12px 16px",
                        borderBottom: "1px solid var(--border)",
                        background: "var(--primary-bg)",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 14,
                          color: "var(--text-primary)",
                        }}
                      >
                        {user.username}
                      </div>
                      <div
                        style={{ fontSize: 12, color: "var(--text-muted)" }}
                      >
                        {user.email}
                      </div>
                    </div>
                    <DropdownItem
                      href="/client/profile"
                      icon="fa-user"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Tài khoản của tôi
                    </DropdownItem>
                    <DropdownItem
                      href="/client/orders"
                      icon="fa-archive"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Đơn hàng
                    </DropdownItem>
                    {isAdmin && (
                      <DropdownItem
                        href="/admin"
                        icon="fa-cog"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Quản trị
                      </DropdownItem>
                    )}
                    <div
                      style={{
                        borderTop: "1px solid var(--border)",
                        marginTop: 4,
                      }}
                    />
                    <button
                      id="logout-btn"
                      onClick={() => {
                        logout();
                        setUserMenuOpen(false);
                        router.push("/client");
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        width: "100%",
                        padding: "10px 16px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 14,
                        color: "var(--danger)",
                        fontWeight: 500,
                        transition: "background var(--transition)",
                        fontFamily: "var(--font-sans)",
                      }}
                      onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLButtonElement).style.background =
                          "var(--danger-bg)")
                      }
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLButtonElement).style.background =
                          "none")
                      }
                    >
                      <i className="fa fa-sign-out" /> Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", gap: 6 }}>
                <Link
                  href="/client/auth/login"
                  id="login-link"
                  style={{
                    padding: "8px 16px",
                    borderRadius: "var(--radius-md)",
                    background: "rgba(255,255,255,0.15)",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: 13,
                    border: "1.5px solid rgba(255,255,255,0.4)",
                    transition: "all var(--transition)",
                    textDecoration: "none",
                  }}
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/client/auth/register"
                  id="register-link"
                  style={{
                    padding: "8px 16px",
                    borderRadius: "var(--radius-md)",
                    background: "#fff",
                    color: "var(--primary)",
                    fontWeight: 700,
                    fontSize: 13,
                    border: "1.5px solid #fff",
                    transition: "all var(--transition)",
                    textDecoration: "none",
                  }}
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <style>{`
        .logo-text { display: block !important; }
        @media (max-width: 480px) { .logo-text { display: none !important; } }
        @keyframes bounce {
          0% { transform: scale(0.8); }
          60% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
      `}</style>
    </>
  );
}

function DropdownItem({
  href,
  icon,
  children,
  onClick,
}: {
  href: string;
  icon: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 16px",
        fontSize: 14,
        color: "var(--text-primary)",
        fontWeight: 500,
        transition: "background var(--transition)",
        textDecoration: "none",
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLAnchorElement).style.background =
          "var(--primary-bg)")
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLAnchorElement).style.background = "none")
      }
    >
      <i className={`fa ${icon}`} style={{ width: 16, textAlign: "center" }} />
      {children}
    </Link>
  );
}
