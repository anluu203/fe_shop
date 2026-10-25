"use client";

/**
 * ImageUpload — Component chọn ảnh dùng chung cho admin và profile.
 *
 * Hỗ trợ hai cách:
 * 1. Upload file từ máy → gọi API upload → lấy imageUrl
 * 2. Nhập URL hosting công khai trực tiếp
 *
 * Sau khi có URL (từ upload hoặc nhập), gọi callback onChange(url)
 * để component cha gắn vào form và submit.
 */

import { USE_MOCK } from "../../lib/mock/config";
import { useRef, useState } from "react";
import { uploadImage, type ImageTarget } from "../../lib/api/images";
import { imageSrc } from "../../lib/utils/image";

interface ImageUploadProps {
  /** Loại ảnh để chọn đúng endpoint upload */
  target: ImageTarget;
  /** URL hiện tại (từ form state của component cha) */
  value: string;
  /** Gọi khi URL thay đổi (sau upload hoặc khi user nhập) */
  onChange: (url: string) => void;
  /** Label hiển thị phía trên */
  label?: string;
  /** placeholder cho ô nhập URL */
  placeholder?: string;
  /** ID dùng cho test hoặc truy cập */
  id?: string;
}

export default function ImageUpload({
  target,
  value,
  onChange,
  label = "Ảnh",
  placeholder = "https://example.com/image.jpg",
  id = "image-upload",
}: ImageUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [previewError, setPreviewError] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Kiểm tra định dạng trước khi upload
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowed.includes(file.type)) {
      setUploadError("Chỉ chấp nhận JPEG, PNG, GIF, WebP");
      return;
    }
    // Kiểm tra dung lượng (5 MB)
    if (file.size > (USE_MOCK ? 2 : 5) * 1024 * 1024) {
      setUploadError(`File không được vượt ${USE_MOCK ? 2 : 5} MB`);
      return;
    }

    setUploadError("");
    setUploading(true);
    setPreviewError(false);
    try {
      const { imageUrl } = await uploadImage(target, file);
      onChange(imageUrl);
    } catch (err: any) {
      setUploadError(err.message ?? "Upload thất bại");
    } finally {
      setUploading(false);
      // Reset input để có thể chọn lại cùng file
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const preview = imageSrc(value);

  return (
    <div>
      {label && (
        <label
          style={{
            fontSize: "calc(13px * var(--font-scale))",
            fontWeight: 600,
            color: "var(--text-secondary)",
            display: "block",
            marginBottom: 8,
          }}
        >
          {label}
        </label>
      )}

      {/* Preview ảnh */}
      {preview && !previewError && (
        <div
          style={{
            marginBottom: 12,
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
            border: "1.5px solid var(--border)",
            background: "var(--bg-section)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: 140,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Preview"
            style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain", padding: 8 }}
            onError={() => setPreviewError(true)}
          />
        </div>
      )}

      {/* Khu vực upload file */}
      <div
        style={{
          border: "2px dashed var(--border)",
          borderRadius: "var(--radius-md)",
          padding: "16px",
          textAlign: "center",
          background: uploading ? "var(--primary-bg)" : "var(--bg-section)",
          cursor: uploading ? "not-allowed" : "pointer",
          transition: "all var(--transition)",
          marginBottom: 10,
        }}
        onClick={() => !uploading && fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLDivElement).style.borderColor = "var(--primary)";
          (e.currentTarget as HTMLDivElement).style.background = "var(--primary-bg)";
        }}
        onDragLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
          (e.currentTarget as HTMLDivElement).style.background = "var(--bg-section)";
        }}
        onDrop={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
          (e.currentTarget as HTMLDivElement).style.background = "var(--bg-section)";
          const file = e.dataTransfer.files[0];
          if (file && fileRef.current) {
            // Tạo synthetic event giả để tái dùng handler
            const dt = new DataTransfer();
            dt.items.add(file);
            fileRef.current.files = dt.files;
            fileRef.current.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }}
      >
        <input
          ref={fileRef}
          id={`${id}-file`}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />

        {uploading ? (
          <div style={{ color: "var(--primary)", fontSize: "calc(13px * var(--font-scale))", fontWeight: 600 }}>
            <i className="fa fa-spinner fa-spin" style={{ marginRight: 6 }} />
            Đang upload...
          </div>
        ) : (
          <div>
            <div style={{ fontSize: "calc(24px * var(--font-scale))", color: "var(--text-muted)", marginBottom: 6 }}>
              <i className="fa fa-cloud-upload" />
            </div>
            <div style={{ fontSize: "calc(13px * var(--font-scale))", color: "var(--text-secondary)", fontWeight: 600 }}>
              Kéo thả hoặc <span style={{ color: "var(--primary)" }}>chọn file</span>
            </div>
            <div style={{ fontSize: "calc(11px * var(--font-scale))", color: "var(--text-muted)", marginTop: 4 }}>
              JPEG, PNG, GIF, WebP — tối đa {USE_MOCK ? 2 : 5} MB
            </div>
          </div>
        )}
      </div>

      {/* Hoặc nhập URL trực tiếp */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <div
          style={{
            flex: 1,
            height: 1,
            background: "var(--border)",
          }}
        />
        <span style={{ fontSize: "calc(11px * var(--font-scale))", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
          hoặc nhập URL
        </span>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
      </div>

      <div style={{ position: "relative" }}>
        <span
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--text-muted)",
            fontSize: "calc(14px * var(--font-scale))",
            pointerEvents: "none",
          }}
        >
          <i className="fa fa-link" />
        </span>
        <input
          id={id}
          type="text"
          inputMode="url"
          value={value}
          onChange={(e) => {
            setPreviewError(false);
            setUploadError("");
            onChange(e.target.value);
          }}
          placeholder={placeholder}
          style={{
            width: "100%",
            padding: "10px 12px 10px 36px",
            border: "1.5px solid var(--border)",
            borderRadius: "var(--radius-md)",
            fontSize: "calc(13px * var(--font-scale))",
            background: "var(--bg-card)",
            color: "var(--text-primary)",
            outline: "none",
            fontFamily: "var(--font-sans)",
            boxSizing: "border-box",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
        />
      </div>

      {/* Nút xóa ảnh */}
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange("");
            setPreviewError(false);
            setUploadError("");
          }}
          style={{
            marginTop: 8,
            fontSize: "calc(12px * var(--font-scale))",
            color: "var(--danger)",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
            padding: 0,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <i className="fa fa-times-circle" /> Xóa ảnh
        </button>
      )}

      {/* Upload error */}
      {uploadError && (
        <div
          style={{
            marginTop: 8,
            fontSize: "calc(12px * var(--font-scale))",
            color: "var(--danger)",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <i className="fa fa-exclamation-triangle" /> {uploadError}
        </div>
      )}
    </div>
  );
}
