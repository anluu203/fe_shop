"use client";

import Link from "next/link";
import { useState } from "react";
import type { Product } from "../../lib/types";
import { formatPrice } from "../../lib/utils/format";
import { useCart } from "../../contexts/CartContext";
import { useAuth } from "../../contexts/AuthContext";
import { useRouter } from "next/navigation";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addItem, isLoading } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      router.push("/client/auth/login");
      return;
    }
    setAdding(true);
    try {
      await addItem(product.id, 1);
    } finally {
      setAdding(false);
    }
  };

  return (
    <Link
      href={`/client/products/${product.id}`}
      style={{
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-card)",
        borderRadius: "var(--radius-md)",
        border: `1.5px solid ${hovered ? "var(--primary)" : "var(--border)"}`,
        overflow: "hidden",
        transition: "all var(--transition)",
        transform: hovered ? "translateY(-4px)" : "none",
        boxShadow: hovered ? "var(--shadow-md)" : "var(--shadow-sm)",
        cursor: "pointer",
        textDecoration: "none",
        position: "relative",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Category badge */}
      <div
        style={{
          position: "absolute",
          top: 8,
          left: 8,
          zIndex: 1,
          background: "var(--primary-bg)",
          color: "var(--primary-dark)",
          fontSize: 10,
          fontWeight: 700,
          padding: "2px 8px",
          borderRadius: "var(--radius-full)",
          letterSpacing: "0.3px",
        }}
      >
        {product.category?.name}
      </div>

      {/* Product image */}
      <div
        style={{
          aspectRatio: "1",
          background: "var(--bg-section)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {product.imageUrl && !imgError ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            onError={() => setImgError(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              padding: 12,
              transition: "transform var(--transition-slow)",
              transform: hovered ? "scale(1.05)" : "scale(1)",
            }}
          />
        ) : (
          <div
            style={{
              fontSize: 48,
              opacity: 0.3,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <i className="fa fa-desktop" />
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <h3
          className="line-clamp-2"
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
            lineHeight: 1.4,
            minHeight: 36,
          }}
        >
          {product.name}
        </h3>

        <div style={{ marginTop: "auto" }}>
          <div
            style={{
              fontSize: 17,
              fontWeight: 800,
              color: "var(--accent)",
              letterSpacing: "-0.3px",
            }}
          >
            {formatPrice(product.price)}
          </div>

          <button
            id={`add-to-cart-${product.id}`}
            onClick={handleAddToCart}
            disabled={adding || isLoading}
            style={{
              marginTop: 10,
              width: "100%",
              padding: "8px",
              background: hovered ? "var(--accent)" : "var(--accent-bg)",
              color: hovered ? "#fff" : "var(--accent-dark)",
              border: "1.5px solid var(--accent)",
              borderRadius: "var(--radius-sm)",
              fontWeight: 700,
              fontSize: 12,
              cursor: adding ? "not-allowed" : "pointer",
              transition: "all var(--transition)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              opacity: adding ? 0.7 : 1,
              fontFamily: "var(--font-sans)",
            }}
          >
            {adding ? (
              <>
                <span
                  style={{
                    width: 12,
                    height: 12,
                    border: "2px solid currentColor",
                    borderTopColor: "transparent",
                    borderRadius: "50%",
                    display: "inline-block",
                    animation: "spin 0.6s linear infinite",
                  }}
                />
                Đang thêm...
              </>
            ) : (
              <><i className="fa fa-cart-plus" /> Thêm vào giỏ</>
            )}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Link>
  );
}
