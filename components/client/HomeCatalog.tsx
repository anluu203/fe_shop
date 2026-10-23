"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { categoryApi } from "../../lib/api/categories";
import { productApi } from "../../lib/api/products";
import { subscribeMockData, USE_MOCK } from "../../lib/mock/config";
import type { CategoryParent, Product } from "../../lib/types";
import content from "../../mock-data/site-content.json";
import HeroBanner from "./HeroBanner";
import ProductCard from "./ProductCard";
import { CategoryStrip, CtaSection, ViewAllLink } from "./HomeInteractive";
export default function HomeCatalog({
  initialProducts,
  initialParents,
}: {
  initialProducts: Product[];
  initialParents: CategoryParent[];
}) {
  const [books, setBooks] = useState(initialProducts);
  const [parents, setParents] = useState(initialParents);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const refresh = () =>
      Promise.all([
        productApi.getAll({ pageSize: 100 }),
        categoryApi.getParents(),
      ])
        .then(([page, categories]) => {
          if (active) {
            setBooks(page.items.filter((b) => b.isActive));
            setParents(categories);
            setError("");
          }
        })
        .catch(() => {
          if (active)
            setError("Chưa tải được tủ sách. Vui lòng thử tải lại trang.");
        });
    void refresh();
    const unsubscribe = USE_MOCK
      ? subscribeMockData(() => {
          void refresh();
        })
      : () => {};
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);
  return (
    <div className="container bookstore-home">
      <HeroBanner books={books} />
      <section className="reading-paths" aria-label="Cách đọc cùng BookStore">
        <Link href="/client/products">
          <span>01</span>
          <div>
            <strong>Để dành trên kệ nhà.</strong>
            <p>Chọn mua cuốn sách bạn yêu thích.</p>
          </div>
          <i className="fa fa-long-arrow-right" aria-hidden="true" />
        </Link>
        <button type="button" className="reading-path-chat" onClick={() => window.dispatchEvent(new Event("bookstore:open-chat"))}>
          <span>02</span>
          <div>
            <strong>Tìm cuốn sách dành riêng cho bạn.</strong>
            <p>Trò chuyện cùng trợ lý chọn sách AI.</p>
          </div>
          <i className="fa fa-long-arrow-right" aria-hidden="true" />
        </button>
        <Link href="/client/consultation">
          <span>03</span>
          <div>
            <strong>Chưa biết bắt đầu từ đâu?</strong>
            <p>Để BookStore gợi ý cho bạn.</p>
          </div>
          <i className="fa fa-long-arrow-right" aria-hidden="true" />
        </Link>
      </section>
      {error && (
        <p role="alert" className="catalog-error">
          {error}
        </p>
      )}
      <CategoryStrip parents={parents} />
      {content.sections.map((section, sectionIndex) => {
        const customBooks =
          section.id === "new"
            ? books.filter((b) => !/^book-\d{2}$/.test(b.id)).slice(0, 4)
            : [];
        const selection = [
          ...customBooks,
          ...section.bookIds
            .map((id) => books.find((b) => b.id === id))
            .filter((book): book is Product => !!book),
        ].slice(0, 8);
        return (
          <section
            key={section.id}
            className={`home-panel home-books section-${section.id}`}
            aria-labelledby={`heading-${section.id}`}
          >
            <div className="book-section-heading">
              <div>
                <span className="eyebrow">
                  TUYỂN CHỌN / 0{sectionIndex + 1}
                </span>
                <h2 id={`heading-${section.id}`}>{section.title}</h2>
                <p>{section.subtitle}</p>
              </div>
              <ViewAllLink
                href="/client/products"
                label="Xem tất cả"
                id={`view-all-${section.id}`}
              />
            </div>
            {selection.length ? (
              <div className="book-grid">
                {selection.map((book) => (
                  <ProductCard key={book.id} product={book} />
                ))}
              </div>
            ) : (
              <p className="book-empty">
                Tủ sách đang được cập nhật. Mời bạn ghé lại sau.
              </p>
            )}
          </section>
        );
      })}
      <section className="shared-reading">
        <div className="shared-symbol" aria-hidden="true">
          ↗
        </div>
        <div>
          <span className="eyebrow">ĐỒNG HÀNH CÙNG NGƯỜI ĐỌC</span>
          <h2>
            Một câu chuyện hay
            <br />
            bắt đầu từ một gợi ý nhỏ.
          </h2>
          <p>
            Chia sẻ sở thích, chủ đề và ngân sách. Trợ lý của BookStore sẽ giúp
            bạn tìm sách trong danh mục và hướng dẫn khi bạn cần hỗ trợ đơn mua.
          </p>
        </div>
        <button type="button" className="solid-button" onClick={() => window.dispatchEvent(new Event("bookstore:open-chat"))}>
          Trò chuyện cùng BookStore AI{" "}
          <i className="fa fa-long-arrow-right" aria-hidden="true" />
        </button>
      </section>
      <CtaSection />
    </div>
  );
}
