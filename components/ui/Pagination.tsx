"use client";

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "16px 0",
        flexWrap: "wrap",
      }}
    >
      <PageBtn
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        aria-label="Trang trước"
      >
        <i className="fa fa-angle-left" />
      </PageBtn>

      {pages.map((p, i) =>
        p === "..." ? (
          <span
            key={`ellipsis-${i}`}
            style={{ padding: "0 4px", color: "var(--text-muted)" }}
          >
            …
          </span>
        ) : (
          <PageBtn
            key={p}
            active={p === page}
            onClick={() => onChange(p as number)}
            aria-label={`Trang ${p}`}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </PageBtn>
        )
      )}

      <PageBtn
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        aria-label="Trang sau"
      >
        <i className="fa fa-angle-right" />
      </PageBtn>
    </div>
  );
}

function PageBtn({
  children,
  active,
  disabled,
  onClick,
  ...rest
}: {
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
} & React.HTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-disabled={disabled}
      style={{
        width: 36,
        height: 36,
        borderRadius: "var(--radius-sm)",
        border: active
          ? "2px solid var(--primary)"
          : "2px solid var(--border)",
        background: active ? "var(--primary)" : "var(--bg-card)",
        color: active ? "#fff" : disabled ? "var(--text-disabled)" : "var(--text-primary)",
        fontWeight: active ? 700 : 500,
        fontSize: 14,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all var(--transition)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-sans)",
      }}
      onMouseEnter={(e) => {
        if (!active && !disabled)
          (e.currentTarget as HTMLButtonElement).style.borderColor =
            "var(--primary)";
      }}
      onMouseLeave={(e) => {
        if (!active && !disabled)
          (e.currentTarget as HTMLButtonElement).style.borderColor =
            "var(--border)";
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
