"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { CategoryParent } from "../../lib/types";

interface CategoryNavProps {
  parents: CategoryParent[];
}

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

export default function CategoryNav({ parents }: CategoryNavProps) {
  const searchParams = useSearchParams();
  const selectedParentId = searchParams.get("parentId");

  return (
    <nav
      style={{
        background: "var(--bg-card)",
        borderBottom: "1px solid var(--border)",
        overflowX: "auto",
      }}
    >
      <div className="container">
        <div
          style={{
            display: "flex",
            alignItems: "stretch",
            gap: 0,
            minHeight: 72,
            overflowX: "auto",
            scrollbarWidth: "none",
          }}
        >
          {/* All */}
          <NavItem
            href="/client/products"
            icon="fa-th-large"
            label="Tất cả"
            active={!selectedParentId}
          />
          {parents.map((p) => (
            <NavItem
              key={p.id}
              href={`/client/products?parentId=${p.id}`}
              icon={getCategoryIcon(p.name)}
              label={p.name}
              active={selectedParentId === p.id}
            />
          ))}
        </div>
      </div>
    </nav>
  );
}

function NavItem({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        padding: "10px 16px",
        minWidth: 90,
        textAlign: "center",
        flexShrink: 0,
        borderBottom: active
          ? "3px solid var(--primary)"
          : "3px solid transparent",
        color: active ? "var(--primary)" : "var(--text-secondary)",
        fontWeight: active ? 700 : 500,
        fontSize: 12,
        transition: "all var(--transition)",
        textDecoration: "none",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLAnchorElement).style.color = "var(--primary)";
          (e.currentTarget as HTMLAnchorElement).style.background =
            "var(--primary-bg)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLAnchorElement).style.color =
            "var(--text-secondary)";
          (e.currentTarget as HTMLAnchorElement).style.background = "none";
        }
      }}
    >
      <i className={`fa ${icon}`} style={{ fontSize: 20 }} />
      <span className="line-clamp-1">{label}</span>
    </Link>
  );
}
