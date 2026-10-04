"use client";

interface SpinnerProps {
  size?: number;
  color?: string;
}

export default function Spinner({ size = 24, color = "var(--primary)" }: SpinnerProps) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        border: `3px solid ${color}22`,
        borderTopColor: color,
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
        flexShrink: 0,
      }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </span>
  );
}

export function PageSpinner() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 300,
        flexDirection: "column",
        gap: 16,
      }}
    >
      <Spinner size={40} />
      <span style={{ color: "var(--text-muted)", fontSize: 14 }}>
        Đang tải...
      </span>
    </div>
  );
}
