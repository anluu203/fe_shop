"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { productApi } from "../../../lib/api/products";
import type { Page, Product } from "../../../lib/types";
import { subscribeMockData, USE_MOCK } from "../../../lib/mock/config";
import { formatPrice } from "../../../lib/utils/format";
import { imageSrc } from "../../../lib/utils/image";
import Pagination from "../../../components/ui/Pagination";
import { PageSpinner } from "../../../components/ui/Spinner";
export default function AdminProducts() {
  const [data, setData] = useState<Page<Product> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState("");
  const load = useCallback(
    () =>
      productApi
        .getAll({
          page,
          pageSize: 16,
          search: search || undefined,
          includeInactive: true,
        })
        .then(setData)
        .catch((caught) =>
          setError(
            caught instanceof Error
              ? caught.message
              : "Không tải được danh sách sách.",
          ),
        )
        .finally(() => setLoading(false)),
    [page, search],
  );
  useEffect(() => {
    setLoading(true);
    void load();
    return USE_MOCK
      ? subscribeMockData(() => {
          void load();
        })
      : undefined;
  }, [load]);
  async function hide(id: string) {
    setBusy(id);
    setError("");
    try {
      await productApi.hide(id);
      setConfirm("");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể ẩn sách.");
    } finally {
      setBusy("");
    }
  }
  return (
    <div>
      <section className="admin-section-intro">
        <div>
          <span className="eyebrow">BIÊN TẬP KỆ SÁCH</span>
          <h2>Mọi đầu sách, cùng một nơi.</h2>
          <p>
            Chăm chút thông tin xuất bản, hình ảnh và giá bán cho từng cuốn
            sách.
          </p>
        </div>
        <Link className="outline-button" href="/admin/reports">
          Xem sách bán chạy{" "}
          <i className="fa fa-long-arrow-right" aria-hidden="true" />
        </Link>
      </section>
      <form
        className="lending-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setSearch(input);
        }}
      >
        <label className="search-control">
          <i className="fa fa-search" aria-hidden="true" />
          <input
            id="admin-products-search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tìm sách, tác giả..."
            aria-label="Tìm sách trong quản trị"
          />
        </label>
        <button className="outline-button" type="submit">
          Tìm sách
        </button>
        <span className="muted-count">
          {data?.totalCount ?? 0} đầu sách trong catalog
        </span>
      </form>
      {error && (
        <p role="alert" className="feedback-error">
          {error}
        </p>
      )}
      {loading ? (
        <PageSpinner />
      ) : (
        <div className="workspace-table-wrap">
          <table className="workspace-table admin-catalog-table">
            <thead>
              <tr>
                <th>Đầu sách / Tác giả</th>
                <th>Ngăn sách</th>
                <th>Giá bán</th>
                <th>Hiển thị</th>
                <th>Biên tập</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((book) => (
                <tr key={book.id}>
                  <td>
                    <Link
                      className="loan-table-book"
                      href={`/admin/products/${book.id}`}
                    >
                      <img src={imageSrc(book.imageUrl)} alt="" />
                      <span>
                        <strong>{book.name}</strong>
                        <small>{book.author ?? "Chưa có tác giả"}</small>
                      </span>
                    </Link>
                  </td>
                  <td>
                    {book.category.parent.name}
                    <small>{book.category.name}</small>
                  </td>
                  <td>
                    <strong>{formatPrice(book.price)}</strong>
                  </td>
                  <td>
                    <span
                      className={`loan-badge ${book.isActive ? "status-approved" : "status-cancelled"}`}
                    >
                      {book.isActive ? "Đang hiển thị" : "Đã ẩn"}
                    </span>
                  </td>
                  <td>
                    <div className="admin-book-actions">
                      <Link
                        id={`edit-product-${book.id}`}
                        href={`/admin/products/${book.id}`}
                      >
                        Biên tập{" "}
                        <i className="fa fa-pencil" aria-hidden="true" />
                      </Link>
                      {book.isActive &&
                        (confirm === book.id ? (
                          <>
                            <button
                              id={`confirm-hide-${book.id}`}
                              disabled={busy === book.id}
                              onClick={() => {
                                void hide(book.id);
                              }}
                            >
                              Xác nhận ẩn
                            </button>
                            <button onClick={() => setConfirm("")}>
                              Bỏ qua
                            </button>
                          </>
                        ) : (
                          <button
                            id={`hide-product-${book.id}`}
                            onClick={() => setConfirm(book.id)}
                          >
                            Ẩn sách
                          </button>
                        ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data?.items.length && (
            <div className="workspace-empty">Chưa có đầu sách phù hợp.</div>
          )}
        </div>
      )}
      {data && (
        <Pagination
          page={data.pageNumber}
          totalPages={data.totalPages}
          onChange={setPage}
        />
      )}
    </div>
  );
}
