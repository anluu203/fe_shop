"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { productApi } from "../../../lib/api/products";
import { categoryApi } from "../../../lib/api/categories";
import { subscribeMockData, USE_MOCK } from "../../../lib/mock/config";
import type {
  Category,
  CategoryParent,
  Page,
  Product,
} from "../../../lib/types";
import ProductCard from "../../../components/client/ProductCard";
import Pagination from "../../../components/ui/Pagination";
import { PageSpinner } from "../../../components/ui/Spinner";
function Catalog() {
  const params = useSearchParams();
  const router = useRouter();
  const parentId = params.get("parentId") ?? "";
  const categoryId = params.get("categoryId") ?? "";
  const keyword = params.get("search") ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [search, setSearch] = useState(keyword);
  const [parents, setParents] = useState<CategoryParent[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [data, setData] = useState<Page<Product> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => setSearch(keyword), [keyword]);
  useEffect(() => {
    let active = true;
    const load = () =>
      Promise.all([
        categoryApi.getParents(),
        categoryApi.getAll(),
        productApi.getAll({
          page,
          pageSize: 16,
          parentId: parentId || undefined,
          categoryId: categoryId || undefined,
          search: keyword || undefined,
        }),
      ])
        .then(([p, c, books]) => {
          if (active) {
            setParents(p);
            setCategories(c);
            setData(books);
            setError("");
          }
        })
        .catch((caught) => {
          if (active)
            setError(
              caught instanceof Error
                ? caught.message
                : "Không tải được kệ sách.",
            );
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    setLoading(true);
    void load();
    const off = USE_MOCK
      ? subscribeMockData(() => {
          void load();
        })
      : () => {};
    return () => {
      active = false;
      off();
    };
  }, [page, parentId, categoryId, keyword]);
  function update(values: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete("page");
    router.push(`/client/products?${next.toString()}`);
  }
  return (
    <div className="container catalog-page">
      <header className="catalog-editorial-heading">
        <div>
          <span className="eyebrow">BOOKSTORE / KHÁM PHÁ SÁCH</span>
          <h1>
            Một kệ sách.
            <br />
            <em>Vô vàn cuộc gặp gỡ.</em>
          </h1>
        </div>
        <p>
          Cuốn sách bạn tìm có thể ở ngay đây.
          <br />
          Chọn theo điều bạn muốn khám phá hôm nay.
        </p>
      </header>
      <div className="catalog-new-layout">
        <aside className="catalog-facets">
          <span className="eyebrow">NGĂN SÁCH CỦA BẠN</span>
          <button
            aria-pressed={!parentId && !categoryId}
            onClick={() => update({ parentId: "", categoryId: "" })}
          >
            Tất cả thể loại <span>↗</span>
          </button>
          {parents.map((parent) => (
            <div key={parent.id}>
              <button
                aria-pressed={parentId === parent.id}
                onClick={() => update({ parentId: parent.id, categoryId: "" })}
              >
                {parent.name}
                <i className="fa fa-angle-right" aria-hidden="true" />
              </button>
              {parentId === parent.id && (
                <div className="sub-facets">
                  {categories
                    .filter((c) => c.parentId === parent.id)
                    .map((c) => (
                      <button
                        key={c.id}
                        aria-pressed={categoryId === c.id}
                        onClick={() =>
                          update({
                            categoryId: categoryId === c.id ? "" : c.id,
                          })
                        }
                      >
                        {c.name}
                      </button>
                    ))}
                </div>
              )}
            </div>
          ))}
          <div className="catalog-borrow-note">
            <i className="fa fa-bookmark-o" aria-hidden="true" />
            <strong>Đọc, rồi chia sẻ.</strong>
            <p>Chưa muốn mua? Ghé tủ sách cho mượn của BookStore.</p>
            <a href="/client/borrowing">Khám phá tủ sách ↗</a>
          </div>
        </aside>
        <section className="catalog-results" aria-label="Danh sách sách">
          <form
            className="catalog-search"
            onSubmit={(e) => {
              e.preventDefault();
              update({ search });
            }}
          >
            <i className="fa fa-search" aria-hidden="true" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên sách hoặc tác giả..."
              aria-label="Tìm tên sách hoặc tác giả"
            />
            <button type="submit">
              Tìm sách{" "}
              <i className="fa fa-long-arrow-right" aria-hidden="true" />
            </button>
          </form>
          <div className="catalog-results-heading">
            <span>
              {data?.totalCount ?? 0} cuốn sách{" "}
              {keyword && <>cho “{keyword}”</>}
            </span>
            {(keyword || parentId || categoryId) && (
              <button
                id="clear-filters-btn"
                className="text-button"
                onClick={() => router.push("/client/products")}
              >
                Đặt lại bộ lọc
              </button>
            )}
          </div>
          {error && (
            <p role="alert" className="feedback-error">
              {error}
            </p>
          )}
          {loading ? (
            <PageSpinner />
          ) : data?.items.length ? (
            <>
              <div className="catalog-book-grid">
                {data.items.map((book) => (
                  <ProductCard key={book.id} product={book} />
                ))}
              </div>
              <Pagination
                page={data.pageNumber}
                totalPages={data.totalPages}
                onChange={(value) => {
                  const next = new URLSearchParams(params.toString());
                  next.set("page", String(value));
                  router.push(`/client/products?${next.toString()}`);
                }}
              />
            </>
          ) : (
            <div className="workspace-empty">
              <h2>Chưa tìm thấy cuộc gặp gỡ này.</h2>
              <p>Thử tên sách, tác giả hoặc một thể loại khác nhé.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
export default function ProductsPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Catalog />
    </Suspense>
  );
}
