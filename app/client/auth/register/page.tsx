"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi } from "../../../../lib/api/auth";
import { useAuth } from "../../../../contexts/AuthContext";
import Input from "../../../../components/ui/Input";
import Button from "../../../../components/ui/Button";

export default function RegisterPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const validate = () => {
    const e: Partial<typeof form> = {};
    if (!form.username || form.username.length < 2)
      e.username = "Tên hiển thị phải ít nhất 2 ký tự";
    if (form.username.length > 100) e.username = "Tối đa 100 ký tự";
    if (!form.email) e.email = "Vui lòng nhập email";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Email không hợp lệ";
    if (!form.password || form.password.length < 8)
      e.password = "Mật khẩu ít nhất 8 ký tự";
    if (form.password !== form.confirm)
      e.confirm = "Mật khẩu xác nhận không khớp";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setApiError("");
    setLoading(true);
    try {
      const res = await authApi.register({
        username: form.username,
        email: form.email,
        password: form.password,
      });
      login(res.accessToken, res.user);
      router.push("/client");
    } catch (err: any) {
      setApiError(err.message ?? "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  };

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [field]: e.target.value });

  return (
    <div className="auth-view"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, var(--primary-bg) 0%, #fff 50%, var(--accent-bg) 100%)",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          background: "var(--bg-card)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-xl)",
          overflow: "hidden",
          animation: "fadeIn 0.4s ease",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)",
            padding: "32px 32px 28px",
            textAlign: "center",
          }}
        >
          <Link href="/client" style={{ textDecoration: "none" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 16,
              }}
            >
              <span
                style={{
                  fontSize: 28,
                  background: "rgba(255,255,255,0.15)",
                  width: 52,
                  height: 52,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "var(--radius-md)",
                  color: "#fff",
                }}
              >
                <i className="fa fa-bolt" />
              </span>
              <span
                style={{
                  fontSize: 26,
                  fontWeight: 900,
                  color: "#fff",
                  letterSpacing: "-0.5px",
                }}
              >
                BookStore
              </span>
            </div>
          </Link>
          <h1
            style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: 0 }}
          >
            Tạo tài khoản
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.75)",
              marginTop: 6,
            }}
          >
            Tham gia BookStore để mua sắm dễ dàng hơn!
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: "28px 32px 32px" }}>
          {apiError && (
            <div
              style={{
                background: "var(--danger-bg)",
                border: "1px solid var(--danger)",
                borderRadius: "var(--radius-md)",
                padding: "12px 16px",
                marginBottom: 20,
                fontSize: 14,
                color: "var(--danger)",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <i className="fa fa-exclamation-triangle" /> {apiError}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Input
              id="register-username"
              label="Tên hiển thị"
              placeholder="Nguyễn Văn A"
              value={form.username}
              onChange={update("username")}
              error={errors.username}
              icon={<i className="fa fa-user" style={{ color: "var(--text-muted)" }} />}
              autoComplete="name"
            />
            <Input
              id="register-email"
              type="email"
              label="Email"
              placeholder="user@example.com"
              value={form.email}
              onChange={update("email")}
              error={errors.email}
              icon={<i className="fa fa-envelope" style={{ color: "var(--text-muted)" }} />}
              autoComplete="email"
            />
            <Input
              id="register-password"
              type={showPass ? "text" : "password"}
              label="Mật khẩu"
              placeholder="Tối thiểu 8 ký tự"
              value={form.password}
              onChange={update("password")}
              error={errors.password}
              icon={<i className="fa fa-lock" style={{ color: "var(--text-muted)" }} />}
              autoComplete="new-password"
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 16,
                    color: "var(--text-muted)",
                  }}
                >
                  <i className={`fa ${showPass ? "fa-eye-slash" : "fa-eye"}`} />
                </button>
              }
            />
            <Input
              id="register-confirm"
              type={showPass ? "text" : "password"}
              label="Xác nhận mật khẩu"
              placeholder="Nhập lại mật khẩu"
              value={form.confirm}
              onChange={update("confirm")}
              error={errors.confirm}
              icon={<i className="fa fa-lock" style={{ color: "var(--text-muted)" }} />}
              autoComplete="new-password"
            />
          </div>

          <Button
            id="register-submit-btn"
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            style={{ marginTop: 24 }}
          >
            Tạo tài khoản
          </Button>

          <p
            style={{
              textAlign: "center",
              marginTop: 20,
              fontSize: 14,
              color: "var(--text-muted)",
            }}
          >
            Đã có tài khoản?{" "}
            <Link
              href="/client/auth/login"
              style={{
                color: "var(--primary)",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Đăng nhập
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
