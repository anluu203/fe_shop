"use client";

import Input from "../ui/Input";
import type { ProductBody } from "../../lib/types";
import { validISBN } from "../../lib/utils/books";

export const emptyBookFields = {
  isbn: "",
  discount: "0",
  author: "",
  publisher: "",
  publicationYear: "",
  pageCount: "",
  language: "Tiếng Việt",
  coverType: "Bìa mềm",
};
export type BookFieldValues = typeof emptyBookFields;
export function bookFieldBody(
  values: BookFieldValues,
): Pick<ProductBody, keyof BookFieldValues> {
  return {
    ...values,
    publicationYear: values.publicationYear
      ? Number(values.publicationYear)
      : null,
    pageCount: values.pageCount ? Number(values.pageCount) : null,
    discount: Number(values.discount || 0),
    isbn: values.isbn.trim().replace(/[-\s]/g, "").toUpperCase(),
  };
}
export function validateBookFields(values: BookFieldValues) {
  const isbn = values.isbn.trim().replace(/[-\s]/g, "").toUpperCase();
  if (isbn && !validISBN(isbn)) return "ISBN-10 hoặc ISBN-13 không hợp lệ.";
  if (!/^\d+(\.\d{1,2})?$/.test(values.discount || "0") || Number(values.discount) > 100) return "Giảm giá phải từ 0 đến 100%, tối đa 2 chữ số thập phân.";
  for (const [key, label] of [
    ["publicationYear", "Năm xuất bản"],
    ["pageCount", "Số trang"],
  ] as const) {
    if (
      values[key] &&
      (!Number.isSafeInteger(Number(values[key])) || Number(values[key]) < 1)
    )
      return `${label} phải là số nguyên dương.`;
  }
  return "";
}

export default function BookFields({
  values,
  onChange,
}: {
  values: BookFieldValues;
  onChange: (key: keyof BookFieldValues, value: string) => void;
}) {
  return (
    <fieldset className="book-fields">
      <legend>Thông tin xuất bản</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        {(
          [
            ["author", "Tác giả", "text"],
            ["publisher", "Nhà xuất bản", "text"],
            ["isbn", "ISBN (10 hoặc 13 ký tự)", "text"],
            ["discount", "Giảm giá (%) — giá bán đã gồm giảm giá", "number"],
            ["publicationYear", "Năm xuất bản", "number"],
            ["pageCount", "Số trang", "number"],
            ["language", "Ngôn ngữ", "text"],
            ["coverType", "Hình thức bìa", "text"],
          ] as const
        ).map(([key, label, type]) => (
          <Input
            key={key}
            id={`book-${key}`}
            label={label}
            type={type}
            min={key === "discount" ? 0 : type === "number" ? 1 : undefined}
            max={key === "discount" ? 100 : undefined}
            step={key === "discount" ? 0.01 : type === "number" ? 1 : undefined}
            value={values[key]}
            onChange={(e) => onChange(key, e.target.value)}
          />
        ))}
      </div>
    </fieldset>
  );
}
