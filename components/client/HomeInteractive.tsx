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
    <section className="bg-[linear-gradient(135deg,var(--primary-darker)_0%,var(--primary)_100%)] py-[60px]">
      <div className="mx-auto w-full max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="mb-3 text-[clamp(22px,4vw,36px)] font-black tracking-[-0.5px] text-white">
          <i className="fa fa-crosshairs mr-2" aria-hidden="true" /> Build PC Theo Yêu Cầu
        </h2>
        <p className="mx-auto mb-7 max-w-[480px] text-[15px] text-white/80">
          Không biết chọn linh kiện gì? Đội ngũ chuyên gia của chúng tôi sẵn sàng tư vấn miễn phí!
        </p>
        <Link href="/client/consultation" id="cta-shop-now"
          className="inline-flex items-center gap-2 rounded-full bg-accent px-8 py-3.5 text-[15px] font-extrabold text-white no-underline shadow-[0_4px_20px_rgba(249,115,22,0.4)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(249,115,22,0.5)]">
          <i className="fa fa-lightbulb-o mr-1.5" aria-hidden="true" /> Tư vấn chọn sản phẩm
        </Link>
      </div>
    </section>
  );
}
