"use client";
import Link from "next/link";
import type { Product } from "../../lib/types";
import { imageSrc } from "../../lib/utils/image";
export default function HeroBanner({ books = [] }: { books?: Product[] }) {
  const featured = books.find((b) => b.id === "book-13") ?? books[0];
  const companions = books.filter((b) => b.id !== featured?.id).slice(0, 2);
  return (
    <section className="journal-hero">
      <div className="journal-copy">
        <span className="eyebrow">
          <span className="tiny-line" /> MỘT KHÔNG GIAN DÀNH CHO SÁCH
        </span>
        <h1>
          Chạm vào trang sách.
          <br />
          <em>Mở rộng thế giới.</em>
        </h1>
        <p>
          Có những cuốn sách để sở hữu. Có những câu chuyện để chuyền tay. Tìm
          một cuốn dành cho bạn, theo cách bạn muốn đọc.
        </p>
        <div className="journal-actions">
          <Link className="solid-button" href="/client/products">
            Khám phá kệ sách{" "}
            <i className="fa fa-long-arrow-right" aria-hidden="true" />
          </Link>
          <button type="button" className="editorial-link" onClick={() => window.dispatchEvent(new Event("bookstore:open-chat"))}>
            Nhờ AI gợi ý sách{" "}
            <i className="fa fa-arrow-up" aria-hidden="true" />
          </button>
        </div>
        <div className="hero-footnote">
          <span>01 / MỖI NGÀY MỘT TRANG MỚI</span>
          <p>
            Không cần vội.
            <br />
            Cuốn sách hay vẫn luôn ở đây.
          </p>
        </div>
      </div>
      <div className="journal-art">
        <div className="art-circle" />
        <span className="art-annotation">
          Đọc chậm.
          <br />
          Sống sâu.
        </span>
        {featured && (
          <Link
            className="journal-featured"
            href={`/client/products/${featured.id}`}
          >
            <img
              src={imageSrc(featured.imageUrl)}
              alt={featured.name}
              width="220"
              height="310"
            />
          </Link>
        )}
        {companions.map((book, i) => (
          <img
            className={`journal-companion companion-${i}`}
            key={book.id}
            src={imageSrc(book.imageUrl)}
            alt=""
            aria-hidden="true"
          />
        ))}
        <div className="featured-caption">
          <span>CUỐN SÁCH TRÊN BÀN</span>
          <strong>{featured?.name ?? "Tủ sách đang được cập nhật"}</strong>
          <small>{featured?.author}</small>
          <i className="fa fa-bookmark-o" aria-hidden="true" />
        </div>
        <span className="art-side-note">BOOKSTORE READING CLUB · 2026</span>
      </div>
    </section>
  );
}
