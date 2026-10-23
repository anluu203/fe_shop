"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import content from "../../mock-data/site-content.json";
import { categoryApi } from "../../lib/api/categories";
import type { CategoryParent } from "../../lib/types";
import { subscribeMockData, USE_MOCK } from "../../lib/mock/config";
export default function Footer() {
  const [categories, setCategories] = useState<CategoryParent[]>([]);
  useEffect(() => {
    const load = () => {
      void categoryApi.getParents()
        .then((c) => {
          setCategories(c);
        })
        .catch(() => {});
    };
    load();
    return USE_MOCK ? subscribeMockData(load) : undefined;
  }, []);
  return (
    <footer className="book-footer">
      <div className="container footer-quote">
        <span>HẸN GẶP BẠN GIỮA NHỮNG TRANG SÁCH.</span>
        <p>
          Đọc để hiểu mình.<em> Chia sẻ để hiểu nhau.</em>
        </p>
      </div>
      <div className="container footer-main">
        <div className="footer-brand">
          <Link href="/client" className="brand-lockup">
            <img
              src="/images/bookstore-logo.svg"
              width="42"
              height="42"
              alt=""
            />
            <strong>
              BookStore<span>Đọc sách. Mở thế giới.</span>
            </strong>
          </Link>
          <p>
            Mỗi cuốn sách là một cánh cửa.
            <br />
            Cùng bạn tìm câu chuyện của riêng mình.
          </p>
          <div className="footer-contact">
            <a href={`mailto:${content.email}`}>
              <i className="fa fa-envelope-o" aria-hidden="true" />{" "}
              {content.email}
            </a>
            <a href={`tel:${content.phone.replace(/ /g, "")}`}>
              <i className="fa fa-phone" aria-hidden="true" /> {content.phone}
            </a>
          </div>
        </div>
        <div>
          <h3>Khám phá sách</h3>
          {categories.slice(0, 5).map((c) => (
            <Link key={c.id} href={`/client/products?parentId=${c.id}`}>
              {c.name}
            </Link>
          ))}
        </div>
        <div>
          <h3>Đồng hành cùng bạn</h3>
          <button className="footer-chat-link" type="button" onClick={() => window.dispatchEvent(new Event("bookstore:open-chat"))}>Tư vấn qua Chatbot AI</button>
          <Link href="/client/consultation">Tư vấn chọn sách</Link>
          <Link href="/client/warranty">Đổi trả sách</Link>
          <Link href="/client/orders">Theo dõi đơn hàng</Link>
          <Link href="/client/profile">Tài khoản của bạn</Link>
          <Link href="/client/cart">Giỏ hàng</Link>
        </div>
        <div>
          <h3>Thông tin liên hệ</h3>
          <p>{content.address}</p>
          <p>8:00 – 21:00 mỗi ngày</p>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© 2026 BookStore. Đọc hôm nay, khám phá ngày mai.</span>
        <span>
          <i className="fa fa-book" aria-hidden="true" /> {content.tagline}
        </span>
      </div>
    </footer>
  );
}
