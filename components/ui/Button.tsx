"use client";

import React from "react";

type Variant = "primary" | "accent" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary: `
    background: var(--primary); color: var(--text-inverse);
    border: 2px solid var(--primary);
  `,
  accent: `
    background: var(--accent); color: var(--text-inverse);
    border: 2px solid var(--accent);
  `,
  outline: `
    background: transparent; color: var(--primary);
    border: 2px solid var(--primary);
  `,
  ghost: `
    background: transparent; color: var(--text-secondary);
    border: 2px solid transparent;
  `,
  danger: `
    background: var(--danger); color: var(--text-inverse);
    border: 2px solid var(--danger);
  `,
};

const sizeStyles: Record<Size, React.CSSProperties> = {
  sm: { padding: "6px 14px", fontSize: "13px", borderRadius: "var(--radius-sm)" },
  md: { padding: "10px 20px", fontSize: "14px", borderRadius: "var(--radius-md)" },
  lg: { padding: "13px 28px", fontSize: "15px", borderRadius: "var(--radius-md)" },
};

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  fullWidth = false,
  children,
  disabled,
  style,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        fontWeight: 600,
        cursor: disabled || loading ? "not-allowed" : "pointer",
        transition: "all var(--transition)",
        opacity: disabled || loading ? 0.6 : 1,
        width: fullWidth ? "100%" : undefined,
        fontFamily: "var(--font-sans)",
        lineHeight: 1.4,
        whiteSpace: "nowrap",
        ...sizeStyles[size],
        ...style,
      }}
      className={`btn-${variant}`}
      {...props}
    >
      {loading ? (
        <span
          style={{
            width: 16,
            height: 16,
            border: "2px solid currentColor",
            borderTopColor: "transparent",
            borderRadius: "50%",
            display: "inline-block",
            animation: "spin 0.6s linear infinite",
          }}
        />
      ) : (
        icon
      )}
      {children}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .btn-primary { background: var(--primary); color: #fff; border: 2px solid var(--primary); }
        .btn-primary:hover:not(:disabled) { background: var(--primary-dark); border-color: var(--primary-dark); transform: translateY(-1px); box-shadow: var(--shadow-primary); }
        .btn-accent { background: var(--accent); color: #fff; border: 2px solid var(--accent); }
        .btn-accent:hover:not(:disabled) { background: var(--accent-dark); border-color: var(--accent-dark); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(249,115,22,0.3); }
        .btn-outline { background: transparent; color: var(--primary); border: 2px solid var(--primary); }
        .btn-outline:hover:not(:disabled) { background: var(--primary-bg); transform: translateY(-1px); }
        .btn-ghost { background: transparent; color: var(--text-secondary); border: 2px solid transparent; }
        .btn-ghost:hover:not(:disabled) { background: var(--bg-hover); color: var(--text-primary); }
        .btn-danger { background: var(--danger); color: #fff; border: 2px solid var(--danger); }
        .btn-danger:hover:not(:disabled) { background: #dc2626; transform: translateY(-1px); }
      `}</style>
    </button>
  );
}
