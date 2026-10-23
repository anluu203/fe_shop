"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../contexts/AuthContext";
import { authApi } from "../../../lib/api/auth";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import { PageSpinner } from "../../../components/ui/Spinner";
import { formatDate } from "../../../lib/utils/format";
import ImageUpload from "../../../components/ui/ImageUpload";
import { imageSrc } from "../../../lib/utils/image";

export default function ProfilePage() {
  const { user, isLoading: authLoading, updateUser, logout } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [avatarSuccess, setAvatarSuccess] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.push("/client/auth/login");
    if (user) {
      setUsername(user.username);
      setAvatarUrl(user.avatarUrl ?? "");
    }
  }, [user, authLoading]);

  if (authLoading) return <PageSpinner />;
  if (!user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || username.length < 2) {
      setError("Tên phải ít nhất 2 ký tự");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const updated = await authApi.updateMe({ username: username.trim() });
      updateUser(updated);
      setSuccess("Cập nhật thành công!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message ?? "Cập nhật thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAvatar = async () => {
    setAvatarSaving(true);
    setAvatarError("");
    setAvatarSuccess("");
    try {
      const updated = await authApi.updateAvatar(avatarUrl.trim() || null);
      updateUser(updated);
      setAvatarUrl(updated.avatarUrl ?? "");
      setAvatarSuccess("Đổi ảnh đại diện thành công!");
      setTimeout(() => setAvatarSuccess(""), 3000);
    } catch (err: any) {
      setAvatarError(err.message ?? "Cập nhật ảnh thất bại");
    } finally {
      setAvatarSaving(false);
    }
  };

  const currentAvatarSrc = imageSrc(user.avatarUrl);

  return (
    <div style={{ background: "var(--bg-page)", minHeight: "100vh" }}>
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)",
          padding: "32px 0",
        }}
      >
        <div className="container">
          <h1
            style={{
              fontSize: 26,
              fontWeight: 900,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            {/* Avatar hiển thị trong header */}
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                overflow: "hidden",
                flexShrink: 0,
                border: "2px solid rgba(255,255,255,0.5)",
              }}
            >
              {currentAvatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentAvatarSrc}
                  alt={user.username}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <i className="fa fa-user" />
              )}
            </div>
            {user.username}
          </h1>
          <p style={{ color: "rgba(255,255,255,0.75)", marginTop: 6, fontSize: 14 }}>
            {user.email} · {user.role === "ADMIN" ? "Quản trị viên" : "Thành viên"}
          </p>
        </div>
      </div>

      <div
        className="container profile-layout"
        style={{
          padding: "32px 32px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
          alignItems: "start",
        }}
      >
        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Edit profile */}
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
              <h2
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: "var(--primary-dark)",
                }}
              >
                <i className="fa fa-pencil" style={{ marginRight: 6 }} /> Chỉnh sửa hồ sơ
              </h2>
            </div>
            <form onSubmit={handleSave} style={{ padding: "24px" }}>
              {error && (
                <div
                  style={{
                    background: "var(--danger-bg)",
                    color: "var(--danger)",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-md)",
                    fontSize: 13,
                    marginBottom: 16,
                    fontWeight: 600,
                  }}
                >
                  <i className="fa fa-exclamation-triangle" style={{ marginRight: 4 }} /> {error}
                </div>
              )}
              {success && (
                <div
                  style={{
                    background: "var(--success-bg)",
                    color: "#15803d",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-md)",
                    fontSize: 13,
                    marginBottom: 16,
                    fontWeight: 600,
                    animation: "fadeIn 0.3s ease",
                  }}
                >
                  <i className="fa fa-check-circle" style={{ marginRight: 4 }} /> {success}
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Input
                  id="profile-username"
                  label="Tên hiển thị"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  icon={<i className="fa fa-user" />}
                />
                <div>
                  <label
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                      display: "block",
                      marginBottom: 6,
                    }}
                  >
                    Email
                  </label>
                  <div
                    style={{
                      padding: "10px 12px",
                      background: "var(--bg-section)",
                      borderRadius: "var(--radius-md)",
                      border: "1.5px solid var(--border)",
                      fontSize: 14,
                      color: "var(--text-muted)",
                    }}
                  >
                    {user.email}
                  </div>
                  <p style={{ fontSize: 11, color: "var(--text-disabled)", marginTop: 4 }}>
                    Email không thể thay đổi hiện tại
                  </p>
                </div>
              </div>
              <Button
                id="save-profile-btn"
                type="submit"
                loading={saving}
                style={{ marginTop: 20 }}
              >
                <i className="fa fa-floppy-o" style={{ marginRight: 6 }} /> Lưu thay đổi
              </Button>
            </form>
          </div>

          {/* Avatar upload */}
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
              <h2
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: "var(--primary-dark)",
                }}
              >
                <i className="fa fa-camera" style={{ marginRight: 6 }} /> Ảnh đại diện
              </h2>
            </div>
            <div style={{ padding: "24px" }}>
              {avatarError && (
                <div
                  style={{
                    background: "var(--danger-bg)",
                    color: "var(--danger)",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-md)",
                    fontSize: 13,
                    marginBottom: 16,
                    fontWeight: 600,
                  }}
                >
                  <i className="fa fa-exclamation-triangle" style={{ marginRight: 4 }} /> {avatarError}
                </div>
              )}
              {avatarSuccess && (
                <div
                  style={{
                    background: "var(--success-bg)",
                    color: "#15803d",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-md)",
                    fontSize: 13,
                    marginBottom: 16,
                    fontWeight: 600,
                    animation: "fadeIn 0.3s ease",
                  }}
                >
                  <i className="fa fa-check-circle" style={{ marginRight: 4 }} /> {avatarSuccess}
                </div>
              )}
              <ImageUpload
                id="profile-avatar"
                target="avatars"
                label="Chọn ảnh đại diện"
                placeholder="https://example.com/avatar.jpg"
                value={avatarUrl}
                onChange={setAvatarUrl}
              />
              <Button
                id="save-avatar-btn"
                loading={avatarSaving}
                onClick={handleSaveAvatar}
                style={{ marginTop: 16 }}
              >
                <i className="fa fa-check" style={{ marginRight: 6 }} /> Lưu ảnh đại diện
              </Button>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
                background: "var(--bg-section)",
              }}
            >
              <h2 style={{ fontSize: 15, fontWeight: 800, color: "var(--text-secondary)" }}>
                <i className="fa fa-info-circle" style={{ marginRight: 6 }} /> Thông tin tài khoản
              </h2>
            </div>
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { label: "ID tài khoản", value: user.id.slice(0, 8) + "..." },
                { label: "Vai trò", value: user.role === "ADMIN" ? "Quản trị viên" : "Thành viên" },
                { label: "Ngày tạo", value: formatDate(user.createdAt) },
                { label: "Cập nhật lần cuối", value: formatDate(user.updatedAt) },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingBottom: 12,
                    borderBottom: "1px solid var(--border)",
                    gap: 12,
                  }}
                >
                  <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    {item.label}
                  </span>
                  <span
                    style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick links */}
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
                background: "var(--bg-section)",
              }}
            >
              <h2 style={{ fontSize: 15, fontWeight: 800, color: "var(--text-secondary)" }}>
                <i className="fa fa-link" style={{ marginRight: 6 }} /> Liên kết nhanh
              </h2>
            </div>
            <div style={{ padding: "12px 8px" }}>
              {[
                { icon: "fa-archive", label: "Đơn hàng của tôi", href: "/client/orders" },
                { icon: "fa-shopping-cart", label: "Giỏ hàng", href: "/client/cart" },
                ...(user.role === "ADMIN"
                  ? [{ icon: "fa-cog", label: "Quản trị viên", href: "/admin" }]
                  : []),
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 16px",
                    borderRadius: "var(--radius-md)",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    textDecoration: "none",
                    transition: "all var(--transition)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.background =
                      "var(--primary-bg)";
                    (e.currentTarget as HTMLAnchorElement).style.color =
                      "var(--primary)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.background =
                      "none";
                    (e.currentTarget as HTMLAnchorElement).style.color =
                      "var(--text-primary)";
                  }}
                >
                  <i className={`fa ${item.icon}`} style={{ fontSize: 18, width: 20, textAlign: "center", color: "var(--primary)" }} />
                  {item.label}
                  <span style={{ marginLeft: "auto", color: "var(--text-muted)" }}>
                    <i className="fa fa-angle-right" />
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
