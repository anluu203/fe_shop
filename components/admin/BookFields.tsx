"use client";

import Input from "../ui/Input";
import type { ProductBody } from "../../lib/types";

export const emptyBookFields = {
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
  };
}
export function validateBookFields(values: BookFieldValues) {
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
            min={type === "number" ? 1 : undefined}
            step={type === "number" ? 1 : undefined}
            value={values[key]}
            onChange={(e) => onChange(key, e.target.value)}
          />
        ))}
      </div>
    </fieldset>
  );
}
