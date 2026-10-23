"use client";

import { useEffect, useState } from "react";
import { adminChatbotApi } from "../../../lib/api/chatbot";
import type { AIConfig, ChatLog } from "../../../lib/types/chatbot";
import { subscribeMockData, USE_MOCK } from "../../../lib/mock/config";
import { formatDate } from "../../../lib/utils/format";
import { PageSpinner } from "../../../components/ui/Spinner";

export default function AdminChatbotPage() {
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [logs, setLogs] = useState<ChatLog[]>([]);
  const [tab, setTab] = useState<"config" | "logs">("config");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<ChatLog | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  useEffect(() => {
    let active = true;
    void Promise.all([adminChatbotApi.getConfig(), adminChatbotApi.getLogs()])
      .then(([c, l]) => {
        if (active) {
          setConfig(c);
          setLogs(l);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    const unsubscribe = USE_MOCK
      ? subscribeMockData(() => {
          // Keep unsaved configuration and notes intact when a new chat arrives.
          void adminChatbotApi
            .getLogs()
            .then((l) => {
              if (active) setLogs(l);
            })
            .catch((e) => {
              if (active) setError(e.message);
            });
        })
      : () => {};
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);
  async function saveConfig(e: React.FormEvent) {
    e.preventDefault();
    if (!config || saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const {
        enabled,
        botName,
        welcomeMessage,
        fallbackMessage,
        systemPrompt,
        model,
        temperature,
        maxSuggestions,
        supportContact,
      } = config;
      const body = {
        enabled,
        botName,
        welcomeMessage,
        fallbackMessage,
        systemPrompt,
        model,
        temperature,
        maxSuggestions,
        supportContact,
      };
      setConfig(await adminChatbotApi.updateConfig(body));
      setSuccess("Đã lưu cấu hình chatbot.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Không lưu được cấu hình.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function saveLog(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const updated = await adminChatbotApi.updateLog(selected.id, {
        resolved: selected.resolved,
        adminNote: selected.adminNote,
      });
      setLogs((items) => items.map((l) => (l.id === updated.id ? updated : l)));
      setSelected(updated);
      setSuccess("Đã cập nhật tình trạng chăm sóc khách hàng.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Không lưu được hội thoại.",
      );
    } finally {
      setSaving(false);
    }
  }
  if (loading) return <PageSpinner />;
  const filtered = logs.filter(
    (l) =>
      (status === "all" ||
        (status === "pending" ? l.needsHuman && !l.resolved : l.resolved)) &&
      `${l.customerName} ${l.question} ${l.answer} ${l.sessionId}`
        .toLocaleLowerCase("vi")
        .includes(search.toLocaleLowerCase("vi")),
  );
  const sessions = selected
    ? logs
        .filter((l) => l.sessionId === selected.sessionId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    : [];
  return (
    <div className="feature-page">
      <p className="feature-intro">
        Thiết lập trợ lý chọn sách, xem lịch sử tư vấn và theo dõi các yêu cầu
        cần nhân viên chăm sóc.
      </p>
      <div className="feature-stats">
        <article>
          <span>Cuộc trò chuyện</span>
          <strong>{new Set(logs.map((l) => l.sessionId)).size}</strong>
        </article>
        <article>
          <span>Lượt hỏi đáp</span>
          <strong>{logs.length}</strong>
        </article>
        <article>
          <span>Cần hỗ trợ</span>
          <strong>
            {logs.filter((l) => l.needsHuman && !l.resolved).length}
          </strong>
        </article>
        <article>
          <span>Đã xử lý</span>
          <strong>{logs.filter((l) => l.resolved).length}</strong>
        </article>
      </div>
      <div className="feature-tabs" role="tablist" aria-label="Quản lý chatbot">
        <button
          type="button"
          id="config-tab"
          role="tab"
          aria-controls="config-panel"
          aria-selected={tab === "config"}
          onClick={() => setTab("config")}
        >
          Cấu hình chatbot
        </button>
        <button
          type="button"
          id="logs-tab"
          role="tab"
          aria-controls="logs-panel"
          aria-selected={tab === "logs"}
          onClick={() => setTab("logs")}
        >
          Lịch sử & chăm sóc khách hàng
        </button>
      </div>
      {error && (
        <p className="feature-error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="feature-success" role="status">
          {success}
        </p>
      )}
      {!config && (
        <button
          type="button"
          className="outline-button"
          onClick={() => window.location.reload()}
        >
          Tải lại dữ liệu
        </button>
      )}
      {tab === "config" && config && (
        <section
          id="config-panel"
          role="tabpanel"
          aria-labelledby="config-tab"
          className="workspace-panel feature-panel"
        >
          <form className="feature-form" onSubmit={saveConfig}>
            <div className="panel-heading">
              <div>
                <span className="eyebrow">TRỢ LÝ CỦA NHÀ SÁCH</span>
                <h2>Cấu hình Chatbot AI</h2>
              </div>
              <label className="feature-toggle">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  disabled={saving}
                  onChange={(e) =>
                    setConfig({ ...config, enabled: e.target.checked })
                  }
                />
                {config.enabled ? "Đang hoạt động" : "Tạm dừng"}
              </label>
            </div>
            <fieldset disabled={saving} className="feature-fieldset">
              <div className="feature-form-grid">
                <label>
                  Tên trợ lý
                  <input
                    required
                    maxLength={80}
                    value={config.botName}
                    onChange={(e) =>
                      setConfig({ ...config, botName: e.target.value })
                    }
                  />
                </label>
                <label>
                  Liên hệ hỗ trợ
                  <input
                    required
                    maxLength={254}
                    value={config.supportContact}
                    onChange={(e) =>
                      setConfig({ ...config, supportContact: e.target.value })
                    }
                  />
                </label>
              </div>
              <label>
                Lời chào mở đầu
                <textarea
                  required
                  maxLength={1000}
                  rows={3}
                  value={config.welcomeMessage}
                  onChange={(e) =>
                    setConfig({ ...config, welcomeMessage: e.target.value })
                  }
                />
              </label>
              <label>
                Thông báo khi chưa tìm được câu trả lời
                <textarea
                  required
                  maxLength={1000}
                  rows={3}
                  value={config.fallbackMessage}
                  onChange={(e) =>
                    setConfig({ ...config, fallbackMessage: e.target.value })
                  }
                />
              </label>
              <label>
                Số sách gợi ý mỗi lượt
                <input
                  type="number"
                  required
                  min={1}
                  max={5}
                  step={1}
                  value={config.maxSuggestions}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      maxSuggestions: Number(e.target.value),
                    })
                  }
                />
              </label>
              <div className="feature-note">
                {USE_MOCK
                  ? "Chế độ demo dùng quy tắc tìm sách trong catalog. Model, temperature và hướng dẫn AI bên dưới được lưu để tích hợp backend; chúng chưa điều khiển câu trả lời demo."
                  : "Backend dùng model và hướng dẫn này khi gọi dịch vụ AI. Khóa API được cấu hình riêng trên server."}
              </div>
              <div className="feature-form-grid">
                <label>
                  Model trên backend
                  <input
                    required
                    maxLength={100}
                    value={config.model}
                    onChange={(e) =>
                      setConfig({ ...config, model: e.target.value })
                    }
                  />
                </label>
                <label>
                  Temperature (0–2)
                  <input
                    type="number"
                    required
                    min={0}
                    max={2}
                    step={0.01}
                    value={config.temperature}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        temperature: Number(e.target.value),
                      })
                    }
                  />
                </label>
              </div>
              <label>
                Hướng dẫn cho AI (system prompt)
                <textarea
                  required
                  maxLength={6000}
                  rows={6}
                  value={config.systemPrompt}
                  onChange={(e) =>
                    setConfig({ ...config, systemPrompt: e.target.value })
                  }
                />
              </label>
            </fieldset>
            <div className="feature-actions">
              <small>Cập nhật: {formatDate(config.updatedAt)}</small>
              <button type="submit" className="solid-button" disabled={saving}>
                {saving ? "Đang lưu…" : "Lưu cấu hình"}
              </button>
            </div>
          </form>
        </section>
      )}
      {tab === "logs" && (
        <section
          id="logs-panel"
          role="tabpanel"
          aria-labelledby="logs-tab"
          className="workspace-panel feature-panel"
        >
          <div className="feature-toolbar">
            <input
              aria-label="Tìm hội thoại"
              placeholder="Tìm khách hàng, nội dung, mã phiên…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              aria-label="Lọc tình trạng chăm sóc"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">Tất cả lượt hỏi đáp</option>
              <option value="pending">Cần hỗ trợ, chưa xử lý</option>
              <option value="resolved">Đã xử lý</option>
            </select>
            <button
              type="button"
              className="outline-button"
              onClick={async () => {
                try {
                  setLogs(await adminChatbotApi.getLogs());
                  setError("");
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : "Không tải được lịch sử.",
                  );
                }
              }}
            >
              Làm mới
            </button>
          </div>
          <div className="workspace-table-wrap">
            <table className="workspace-table">
              <thead>
                <tr>
                  <th>Khách hàng / thời gian</th>
                  <th>Nội dung</th>
                  <th>Trạng thái</th>
                  <th>Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 200).map((log) => (
                  <tr key={log.id}>
                    <td>
                      <strong>{log.customerName}</strong>
                      <small className="feature-block">
                        {formatDate(log.createdAt)}
                      </small>
                    </td>
                    <td className="chat-log-question">{log.question}</td>
                    <td>
                      <span
                        className={`feature-pill ${log.needsHuman && !log.resolved ? "attention" : ""}`}
                      >
                        {log.resolved
                          ? "Đã xử lý"
                          : log.needsHuman
                            ? "Cần hỗ trợ"
                            : "Đã tư vấn"}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="outline-button"
                        disabled={saving}
                        onClick={() => {
                          setSelected(log);
                          setSuccess("");
                        }}
                      >
                        Xem hội thoại
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!filtered.length && (
            <p className="workspace-empty">
              Chưa có hội thoại phù hợp. Tin nhắn từ cửa sổ chat sẽ xuất hiện
              tại đây.
            </p>
          )}
          {filtered.length > 200 && (
            <p>
              Đang hiển thị 200/{filtered.length} lượt hỏi đáp. Hãy tìm kiếm để
              thu hẹp kết quả.
            </p>
          )}
          {selected && (
            <form className="feature-form chat-log-detail" onSubmit={saveLog}>
              <div className="panel-heading">
                <h3>Hội thoại của {selected.customerName}</h3>
                <button
                  className="outline-button"
                  type="button"
                  disabled={saving}
                  onClick={() => setSelected(null)}
                >
                  Đóng chi tiết
                </button>
              </div>
              <small>Mã phiên: {selected.sessionId}</small>
              <div className="admin-chat-transcript">
                {sessions.map((log) => (
                  <article
                    key={log.id}
                    className={log.id === selected.id ? "selected-turn" : ""}
                  >
                    <small>
                      {formatDate(log.createdAt)}
                      {log.id === selected.id ? " · Lượt đang xử lý" : ""}
                    </small>
                    <p>
                      <strong>Khách: </strong>
                      {log.question}
                    </p>
                    <p>
                      <strong>Trợ lý: </strong>
                      {log.answer}
                    </p>
                  </article>
                ))}
              </div>
              <label>
                Ghi chú nội bộ cho lượt đã chọn
                <textarea
                  maxLength={2000}
                  rows={3}
                  disabled={saving}
                  value={selected.adminNote}
                  onChange={(e) =>
                    setSelected({ ...selected, adminNote: e.target.value })
                  }
                />
              </label>
              <label className="feature-toggle">
                <input
                  type="checkbox"
                  checked={selected.resolved}
                  disabled={saving}
                  onChange={(e) =>
                    setSelected({ ...selected, resolved: e.target.checked })
                  }
                />
                Đã xử lý yêu cầu của lượt này
              </label>
              <p className="feature-muted">
                Ghi chú dành cho quản trị viên. Nhân viên liên hệ khách qua kênh
                hỗ trợ hiện có.
              </p>
              <button className="solid-button" type="submit" disabled={saving}>
                {saving ? "Đang lưu…" : "Lưu xử lý"}
              </button>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
