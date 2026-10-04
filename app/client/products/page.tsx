"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { productApi } from "../../../lib/api/products";
import { categoryApi } from "../../../lib/api/categories";
import type { Category, CategoryParent, Page, Product } from "../../../lib/types";
import ProductCard from "../../../components/client/ProductCard";
import Pagination from "../../../components/ui/Pagination";
import { PageSpinner } from "../../../components/ui/Spinner";

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const searchQuery = searchParams.get("search") ?? "";
  const categoryId = searchParams.get("categoryId") ?? "";
  const parentId = searchParams.get("parentId") ?? "";
  const pageParam = parseInt(searchParams.get("page") ?? "1", 10);

  const [products, setProducts] = useState<Page<Product> | null>(null);
  const [parents, setParents] = useState<CategoryParent[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchQuery);

  // Load danh mục
  useEffect(() => {
    Promise.all([
      categoryApi.getParents(),
      categoryApi.getAll(),
    ]).then(([p, c]) => {
      setParents(p);
      setCategories(c);
    });
  }, []);

  // Load sản phẩm khi params thay đổi
  useEffect(() => {
    setLoading(true);
    productApi
      .getAll({
        page: pageParam,
        pageSize: 20,
        search: searchQuery || undefined,
        categoryId: categoryId || undefined,
      })
      .then(setProducts)
      .finally(() => setLoading(false));
  }, [searchQuery, categoryId, pageParam]);

  const updateParam = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([k, v]) => {
        if (v) params.set(k, v);
        else params.delete(k);
      });
      params.delete("page");
      router.push(`/client/products?${params.toString()}`);
    },
    [searchParams, router]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam({ search: search || undefined });
  };

  // Categories for selected parent
  const filteredCats = parentId
    ? categories.filter((c) => c.parentId === parentId)
    : categories;

  return (
    <div style={{ background: "var(--bg-page)", minHeight: "100vh" }}>
      {/* Page header */}
      <div
        style={{
          background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)",
          padding: "28px 0 20px",
        }}
      >
        <div className="container">
          <h1
            style={{
              fontSize: 24,
              fontWeight: 900,
              color: "#fff",
              marginBottom: 16,
              letterSpacing: "-0.3px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <i className="fa fa-shopping-bag" style={{ marginRight: 8 }} /> Tất cả sản phẩm
          </h1>
          {/* Search bar */}
          <form onSubmit={handleSearch} style={{ maxWidth: 560 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                id="products-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm linh kiện..."
                style={{
                  flex: 1,
                  padding: "11px 18px",
                  borderRadius: "var(--radius-full)",
                  border: "none",
                  fontSize: 14,
                  background: "rgba(255,255,255,0.95)",
                  outline: "none",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
              />
              <button
                type="submit"
                id="products-search-btn"
                style={{
                  padding: "11px 20px",
                  background: "var(--accent)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "var(--radius-full)",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: 14,
                  fontFamily: "var(--font-sans)",
                  whiteSpace: "nowrap",
                }}
              >
                <i className="fa fa-search" style={{ marginRight: 4 }} /> Tìm
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="container" style={{ padding: "24px 32px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "220px 1fr",
            gap: 24,
            alignItems: "start",
          }}
        >
          {/* Sidebar filters */}
          <aside>
            <div
              style={{
                background: "var(--bg-card)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                overflow: "hidden",
                position: "sticky",
                top: "calc(var(--header-height) + 16px)",
              }}
            >
              {/* Category parents */}
              <div
                style={{
                  padding: "14px 16px",
                  borderBottom: "1px solid var(--border)",
                  background: "var(--primary-bg)",
                }}
              >
                <h3
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: "var(--primary-dark)",
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                  }}
                >
                  Danh mục
                </h3>
              </div>
              <div>
                <FilterItem
                  label="Tất cả sản phẩm"
                  active={!parentId && !categoryId}
                  onClick={() => router.push("/client/products")}
                />
                {parents.map((p) => (
                  <div key={p.id}>
                    <FilterItem
                      label={p.name}
                      active={parentId === p.id}
                      onClick={() =>
                        updateParam({ parentId: p.id, categoryId: undefined })
                      }
                      bold
                    />
                    {/* Sub-categories visible when parent selected */}
                    {parentId === p.id &&
                      filteredCats.map((c) => (
                        <FilterItem
                          key={c.id}
                          label={c.name}
                          active={categoryId === c.id}
                          onClick={() =>
                            updateParam({ categoryId: c.id })
                          }
                          indent
                        />
                      ))}
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* Products grid */}
          <div>
            {/* Active filters & count */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                {loading ? (
                  "Đang tải..."
                ) : (
                  <>
                    Tìm thấy{" "}
                    <strong style={{ color: "var(--text-primary)" }}>
                      {products?.totalCount ?? 0}
                    </strong>{" "}
                    sản phẩm
                    {searchQuery && (
                      <span>
                        {" "}
                        cho &quot;
                        <strong>{searchQuery}</strong>&quot;
                      </span>
                    )}
                  </>
                )}
              </div>
              {(searchQuery || categoryId || parentId) && (
                <button
                  id="clear-filters-btn"
                  onClick={() => {
                    setSearch("");
                    router.push("/client/products");
                  }}
                  style={{
                    fontSize: 12,
                    color: "var(--danger)",
                    background: "var(--danger-bg)",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    padding: "4px 12px",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  <i className="fa fa-times" style={{ marginRight: 4 }} /> Xóa bộ lọc
                </button>
              )}
            </div>

            {loading ? (
              <PageSpinner />
            ) : products && products.items.length > 0 ? (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
                    gap: 14,
                  }}
                >
                  {products.items.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
                <Pagination
                  page={products.pageNumber}
                  totalPages={products.totalPages}
                  onChange={(page) => {
                    const params = new URLSearchParams(searchParams.toString());
                    params.set("page", String(page));
                    router.push(`/client/products?${params.toString()}`);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                />
              </>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: "80px 0",
                  color: "var(--text-muted)",
                }}
              >
                <div style={{ fontSize: 48, marginBottom: 16 }}><i className="fa fa-search" /></div>
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    marginBottom: 8,
                    color: "var(--text-secondary)",
                  }}
                >
                  Không tìm thấy sản phẩm
                </h3>
                <p style={{ fontSize: 14 }}>
                  Thử từ khóa khác hoặc xóa bộ lọc
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          .products-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <ProductsContent />
    </Suspense>
  );
}

function FilterItem({
  label,
  active,
  onClick,
  bold,
  indent,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  bold?: boolean;
  indent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: indent ? "8px 16px 8px 28px" : "10px 16px",
        background: active ? "var(--primary-bg)" : "none",
        border: "none",
        borderLeft: active
          ? "3px solid var(--primary)"
          : "3px solid transparent",
        color: active ? "var(--primary-dark)" : "var(--text-secondary)",
        fontWeight: active ? 700 : bold ? 600 : 400,
        fontSize: indent ? 12 : 13,
        cursor: "pointer",
        textAlign: "left",
        transition: "all var(--transition)",
        fontFamily: "var(--font-sans)",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.background =
            "var(--bg-hover)";
          (e.currentTarget as HTMLButtonElement).style.color =
            "var(--text-primary)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.background = "none";
          (e.currentTarget as HTMLButtonElement).style.color =
            "var(--text-secondary)";
        }
      }}
    >
      {active && (
        <span style={{ color: "var(--primary)", fontSize: 10 }}>●</span>
      )}
      {label}
    </button>
  );
}
