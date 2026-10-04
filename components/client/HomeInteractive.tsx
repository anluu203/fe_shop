"use client";

import Link from "next/link";
import type { CategoryParent } from "../../lib/types";

const CATEGORY_ICONS: Record<string, string> = {
  default: "fa-wrench",
  cpu: "fa-microchip",
  gpu: "fa-gamepad",
  ram: "fa-database",
  ssd: "fa-hdd-o",
  mainboard: "fa-server",
  nguồn: "fa-bolt",
  tản: "fa-snowflake-o",
  case: "fa-desktop",
  màn: "fa-desktop",
  bàn: "fa-keyboard-o",
  chuột: "fa-mouse-pointer",
  tai: "fa-headphones",
  mạng: "fa-wifi",
};

function getCategoryIcon(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return CATEGORY_ICONS.default;
}

interface CategoryStripProps {
  parents: CategoryParent[];
}

export function CategoryStrip({ parents }: CategoryStripProps) {
  if (parents.length === 0) return null;
  return (
    <section
      style={{
        background: "var(--bg-card)",
        borderBottom: "1px solid var(--border)",
        padding: "24px 0",
      }}
    >
      <div className="container">
        <h2
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: "var(--text-primary)",
            marginBottom: 16,
          }}
        >
          Danh mục nổi bật
        </h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {parents.map((cat) => (
            <CategoryCard key={cat.id} cat={cat} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CategoryCard({ cat }: { cat: CategoryParent }) {
  return (
    <Link
      href={`/client/products?parentId=${cat.id}`}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        padding: "16px 20px",
        background: "var(--bg-page)",
        borderRadius: "var(--radius-md)",
        border: "1.5px solid var(--border)",
        minWidth: 100,
        textAlign: "center",
        textDecoration: "none",
        transition: "all var(--transition)",
        color: "var(--text-primary)",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.borderColor = "var(--primary)";
        el.style.background = "var(--primary-bg)";
        el.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.borderColor = "var(--border)";
        el.style.background = "var(--bg-page)";
        el.style.transform = "none";
      }}
    >
      <i className={`fa ${getCategoryIcon(cat.name)}`} style={{ fontSize: 28, color: "var(--primary)" }} />
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: "var(--text-secondary)",
          whiteSpace: "nowrap",
        }}
      >
        {cat.name}
      </span>
    </Link>
  );
}

interface ViewAllLinkProps {
  href: string;
  label: string;
  id: string;
}

export function ViewAllLink({ href, label, id }: ViewAllLinkProps) {
  return (
    <Link
      href={href}
      id={id}
      style={{
        fontSize: 13,
        fontWeight: 700,
        color: "var(--primary)",
        textDecoration: "none",
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "8px 16px",
        border: "1.5px solid var(--primary)",
        borderRadius: "var(--radius-md)",
        transition: "all var(--transition)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.background = "var(--primary)";
        (e.currentTarget as HTMLAnchorElement).style.color = "#fff";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
        (e.currentTarget as HTMLAnchorElement).style.color = "var(--primary)";
      }}
    >
      {label}
    </Link>
  );
}

export function CtaSection() {
  return (
    <section
      style={{
        background: "linear-gradient(135deg, var(--primary-darker) 0%, var(--primary) 100%)",
        padding: "60px 0",
      }}
    >
      <div className="container" style={{ textAlign: "center" }}>
        <h2
          style={{
            fontSize: "clamp(22px, 4vw, 36px)",
            fontWeight: 900,
            color: "#fff",
            marginBottom: 12,
            letterSpacing: "-0.5px",
          }}
        >
          <i className="fa fa-crosshairs" style={{ marginRight: 8 }} /> Build PC Theo Yêu Cầu
        </h2>
        <p
          style={{
            fontSize: 15,
            color: "rgba(255,255,255,0.8)",
            marginBottom: 28,
            maxWidth: 480,
            margin: "0 auto 28px",
          }}
        >
          Không biết chọn linh kiện gì? Đội ngũ chuyên gia của chúng tôi sẵn sàng tư vấn miễn phí!
        </p>
        <Link
          href="/client/products"
          id="cta-shop-now"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "var(--accent)",
            color: "#fff",
            padding: "14px 32px",
            borderRadius: "var(--radius-full)",
            fontWeight: 800,
            fontSize: 15,
            textDecoration: "none",
            boxShadow: "0 4px 20px rgba(249,115,22,0.4)",
            transition: "all var(--transition)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)";
            (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 8px 32px rgba(249,115,22,0.5)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.transform = "none";
            (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 4px 20px rgba(249,115,22,0.4)";
          }}
        >
          <i className="fa fa-shopping-cart" style={{ marginRight: 6 }} /> Mua sắm ngay
        </Link>
      </div>
    </section>
  );
}
