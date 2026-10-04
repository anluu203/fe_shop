"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { productApi } from "../../../lib/api/products";
import type { Page, Product } from "../../../lib/types";
import { formatPrice, formatDate } from "../../../lib/utils/format";
import { PageSpinner } from "../../../components/ui/Spinner";
import Pagination from "../../../components/ui/Pagination";
import Badge from "../../../components/ui/Badge";

export default function AdminProductsPage() {
  const [data, setData] = useState<Page<Product> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [hidingId, setHidingId] = useState<string | null>(null);
  const [confirmHide, setConfirmHide] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    productApi
      .getAll({ page, pageSize: 20, search: search || undefined })
      .then(setData)
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => {
    load();
  }, [load]);

  const handleHide = async (id: string) => {
    setHidingId(id);
    try {
      await productApi.hide(id);
      load();
    } finally {
      setHidingId(null);
      setConfirmHide(null);
    }
  };

  return (
    <div>
      {/* Header bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", gap: 10 }}>
          <input
            type="search"
            id="admin-products-search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setSearch(searchInput);
                setPage(1);
              }
            }}
            placeholder="Tìm kiếm sản phẩm..."
            style={{
              padding: "9px 16px",
              border: "1.5px solid var(--border)",
              borderRadius: "var(--radius-md)",
              fontSize: 13,
              background: "var(--bg-card)",
              color: "var(--text-primary)",
              outline: "none",
              width: 260,
              fontFamily: "var(--font-sans)",
            }}
          />
          <button
            onClick={() => {
              setSearch(searchInput);
              setPage(1);
            }}
            style={{
              padding: "9px 18px",
              background: "var(--primary)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--radius-md)",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
            }}
          >
            <i className="fa fa-search" />
          </button>
        </div>
        <Link
          href="/admin/products/new"
          id="add-product-link"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            background: "var(--primary)",
            color: "#fff",
            borderRadius: "var(--radius-md)",
            fontWeight: 700,
            fontSize: 13,
            textDecoration: "none",
          }}
        >
          <i className="fa fa-plus" /> Thêm sản phẩm
        </Link>
      </div>

      {/* Table */}
      <div
        style={{
          background: "var(--bg-card)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)",
          overflow: "hidden",
        }}
      >
        {/* Table header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "60px 1fr 160px 130px 100px 140px",
            gap: 12,
            padding: "10px 20px",
            background: "var(--bg-section)",
            borderBottom: "1px solid var(--border)",
            fontSize: 11,
            fontWeight: 700,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          <span>Ảnh</span>
          <span>Tên sản phẩm</span>
          <span>Danh mục</span>
          <span style={{ textAlign: "right" }}>Giá</span>
          <span style={{ textAlign: "center" }}>Trạng thái</span>
          <span style={{ textAlign: "center" }}>Thao tác</span>
        </div>

        {loading ? (
          <PageSpinner />
        ) : (
          <>
            {data?.items.map((product) => (
              <div
                key={product.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "60px 1fr 160px 130px 100px 140px",
                  gap: 12,
                  padding: "12px 20px",
                  borderBottom: "1px solid var(--border)",
                  alignItems: "center",
                  transition: "background var(--transition)",
                  opacity: product.isActive ? 1 : 0.55,
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.background =
                    "var(--bg-hover)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.background = "none")
                }
              >
                {/* Image */}
                <div
                  style={{
                    width: 48,
                    height: 48,
                    background: "var(--bg-section)",
                    borderRadius: "var(--radius-sm)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      style={{ width: "100%", height: "100%", objectFit: "contain", padding: 4 }}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: 20, opacity: 0.3 }}><i className="fa fa-desktop" /></span>
                  )}
                </div>

                {/* Name */}
                <div>
                  <div
                    className="line-clamp-2"
                    style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}
                  >
                    {product.name}
                  </div>
                </div>

                {/* Category */}
                <div
                  style={{ fontSize: 12, color: "var(--text-muted)" }}
                  className="line-clamp-1"
                >
                  {product.category?.parent?.name} › {product.category?.name}
                </div>

                {/* Price */}
                <div
                  style={{
                    textAlign: "right",
                    fontWeight: 700,
                    fontSize: 13,
                    color: "var(--accent)",
                  }}
                >
                  {formatPrice(product.price)}
                </div>

                {/* Status */}
                <div style={{ textAlign: "center" }}>
                  <Badge variant={product.isActive ? "success" : "neutral"} dot>
                    {product.isActive ? "Hiện" : "Ẩn"}
                  </Badge>
                </div>

                {/* Actions */}
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    justifyContent: "center",
                  }}
                >
                  <Link
                    href={`/admin/products/${product.id}`}
                    id={`edit-product-${product.id}`}
                    style={{
                      padding: "5px 10px",
                      background: "var(--primary-bg)",
                      color: "var(--primary-dark)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: 12,
                      fontWeight: 700,
                      textDecoration: "none",
                      border: "1px solid var(--primary-border)",
                    }}
                  >
                    <i className="fa fa-pencil" /> Sửa
                  </Link>
                  {product.isActive && (
                    <>
                      {confirmHide === product.id ? (
                        <div style={{ display: "flex", gap: 4 }}>
                          <button
                            id={`confirm-hide-${product.id}`}
                            onClick={() => handleHide(product.id)}
                            disabled={hidingId === product.id}
                            style={{
                              padding: "5px 8px",
                              background: "var(--danger)",
                              color: "#fff",
                              border: "none",
                              borderRadius: "var(--radius-sm)",
                              fontSize: 11,
                              cursor: "pointer",
                              fontFamily: "var(--font-sans)",
                              fontWeight: 700,
                            }}
                          >
                            Ẩn
                          </button>
                          <button
                            onClick={() => setConfirmHide(null)}
                            style={{
                              padding: "5px 8px",
                              background: "var(--bg-section)",
                              color: "var(--text-secondary)",
                              border: "none",
                              borderRadius: "var(--radius-sm)",
                              fontSize: 11,
                              cursor: "pointer",
                              fontFamily: "var(--font-sans)",
                            }}
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <button
                          id={`hide-product-${product.id}`}
                          onClick={() => setConfirmHide(product.id)}
                          style={{
                            padding: "5px 10px",
                            background: "var(--danger-bg)",
                            color: "var(--danger)",
                            border: "1px solid var(--danger)",
                            borderRadius: "var(--radius-sm)",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                            fontFamily: "var(--font-sans)",
                          }}
                        >
                          <i className="fa fa-eye-slash" /> Ẩn
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}

            {data?.items.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}><i className="fa fa-cube" /></div>
                <p>Không có sản phẩm nào</p>
              </div>
            )}
          </>
        )}
      </div>

      {data && (
        <Pagination
          page={data.pageNumber}
          totalPages={data.totalPages}
          onChange={(p) => setPage(p)}
        />
      )}
    </div>
  );
}
