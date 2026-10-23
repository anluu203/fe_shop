"use client";

import { useState } from "react";
import type { RevenueBucket } from "../../lib/types/reports";
import { formatPrice } from "../../lib/utils/format";

export default function RevenueChart({
  buckets,
  type,
}: {
  buckets: RevenueBucket[];
  type: "bar" | "line";
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = buckets.find((b) => b.key === selectedKey);
  const width = Math.max(760, buckets.length * 28 + 100),
    height = 310;
  const left = 86,
    right = width - 28,
    top = 28,
    bottom = height - 60;
  const maximum = Math.max(1, ...buckets.map((b) => Number(b.revenue)));
  const step = (right - left) / Math.max(1, buckets.length);
  const x = (index: number) => left + step * (index + 0.5);
  const y = (value: string | number) =>
    bottom - (Number(value) / maximum) * (bottom - top);
  const compact = (value: number) =>
    value >= 1000000000
      ? `${(value / 1000000000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tỷ`
      : value >= 1000000
        ? `${(value / 1000000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tr`
        : value >= 1000
          ? `${(value / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} k`
          : String(Math.round(value));
  return (
    <>
      <div className="revenue-chart-scroll">
        <svg
          className="revenue-chart"
          viewBox={`0 0 ${width} ${height}`}
          style={{ minWidth: width }}
          role="group"
          aria-label={`Biểu đồ ${type === "bar" ? "cột" : "đường"} doanh thu theo kỳ, đơn vị VND. Bảng dữ liệu chi tiết ở bên dưới.`}
        >
          <title>Doanh thu đơn hoàn thành theo kỳ</title>
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
            <g key={fraction}>
              <line
                x1={left}
                x2={right}
                y1={y(maximum * fraction)}
                y2={y(maximum * fraction)}
                stroke="var(--border)"
                strokeDasharray="4 4"
              />
              <text
                x={left - 12}
                y={y(maximum * fraction) + 4}
                textAnchor="end"
                fill="var(--text-muted)"
                fontSize="12"
              >
                {compact(maximum * fraction)}
              </text>
            </g>
          ))}
          {type === "line" && (
            <polyline
              points={buckets
                .map((b, i) => `${x(i)},${y(b.revenue)}`)
                .join(" ")}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="3"
            />
          )}
          {buckets.map((bucket, i) => (
            <g key={bucket.key}>
              {type === "bar" ? (
                <rect
                  x={x(i) - Math.min(step * 0.3, 28)}
                  y={y(bucket.revenue)}
                  width={Math.min(step * 0.6, 56)}
                  height={Math.max(
                    Number(bucket.revenue) > 0 ? 2 : 0,
                    bottom - y(bucket.revenue),
                  )}
                  rx="3"
                  fill={
                    selectedKey === bucket.key
                      ? "var(--accent)"
                      : "var(--primary)"
                  }
                >
                  <title>
                    {bucket.label}: {formatPrice(bucket.revenue)} ·{" "}
                    {bucket.orders} đơn
                  </title>
                </rect>
              ) : (
                <circle
                  cx={x(i)}
                  cy={y(bucket.revenue)}
                  r="4"
                  fill="var(--bg-card)"
                  stroke="var(--primary)"
                  strokeWidth="2"
                >
                  <title>
                    {bucket.label}: {formatPrice(bucket.revenue)}
                  </title>
                </circle>
              )}
              <rect
                x={left + step * i}
                y={top}
                width={step}
                height={bottom - top}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={`${bucket.label}: ${formatPrice(bucket.revenue)}, ${bucket.orders} đơn`}
                onClick={() => setSelectedKey(bucket.key)}
                onFocus={() => setSelectedKey(bucket.key)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedKey(bucket.key);
                  }
                }}
              >
                <title>
                  {bucket.label}: {formatPrice(bucket.revenue)} ·{" "}
                  {bucket.orders} đơn
                </title>
              </rect>
              {i % Math.max(1, Math.ceil(buckets.length / 9)) === 0 && (
                <text
                  x={x(i)}
                  y={bottom + 28}
                  textAnchor="middle"
                  fill="var(--text-muted)"
                  fontSize="11"
                >
                  {/^\d{4}-\d{2}-\d{2}$/.test(bucket.key)
                    ? `${bucket.key.slice(8, 10)}/${bucket.key.slice(5, 7)}`
                    : bucket.label}
                </text>
              )}
            </g>
          ))}
          <text x={left} y="15" fill="var(--text-muted)" fontSize="11">
            VND
          </text>
        </svg>
      </div>
      <p className="chart-scroll-hint">
        Cuộn ngang để xem đầy đủ các kỳ trên biểu đồ.
      </p>
      <p className="chart-detail" aria-live="polite">
        {selected
          ? `${selected.label} · ${formatPrice(selected.revenue)} · ${selected.orders} đơn hoàn thành · ${selected.quantity} sách`
          : "Chọn một kỳ trên biểu đồ để xem doanh thu và số đơn."}
      </p>
    </>
  );
}
