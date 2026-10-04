"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer
      style={{
        background: "#1a202c",
        color: "#e2e8f0",
        marginTop: "auto",
      }}
    >
      {/* Main footer */}
      <div className="container" style={{ padding: "48px 32px 32px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 40,
          }}
        >
          {/* Brand */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 16,
              }}
            >
              <span
                style={{
                  fontSize: 24,
                  background: "var(--primary)",
                  width: 44,
                  height: 44,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "var(--radius-md)",
                  color: "#fff",
                }}
              >
                <i className="fa fa-bolt" />
              </span>
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: "#fff",
                  letterSpacing: "-0.5px",
                }}
              >
                TechParts
              </span>
            </div>
            <p
              style={{
                fontSize: 13,
                color: "#a0aec0",
                lineHeight: 1.7,
                marginBottom: 16,
              }}
            >
              Chuyên cung cấp linh kiện máy tính chính hãng với giá tốt nhất.
              Uy tín — Chất lượng — Bảo hành.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              {["fa-facebook", "fa-instagram", "fa-twitter", "fa-youtube-play"].map((icon, i) => (
                <span
                  key={i}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "var(--radius-sm)",
                    background: "rgba(255,255,255,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "background var(--transition)",
                    fontSize: 16,
                  }}
                >
                  <i className={`fa ${icon}`} />
                </span>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4
              style={{
                color: "#fff",
                fontWeight: 700,
                marginBottom: 16,
                fontSize: 15,
              }}
            >
              Sản phẩm
            </h4>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "CPU & Bộ xử lý", href: "/client/products" },
                { label: "Card đồ hoạ (GPU)", href: "/client/products" },
                { label: "RAM & Bộ nhớ", href: "/client/products" },
                { label: "Ổ cứng SSD", href: "/client/products" },
                { label: "Mainboard", href: "/client/products" },
              ].map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    style={{
                      fontSize: 13,
                      color: "#a0aec0",
                      transition: "color var(--transition)",
                      textDecoration: "none",
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLAnchorElement).style.color =
                        "var(--primary-light)")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLAnchorElement).style.color =
                        "#a0aec0")
                    }
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4
              style={{
                color: "#fff",
                fontWeight: 700,
                marginBottom: 16,
                fontSize: 15,
              }}
            >
              Hỗ trợ
            </h4>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                "Chính sách bảo hành",
                "Hướng dẫn đặt hàng",
                "Chính sách đổi trả",
                "Câu hỏi thường gặp",
                "Liên hệ hỗ trợ",
              ].map((item) => (
                <li key={item}>
                  <span
                    style={{
                      fontSize: 13,
                      color: "#a0aec0",
                      cursor: "pointer",
                    }}
                  >
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4
              style={{
                color: "#fff",
                fontWeight: 700,
                marginBottom: 16,
                fontSize: 15,
              }}
            >
              Liên hệ
            </h4>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                fontSize: 13,
                color: "#a0aec0",
              }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <i className="fa fa-map-marker" style={{ width: 16, textAlign: "center" }} />
                <span>123 Nguyễn Trãi, Q.1, TP.HCM</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <i className="fa fa-phone" style={{ width: 16, textAlign: "center" }} />
                <span>1900 1234</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <i className="fa fa-envelope" style={{ width: 16, textAlign: "center" }} />
                <span>support@techparts.vn</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <i className="fa fa-clock-o" style={{ width: 16, textAlign: "center" }} />
                <span>8:00 - 21:00 mỗi ngày</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.08)",
          padding: "16px 32px",
        }}
      >
        <div
          className="container"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 12, color: "#718096" }}>
            © 2024 TechParts. Bảo lưu mọi quyền.
          </span>
          <div style={{ display: "flex", gap: 20 }}>
            {["Điều khoản sử dụng", "Bảo mật thông tin"].map((item) => (
              <span
                key={item}
                style={{
                  fontSize: 12,
                  color: "#718096",
                  cursor: "pointer",
                }}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
