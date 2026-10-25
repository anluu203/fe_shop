"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { productApi } from "../../../../lib/api/products";
import { categoryApi } from "../../../../lib/api/categories";
import type { Category, CategoryParent } from "../../../../lib/types";
import Input from "../../../../components/ui/Input";
import Button from "../../../../components/ui/Button";
import BookFields, { emptyBookFields, bookFieldBody, validateBookFields } from "../../../../components/admin/BookFields";
import { USE_MOCK } from "../../../../lib/mock/config";
import ImageUpload from "../../../../components/ui/ImageUpload";

export default function NewProductPage() {
  const router = useRouter();
  const [parents, setParents] = useState<CategoryParent[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedParent, setSelectedParent] = useState("");
  const [bookFields, setBookFields] = useState(emptyBookFields);
  const [form, setForm] = useState({
    name: "",
    description: "",
    imageUrl: "",
    price: "",
    categoryId: "",
  });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    Promise.all([categoryApi.getParents(), categoryApi.getAll()]).then(([p, c]) => {
      setParents(p);
      setCategories(c);
    });
  }, []);

  const filteredCats = selectedParent
    ? categories.filter((c) => c.parentId === selectedParent)
    : categories;

  const validate = () => {
    const e: Partial<typeof form> = {};
    if (!form.name.trim() || form.name.length > 200) e.name = "Tên 1–200 ký tự";
    if (!form.price || !/^\d+$/.test(form.price)) e.price = "Giá phải là số nguyên dương";
    if (form.price && form.price.length > 12) e.price = "Giá tối đa 12 chữ số";
    if (!form.categoryId) e.categoryId = "Vui lòng chọn danh mục";
    if (
      form.imageUrl &&
      !/^\/images\//.test(form.imageUrl) &&
      !/^https?:\/\/.+/.test(form.imageUrl) &&
      !(USE_MOCK && /^data:image\/(jpeg|png|gif|webp);base64,/.test(form.imageUrl))
    ) {
      e.imageUrl = "URL ảnh không hợp lệ";
    }
    const bookError = validateBookFields(bookFields);
    if (bookError) e.name = bookError;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setApiError("");
    try {
      await productApi.create({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        imageUrl: form.imageUrl.trim(),
        price: form.price,
        categoryId: form.categoryId,
        ...bookFieldBody(bookFields),
      });
      router.push("/admin/products");
    } catch (err: any) {
      setApiError(err.message ?? "Tạo sách thất bại");
    } finally {
      setSaving(false);
    }
  };

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [field]: e.target.value });

  return (
    <div style={{ maxWidth: 680 }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: "calc(13px * var(--font-scale))", color: "var(--text-muted)", marginBottom: 20, display: "flex", gap: 8 }}>
        <Link href="/admin/products" style={{ color: "var(--primary)", textDecoration: "none" }}>
          Sách
        </Link>
        <span>›</span>
        <span>Thêm mới</span>
      </div>

      <div
        style={{
          background: "var(--bg-card)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid var(--border)",
            background: "var(--primary-bg)",
          }}
        >
          <h2 style={{ fontSize: "calc(16px * var(--font-scale))", fontWeight: 800, color: "var(--primary-dark)" }}>
            <i className="fa fa-plus" style={{ marginRight: 6 }} /> Thêm sách mới
          </h2>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "28px 24px" }}>
          <BookFields values={bookFields} onChange={(key, value) => setBookFields({ ...bookFields, [key]: value })} />
          {apiError && (
            <div
              style={{
                background: "var(--danger-bg)",
                color: "var(--danger)",
                padding: "12px 16px",
                borderRadius: "var(--radius-md)",
                fontSize: "calc(13px * var(--font-scale))",
                fontWeight: 600,
                marginBottom: 20,
              }}
            >
              <i className="fa fa-exclamation-triangle" style={{ marginRight: 4 }} /> {apiError}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <Input
              id="product-name"
              label="Tên sách *"
              placeholder="Ví dụ: Cây cam ngọt của tôi"
              value={form.name}
              onChange={set("name")}
              error={errors.name}
            />

            <div>
              <label
                style={{
                  fontSize: "calc(13px * var(--font-scale))",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Mô tả
              </label>
              <textarea
                id="product-description"
                value={form.description}
                onChange={set("description")}
                placeholder="Mô tả chi tiết sách..."
                rows={4}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1.5px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "calc(14px * var(--font-scale))",
                  color: "var(--text-primary)",
                  background: "var(--bg-card)",
                  outline: "none",
                  resize: "vertical",
                  fontFamily: "var(--font-sans)",
                  lineHeight: 1.6,
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>

            <ImageUpload
              id="product-imageUrl"
              target="products"
              label="Ảnh sách"
              placeholder="https://example.com/product.jpg"
              value={form.imageUrl}
              onChange={(url) => setForm({ ...form, imageUrl: url })}
            />
            {errors.imageUrl && (
              <span style={{ fontSize: "calc(12px * var(--font-scale))", color: "var(--danger)", marginTop: -10, display: "block" }}>
                {errors.imageUrl}
              </span>
            )}

            <Input
              id="product-price"
              label="Giá (VND) *"
              placeholder="8000000"
              value={form.price}
              onChange={set("price")}
              error={errors.price}
              icon={<span style={{ fontWeight: 700 }}>₫</span>}
              type="text"
              inputMode="numeric"
            />

            {/* Category select */}
            <div>
              <label
                style={{
                  fontSize: "calc(13px * var(--font-scale))",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Danh mục cha
              </label>
              <select
                id="product-parent-category"
                value={selectedParent}
                onChange={(e) => {
                  setSelectedParent(e.target.value);
                  setForm({ ...form, categoryId: "" });
                }}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1.5px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "calc(14px * var(--font-scale))",
                  color: "var(--text-primary)",
                  background: "var(--bg-card)",
                  outline: "none",
                  fontFamily: "var(--font-sans)",
                  cursor: "pointer",
                  marginBottom: 12,
                }}
              >
                <option value="">-- Chọn danh mục cha --</option>
                {parents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <label
                style={{
                  fontSize: "calc(13px * var(--font-scale))",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Danh mục con *
              </label>
              <select
                id="product-category"
                value={form.categoryId}
                onChange={set("categoryId")}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: `1.5px solid ${errors.categoryId ? "var(--danger)" : "var(--border)"}`,
                  borderRadius: "var(--radius-md)",
                  fontSize: "calc(14px * var(--font-scale))",
                  color: "var(--text-primary)",
                  background: "var(--bg-card)",
                  outline: "none",
                  fontFamily: "var(--font-sans)",
                  cursor: "pointer",
                }}
              >
                <option value="">-- Chọn danh mục con --</option>
                {filteredCats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <span style={{ fontSize: "calc(12px * var(--font-scale))", color: "var(--danger)", marginTop: 4, display: "block" }}>
                  {errors.categoryId}
                </span>
              )}
            </div>

            {/* Price preview */}
            {form.price && /^\d+$/.test(form.price) && (
              <div
                style={{
                  padding: "12px 16px",
                  background: "var(--primary-bg)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "calc(14px * var(--font-scale))",
                  color: "var(--primary-dark)",
                  fontWeight: 600,
                }}
              >
                <i className="fa fa-money" style={{ marginRight: 6 }} /> Hiển thị: {parseInt(form.price).toLocaleString("vi-VN")} ₫
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
            <Button
              id="save-product-btn"
              type="submit"
              variant="primary"
              size="lg"
              loading={saving}
            >
              <i className="fa fa-floppy-o" style={{ marginRight: 6 }} /> Tạo sách
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => router.push("/admin/products")}
            >
              Hủy
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
