"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { productApi } from "../../../../lib/api/products";
import type { Product } from "../../../../lib/types";
import { subscribeMockData, USE_MOCK } from "../../../../lib/mock/config";
import { useAuth } from "../../../../contexts/AuthContext";
import { useCart } from "../../../../contexts/CartContext";
import { imageSrc } from "../../../../lib/utils/image";
import { formatPrice } from "../../../../lib/utils/format";
import BookMetadata from "../../../../components/client/BookMetadata";
import ProductReviews from "../../../../components/client/ProductReviews";
import { PageSpinner } from "../../../../components/ui/Spinner";
export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { addItem } = useCart();
  const [book, setBook] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");
  const [cartError, setCartError] = useState("");
  const [imgError, setImgError] = useState(false);
  useEffect(() => {
    let active = true;
    const load = () =>
      productApi.getOne(id)
        .then((product) => {
          if (active) {
            setBook(product);
            setError("");
          }
        })
        .catch((caught) => {
          if (active)
            setError(
              caught instanceof Error ? caught.message : "Không tìm thấy sách.",
            );
        })
        .finally(() => {
          if (active) setLoading(false);
        });
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
  }, [id]);
  async function add() {
    if (!user) {
      router.push("/client/auth/login");
      return;
    }
    setAdding(true);
    setCartError("");
    try {
      await addItem(id, qty);
      setAdded(true);
    } catch (caught) {
      setCartError(
        caught instanceof Error ? caught.message : "Không thể thêm sách.",
      );
    } finally {
      setAdding(false);
    }
  }
  if (loading) return <PageSpinner />;
  if (error || !book)
    return (
      <div className="container workspace-empty">
        <h1>Cuốn sách chưa sẵn sàng.</h1>
        <p>{error}</p>
        <Link className="solid-button" href="/client/products">
          Quay lại kệ sách
        </Link>
      </div>
    );
  return (
    <div className="container book-detail-page">
      <nav className="detail-breadcrumb" aria-label="Đường dẫn">
        <Link href="/client">BookStore</Link>
        <span>/</span>
        <Link href={`/client/products?parentId=${book.category.parentId}`}>
          {book.category.parent.name}
        </Link>
        <span>/</span>
        <span>{book.name}</span>
      </nav>
      <div className="detail-new-layout">
        <div className="detail-cover-stage">
          <span className="eyebrow">MỘT CUỐN SÁCH ĐANG CHỜ BẠN</span>
          {book.imageUrl && !imgError ? (
            <img
              src={imageSrc(book.imageUrl)}
              alt={book.name}
              onError={() => setImgError(true)}
            />
          ) : (
            <i className="fa fa-book" aria-hidden="true" />
          )}
          <div className="cover-stage-note">
            <span>BOOKSTORE SELECTION</span>
            <i className="fa fa-bookmark-o" aria-hidden="true" />
          </div>
        </div>
        <section className="detail-story">
          <span className="eyebrow">{book.category.name}</span>
          <h1>{book.name}</h1>
          <p className="detail-byline">
            Một cuốn sách của{" "}
            <strong>{book.author || "Tác giả đang cập nhật"}</strong>
          </p>
          <div className="detail-price-row">
            <strong>{formatPrice(book.price)}</strong>
            <span>Giá đã bao gồm VAT</span>
          </div>
          <div className="detail-purchase">
            <div className="quantity-control">
              <button
                aria-label="Giảm số lượng"
                disabled={qty <= 1}
                onClick={() => setQty(qty - 1)}
              >
                −
              </button>
              <span>{qty}</span>
              <button
                aria-label="Tăng số lượng"
                disabled={qty >= 999}
                onClick={() => setQty(qty + 1)}
              >
                +
              </button>
            </div>
            <button
              className="solid-button"
              id="add-to-cart-detail-btn"
              disabled={adding}
              onClick={() => {
                void add();
              }}
            >
              {adding
                ? "Đang thêm..."
                : added
                  ? "Đã thêm — thêm tiếp"
                  : "Thêm vào giỏ sách"}
              <i
                className={`fa ${added ? "fa-check" : "fa-shopping-bag"}`}
                aria-hidden="true"
              />
            </button>
          </div>
          {cartError && (
            <p role="alert" className="feedback-error">
              {cartError}
            </p>
          )}
          <button type="button" className="outline-button" onClick={() => window.dispatchEvent(new Event("bookstore:open-chat"))}><i className="fa fa-comments-o" aria-hidden="true" />Nhờ Chatbot AI tư vấn chọn sách</button>
          <BookMetadata book={book} />
          <div className="detail-promises">
            <span>
              <i className="fa fa-check-circle-o" aria-hidden="true" /> Sách
              chính hãng
            </span>
            <span>
              <i className="fa fa-truck" aria-hidden="true" /> Giao hàng toàn
              quốc
            </span>
            <Link href="/client/warranty">
              <i className="fa fa-refresh" aria-hidden="true" /> Hỗ trợ đổi trả
            </Link>
          </div>
        </section>
      </div>
      <section className="book-description-section">
        <span className="eyebrow">TRƯỚC KHI LẬT TRANG ĐẦU TIÊN</span>
        <div>
          <h2>Câu chuyện trong cuốn sách.</h2>
          <p>
            {book.description ||
              "Nhà sách đang chuẩn bị lời giới thiệu cho cuốn sách này."}
          </p>
          <Link href="/client/products" className="view-all">
            Ghé những ngăn sách khác{" "}
            <i className="fa fa-long-arrow-right" aria-hidden="true" />
          </Link>
        </div>
      </section>
      <ProductReviews key={id} bookId={id} />
    </div>
  );
}
