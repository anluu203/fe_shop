import type { Product } from "../../lib/types";

export default function BookMetadata({ book }: { book: Product }) {
  return (
    <dl className="book-metadata">
      {(
        [
          ["Tác giả", book.author],
          ["Nhà xuất bản", book.publisher],
          ["Năm xuất bản", book.publicationYear],
          ["Số trang", book.pageCount],
          ["Ngôn ngữ", book.language],
          ["Hình thức bìa", book.coverType],
        ] as const
      ).map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value || "Đang cập nhật"}</dd>
        </div>
      ))}
    </dl>
  );
}
