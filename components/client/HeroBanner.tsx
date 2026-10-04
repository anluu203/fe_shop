"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const SLIDES = [
  {
    id: 1,
    title: "CPU Thế Hệ Mới",
    subtitle: "AMD Ryzen 9 & Intel Core Ultra",
    description: "Hiệu năng đỉnh cao cho gaming và sáng tạo nội dung",
    cta: "Khám phá ngay",
    href: "/client/products",
    bg: "linear-gradient(135deg, #418dbf 0%, #2d6a94 50%, #1e4f71 100%)",
    iconClass: "fa fa-desktop",
    accent: "#6ab0d9",
  },
  {
    id: 2,
    title: "Card Đồ Hoạ RTX 50 Series",
    subtitle: "NVIDIA GeForce RTX 5090 / 5080",
    description: "Ray Tracing & AI-powered gaming ở mức chưa từng có",
    cta: "Xem ngay",
    href: "/client/products",
    bg: "linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)",
    iconClass: "fa fa-gamepad",
    accent: "#76c442",
  },
  {
    id: 3,
    title: "SSD NVMe Gen 5",
    subtitle: "Tốc độ đọc lên tới 14.000 MB/s",
    description: "Khởi động máy tính trong nháy mắt với công nghệ Gen 5",
    cta: "Mua ngay",
    href: "/client/products",
    bg: "linear-gradient(135deg, #f97316 0%, #ea580c 50%, #c2410c 100%)",
    iconClass: "fa fa-bolt",
    accent: "#fbbf24",
  },
];

export default function HeroBanner() {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      goTo((current + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [current]);

  const goTo = (index: number) => {
    if (animating || index === current) return;
    setAnimating(true);
    setTimeout(() => {
      setCurrent(index);
      setAnimating(false);
    }, 300);
  };

  const slide = SLIDES[current];

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 0,
      }}
    >
      {/* Main banner */}
      <div
        style={{
          background: slide.bg,
          minHeight: 320,
          display: "flex",
          alignItems: "center",
          position: "relative",
          overflow: "hidden",
          transition: "background 0.5s ease",
          opacity: animating ? 0 : 1,
          transform: animating ? "translateY(8px)" : "none",
          transition2: "opacity 0.3s ease, transform 0.3s ease",
        } as React.CSSProperties}
      >
        {/* Background decoration */}
        <div
          style={{
            position: "absolute",
            right: -40,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 160,
            opacity: 0.08,
            userSelect: "none",
            color: "#fff",
          }}
        >
          <i className={slide.iconClass} />
        </div>
        <div
          style={{
            position: "absolute",
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: `${slide.accent}15`,
            right: 80,
            top: "50%",
            transform: "translateY(-50%)",
          }}
        />

        <div className="container" style={{ position: "relative", zIndex: 1 }}>
          <div style={{ maxWidth: 560, padding: "48px 0" }}>
            <div
              style={{
                display: "inline-block",
                background: `${slide.accent}30`,
                border: `1px solid ${slide.accent}60`,
                color: slide.accent,
                padding: "4px 14px",
                borderRadius: "var(--radius-full)",
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 16,
                letterSpacing: "0.5px",
              }}
            >
              <i className="fa fa-fire" style={{ marginRight: 4 }} /> HOT DEAL
            </div>
            <h1
              style={{
                fontSize: "clamp(24px, 4vw, 40px)",
                fontWeight: 900,
                color: "#fff",
                lineHeight: 1.2,
                marginBottom: 8,
                letterSpacing: "-0.5px",
              }}
            >
              {slide.title}
            </h1>
            <p
              style={{
                fontSize: 16,
                color: "rgba(255,255,255,0.8)",
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              {slide.subtitle}
            </p>
            <p
              style={{
                fontSize: 14,
                color: "rgba(255,255,255,0.65)",
                marginBottom: 28,
                lineHeight: 1.6,
              }}
            >
              {slide.description}
            </p>
            <Link
              href={slide.href}
              id={`hero-cta-${slide.id}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "#fff",
                color: "var(--primary-darker)",
                padding: "13px 28px",
                borderRadius: "var(--radius-full)",
                fontWeight: 800,
                fontSize: 14,
                textDecoration: "none",
                boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                transition: "transform var(--transition), box-shadow var(--transition)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.transform =
                  "translateY(-2px)";
                (e.currentTarget as HTMLAnchorElement).style.boxShadow =
                  "0 8px 32px rgba(0,0,0,0.25)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.transform = "none";
                (e.currentTarget as HTMLAnchorElement).style.boxShadow =
                  "0 4px 20px rgba(0,0,0,0.2)";
              }}
            >
              {slide.cta} <i className="fa fa-arrow-right" style={{ marginLeft: 4 }} />
            </Link>
          </div>
        </div>
      </div>

      {/* Dots */}
      <div
        style={{
          position: "absolute",
          bottom: 16,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 8,
        }}
      >
        {SLIDES.map((_, i) => (
          <button
            key={i}
            id={`hero-dot-${i}`}
            onClick={() => goTo(i)}
            aria-label={`Slide ${i + 1}`}
            style={{
              width: i === current ? 24 : 8,
              height: 8,
              borderRadius: "var(--radius-full)",
              background: i === current ? "#fff" : "rgba(255,255,255,0.4)",
              border: "none",
              cursor: "pointer",
              transition: "all 0.3s ease",
              padding: 0,
            }}
          />
        ))}
      </div>

      {/* Arrows */}
      {["prev", "next"].map((dir) => (
        <button
          key={dir}
          id={`hero-${dir}`}
          onClick={() =>
            goTo(
              dir === "prev"
                ? (current - 1 + SLIDES.length) % SLIDES.length
                : (current + 1) % SLIDES.length
            )
          }
          aria-label={dir === "prev" ? "Slide trước" : "Slide tiếp"}
          style={{
            position: "absolute",
            top: "50%",
            transform: "translateY(-50%)",
            [dir === "prev" ? "left" : "right"]: 16,
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.2)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.3)",
            color: "#fff",
            fontSize: 16,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all var(--transition)",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background =
              "rgba(255,255,255,0.35)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.background =
              "rgba(255,255,255,0.2)")
          }
        >
          <i className={`fa fa-chevron-${dir === "prev" ? "left" : "right"}`} />
        </button>
      ))}
    </div>
  );
}
