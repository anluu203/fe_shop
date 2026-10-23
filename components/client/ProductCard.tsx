"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "../../lib/types";
import { formatPrice } from "../../lib/utils/format";
import { imageSrc } from "../../lib/utils/image";
import { listPrice } from "../../lib/utils/books";
import { useCart } from "../../contexts/CartContext";
import { useAuth } from "../../contexts/AuthContext";
export default function ProductCard({ product }: { product: Product }) {
  const { addItem, isLoading } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");
  const [imgError, setImgError] = useState(false);
  async function handleAddToCart() {
    if (!user) {
      router.push("/client/auth/login");
      return;
    }
    setAdding(true);
    setError("");
    try {
      await addItem(product.id, 1);
      setAdded(true);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Không thể thêm sách vào giỏ.",
      );
    } finally {
      setAdding(false);
    }
  }
  return (
    <article className="book-card">
      <Link
        href={`/client/products/${product.id}`}
        className="book-cover-link"
        aria-label={product.name}
      >
        {product.imageUrl && !imgError ? (
          <img
            className="book-cover"
            src={imageSrc(product.imageUrl)}
            alt={product.name}
            loading="lazy"
            width="210"
            height="280"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="book-cover-fallback">
            <i className="fa fa-book" aria-hidden="true" />
          </span>
        )}
      </Link>
      <div className="book-card-info">
        <span className="book-card-category">
          {product.category?.parent?.name}
        </span>
        <Link
          href={`/client/products/${product.id}`}
          className="book-card-title"
        >
          {product.name}
        </Link>
        <p className="book-author">
          {product.author || "Đang cập nhật tác giả"}
        </p>
        <strong className="book-price">{formatPrice(product.price)}</strong>
        {!!product.discount && <span className="book-discount">Giảm {product.discount}% {listPrice(product.price, product.discount) && <del>{formatPrice(listPrice(product.price, product.discount)!)}</del>}</span>}
        <button
          type="button"
          id={`add-to-cart-${product.id}`}
          className="book-add"
          onClick={handleAddToCart}
          disabled={adding || isLoading}
        >
          <i
            className={`fa ${adding ? "fa-spinner fa-spin" : added ? "fa-check" : "fa-cart-plus"}`}
            aria-hidden="true"
          />{" "}
          {adding
            ? "Đang thêm..."
            : added
              ? "Thêm tiếp vào giỏ"
              : "Thêm vào giỏ"}
        </button>
        {error && (
          <p className="catalog-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </article>
  );
}
