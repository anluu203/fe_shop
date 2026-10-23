"use client";
import Link from "next/link";
import type { CategoryParent } from "../../lib/types";
export const CATEGORY_ICONS: Record<string, string> = {
  literature: "fa-book",
  business: "fa-line-chart",
  selfhelp: "fa-lightbulb-o",
  children: "fa-child",
  manga: "fa-comments-o",
  education: "fa-graduation-cap",
  language: "fa-language",
  history: "fa-university",
};
export function CategoryStrip({ parents }: { parents: CategoryParent[] }) {
  return (
    <section className="category-panel">
      <div className="category-heading">
        <span className="eyebrow">BẠN MUỐN ĐỌC GÌ HÔM NAY?</span>
        <h2>
          Mỗi sở thích,
          <br />
          <em>một ngăn sách.</em>
        </h2>
      </div>
      <div className="book-categories">
        {parents.map((parent, i) => (
          <Link
            href={`/client/products?parentId=${parent.id}`}
            key={parent.id}
            className="book-category"
          >
            <span>{(i + 1).toString().padStart(2, "0")}</span>
            <strong>{parent.name}</strong>
            <i className="fa fa-long-arrow-right" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  );
}
export function ViewAllLink({
  href,
  label,
  id,
}: {
  href: string;
  label: string;
  id: string;
}) {
  return (
    <Link href={href} id={id} className="view-all">
      {label}
      <i className="fa fa-long-arrow-right" aria-hidden="true" />
    </Link>
  );
}
export function CtaSection() {
  return (
    <section className="reading-cta">
      <span className="cta-glyph" aria-hidden="true">
        “
      </span>
      <div>
        <span className="eyebrow">MỘT CHÚT GỢI Ý, MỘT KHỞI ĐẦU MỚI</span>
        <h2>
          Cuốn sách tiếp theo
          <br />
          có thể thay đổi một ngày của bạn.
        </h2>
        <p>
          Kể cho BookStore nghe bạn đang tìm gì. Một câu chuyện nhẹ nhàng, một ý
          tưởng mới hay một kỹ năng cho ngày mai?
        </p>
        <button type="button" className="cta-chat-button" onClick={() => window.dispatchEvent(new Event("bookstore:open-chat"))}>
          Tìm sách dành cho tôi{" "}
          <i className="fa fa-long-arrow-right" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
