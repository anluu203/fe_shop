"use client";

type BadgeVariant = "primary" | "accent" | "success" | "warning" | "danger" | "info" | "neutral";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  dot?: boolean;
}

const colors: Record<BadgeVariant, { bg: string; color: string }> = {
  primary: { bg: "var(--primary-bg)", color: "var(--primary-dark)" },
  accent: { bg: "var(--accent-bg)", color: "var(--accent-dark)" },
  success: { bg: "var(--success-bg)", color: "#15803d" },
  warning: { bg: "var(--warning-bg)", color: "#b45309" },
  danger: { bg: "var(--danger-bg)", color: "#b91c1c" },
  info: { bg: "var(--info-bg)", color: "#1d4ed8" },
  neutral: { bg: "var(--bg-section)", color: "var(--text-secondary)" },
};

export default function Badge({ variant = "neutral", children, dot }: BadgeProps) {
  const { bg, color } = colors[variant];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 10px",
        borderRadius: "var(--radius-full)",
        fontSize: "calc(12px * var(--font-scale))",
        fontWeight: 600,
        letterSpacing: "0.3px",
        background: bg,
        color,
        whiteSpace: "nowrap",
      }}
    >
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: color,
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </span>
  );
}
