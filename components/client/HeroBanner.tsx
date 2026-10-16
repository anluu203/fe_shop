"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

const SLIDES = [
  {
    id: 1,
    title: "GPU & CPU Banner",
    subtitle: "High performance hardware",
    description: "Explore our top GPU and CPU selections",
    cta: "Xem chi tiết",
    href: "/client/products",
    image: "/images/Banner_1_GPU_CPU.jpg",
    iconClass: "fa fa-microchip",
    accent: "#ff6f61",
    bg: "linear-gradient(135deg, #1a0a00 0%, #3d1500 60%, #6b2500 100%)",
  },
  {
    id: 2,
    title: "Mainboard & RAM SSD Banner",
    subtitle: "Stable and fast",
    description: "Discover the best mainboards and RAM SSD combos",
    cta: "Xem chi tiết",
    href: "/client/products",
    image: "/images/Banner_2_Mainboard_RAM_SSD.jpg",
    iconClass: "fa fa-hdd",
    accent: "#61a0ff",
    bg: "linear-gradient(135deg, #000d2e 0%, #00215e 60%, #003a8c 100%)",
  },
  {
    id: 3,
    title: "Case & AIO Cooling Banner",
    subtitle: "Cool and stylish",
    description: "Find perfect PC cases and cooling solutions",
    cta: "Xem chi tiết",
    href: "/client/products",
    image: "/images/Banner_3_Case_PC_AIO_Cooling.jpg",
    iconClass: "fa fa-tint",
    accent: "#34d399",
    bg: "linear-gradient(135deg, #00170d 0%, #00391f 60%, #005c30 100%)",
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
          opacity: animating ? 0 : 1,
          transform: animating ? "translateY(8px)" : "none",
          transition: "opacity 0.3s ease, transform 0.3s ease",
        }}
      >
        {/* Background Image */}
        <Image
          src={slide.image}
          alt={slide.title}
          fill
          priority={slide.id === 1}
          style={{
            objectFit: "cover",
            objectPosition: "center",
            opacity: 0.45,
            zIndex: 0,
          }}
          sizes="100vw"
        />

        {/* Background decoration icon */}
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
            zIndex: 1,
          }}
        >
          <i className={slide.iconClass} />
        </div>

        {/* Accent circle decoration */}
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
            zIndex: 1,
          }}
        />

        {/* Content */}
        <div className="container" style={{ position: "relative", zIndex: 2 }}>
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
