"use client";

import { useEffect, useState } from "react";
import { adminBorrowingApi } from "../../../lib/api/borrowing";
import { subscribeMockData, USE_MOCK } from "../../../lib/mock/config";
import type {
  BorrowingBook,
  Loan,
  LoanStatus,
} from "../../../lib/types/borrowing";
import { isLoanOverdue, LOAN_STATUS_LABEL } from "../../../lib/types/borrowing";
import { imageSrc } from "../../../lib/utils/image";
import LoanDetails, {
  LoanBadge,
  loanDate,
} from "../../../components/borrowing/LoanDetails";
import { PageSpinner } from "../../../components/ui/Spinner";

export default function AdminBorrowingPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [inventory, setInventory] = useState<BorrowingBook[]>([]);
  const [tab, setTab] = useState("loans");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  useEffect(() => {
    let active = true;
    const load = () =>
      Promise.all([
        adminBorrowingApi.getAll(),
        adminBorrowingApi.getInventory(),
      ])
        .then(([requests, stock]) => {
          if (active) {
            setLoans(requests);
            setInventory(stock);
          }
        })
        .catch((caught) => {
          if (active)
            setError(
              caught instanceof Error
                ? caught.message
                : "Không tải được dữ liệu mượn sách.",
            );
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    void load();
    const unsubscribe = USE_MOCK
      ? subscribeMockData(() => {
          void load();
        })
      : () => {};
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);
  const selected = loans.find((loan) => loan.id === selectedId);
  const keyword = search.trim().toLocaleLowerCase("vi");
  const filtered = loans.filter(
    (loan) =>
      (!status ||
        (status === "overdue"
          ? isLoanOverdue(loan)
          : loan.status === status)) &&
      (!keyword ||
        `${loan.id} ${loan.bookName} ${loan.contactName} ${loan.phone}`
          .toLocaleLowerCase("vi")
          .includes(keyword)),
  );
  if (loading) return <PageSpinner />;
  return (
    <div className="borrowing-admin">
      <div className="admin-section-intro">
        <div>
          <span className="eyebrow">LƯU THÔNG SÁCH</span>
          <h2>Mỗi cuốn sách, một hành trình.</h2>
          <p>
            Tiếp nhận đăng ký, bàn giao và theo dõi việc hoàn trả tại một nơi.
          </p>
        </div>
        <a className="outline-button" href="/client/borrowing">
          Xem tủ sách cho mượn{" "}
          <i className="fa fa-external-link" aria-hidden="true" />
        </a>
      </div>
      <div className="workspace-stats">
        {[
          {
            label: "Chờ xét duyệt",
            value: loans.filter((l) => l.status === "pending").length,
            icon: "fa-inbox",
            status: "pending",
          },
          {
            label: "Đã giữ chỗ",
            value: loans.filter((l) => l.status === "approved").length,
            icon: "fa-bookmark-o",
            status: "approved",
          },
          {
            label: "Sách đang mượn",
            value: loans.filter((l) => l.status === "borrowed").length,
            icon: "fa-exchange",
            status: "borrowed",
          },
          {
            label: "Cần nhắc trả",
            value: loans.filter((l) => isLoanOverdue(l)).length,
            icon: "fa-clock-o",
            status: "overdue",
          },
        ].map((stat) => (
          <button
            key={stat.status}
            aria-pressed={status === stat.status}
            onClick={() => {
              setStatus(status === stat.status ? "" : stat.status);
              setTab("loans");
            }}
          >
            <span>
              {stat.label}
              <i className={`fa ${stat.icon}`} aria-hidden="true" />
            </span>
            <strong>{stat.value.toString().padStart(2, "0")}</strong>
            <small>
              Xem danh sách{" "}
              <i className="fa fa-arrow-right" aria-hidden="true" />
            </small>
          </button>
        ))}
      </div>
      <div
        className="workspace-tabs"
        role="tablist"
        aria-label="Quản trị mượn sách"
      >
        <button
          role="tab"
          aria-selected={tab === "loans"}
          onClick={() => {
            setTab("loans");
            setSearch("");
          }}
        >
          Phiếu đăng ký <span>{loans.length}</span>
        </button>
        <button
          role="tab"
          aria-selected={tab === "inventory"}
          onClick={() => {
            setTab("inventory");
            setSearch("");
          }}
        >
          Kho sách cho mượn <span>{inventory.length}</span>
        </button>
      </div>
      {error && (
        <p role="alert" className="feedback-error">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="feedback-success">
          {success}
        </p>
      )}
      <div className="lending-toolbar">
        <label className="search-control">
          <i className="fa fa-search" aria-hidden="true" />
          <input
            id="admin-loan-search"
            placeholder={
              tab === "loans"
                ? "Tìm phiếu, tên sách, người nhận..."
                : "Tìm sách trong kho mượn..."
            }
            aria-label="Tìm trong quản lý mượn sách"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        {tab === "loans" && (
          <select
            aria-label="Trạng thái phiếu mượn"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Mọi trạng thái</option>
            {Object.entries(LOAN_STATUS_LABEL).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
            <option value="overdue">Quá hạn trả</option>
          </select>
        )}
        <span className="muted-count">
          {tab === "loans"
            ? filtered.length
            : inventory.filter((b) =>
                `${b.name} ${b.author}`
                  .toLocaleLowerCase("vi")
                  .includes(keyword),
              ).length}{" "}
          kết quả
        </span>
      </div>
      {tab === "loans" ? (
        <div className={`loan-admin-grid ${selected ? "has-selection" : ""}`}>
          <div className="workspace-table-wrap">
            <table className="workspace-table">
              <thead>
                <tr>
                  <th>Sách & mã phiếu</th>
                  <th>Người mượn</th>
                  <th>Ngày nhận</th>
                  <th>Trạng thái</th>
                  <th>Hạn trả</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((loan) => (
                  <tr
                    key={loan.id}
                    className={selectedId === loan.id ? "selected-row" : ""}
                  >
                    <td>
                      <button
                        id={`open-${loan.id}`}
                        onClick={() => {
                          setSelectedId(loan.id);
                          setSuccess("");
                        }}
                        className="loan-table-book"
                      >
                        <img src={imageSrc(loan.bookImage)} alt="" />
                        <span>
                          <strong>{loan.bookName}</strong>
                          <small>#{loan.id.slice(-8)}</small>
                        </span>
                      </button>
                    </td>
                    <td>
                      <strong>{loan.contactName}</strong>
                      <small>{loan.phone}</small>
                    </td>
                    <td>
                      {loanDate(loan.pickupDate)}
                      <small>{loan.durationDays} ngày</small>
                    </td>
                    <td>
                      <LoanBadge loan={loan} />
                    </td>
                    <td>{loan.dueDate ? loanDate(loan.dueDate) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && (
              <div className="workspace-empty">
                Không có phiếu phù hợp với bộ lọc hiện tại.
              </div>
            )}
          </div>
          {selected && (
            <section className="loan-admin-detail">
              <div className="loan-detail-title">
                <span className="eyebrow">CHI TIẾT PHIẾU</span>
                <button
                  className="text-button"
                  onClick={() => setSelectedId("")}
                  aria-label="Đóng chi tiết phiếu"
                >
                  ×
                </button>
              </div>
              <h3>{selected.bookName}</h3>
              <LoanBadge loan={selected} />
              <LoanDetails loan={selected} />
              <StatusEditor
                key={`${selected.id}-${selected.status}`}
                loan={selected}
                onSaved={(updated) => {
                  setLoans((current) =>
                    current.map((l) => (l.id === updated.id ? updated : l)),
                  );
                  setSuccess(
                    `Đã cập nhật phiếu #${updated.id.slice(-8)}: ${LOAN_STATUS_LABEL[updated.status]}.`,
                  );
                  setError("");
                }}
              />
            </section>
          )}
        </div>
      ) : (
        <>
          <p className="inventory-help">
            Bản khả dụng = tổng số bản − số bản đã giữ chỗ và đang mượn. Đơn mua
            sách và kho mượn được quản lý riêng.
          </p>
          <div className="workspace-table-wrap">
            <table className="workspace-table inventory-table">
              <thead>
                <tr>
                  <th>Đầu sách</th>
                  <th>Có thể mượn</th>
                  <th>Tổng số bản</th>
                  <th>Cho phép mượn</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {inventory
                  .filter((book) =>
                    `${book.name} ${book.author}`
                      .toLocaleLowerCase("vi")
                      .includes(keyword),
                  )
                  .map((book) => (
                    <InventoryRow
                      key={`${book.productId}-${book.totalCopies}-${book.borrowable}`}
                      book={book}
                      onSaved={(updated) => {
                        setInventory((current) =>
                          current.map((b) =>
                            b.productId === updated.productId ? updated : b,
                          ),
                        );
                        setSuccess(`Đã cập nhật kho mượn: ${updated.name}.`);
                      }}
                    />
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
function StatusEditor({
  loan,
  onSaved,
}: {
  loan: Loan;
  onSaved: (loan: Loan) => void;
}) {
  const choices: Partial<Record<LoanStatus, LoanStatus[]>> = {
    pending: ["approved", "rejected"],
    approved: ["borrowed", "cancelled"],
    borrowed: ["returned"],
  };
  const options = choices[loan.status] ?? [];
  const [status, setStatus] = useState<LoanStatus>(options[0] ?? loan.status);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  if (!options.length)
    return (
      <p className="loan-closed">
        Phiếu đã kết thúc. Lịch sử được giữ lại để tra cứu.
      </p>
    );
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      onSaved(await adminBorrowingApi.updateStatus(loan.id, status, note));
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Không thể cập nhật phiếu.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <form className="loan-status-editor" onSubmit={submit}>
      <h4>Xử lý phiếu mượn</h4>
      <label>
        Chuyển trạng thái
        <select
          id="loan-next-status"
          value={status}
          onChange={(e) => setStatus(e.target.value as LoanStatus)}
        >
          {options.map((value) => (
            <option key={value} value={value}>
              {LOAN_STATUS_LABEL[value]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Ghi chú xử lý
        <textarea
          id="loan-admin-note"
          rows={3}
          required
          maxLength={1000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Thông tin xác nhận, bàn giao hoặc lý do từ chối..."
        />
      </label>
      {status === "borrowed" && (
        <p className="loan-policy-note">
          Hạn trả bắt đầu từ hôm nay, theo thời hạn {loan.durationDays} ngày đã
          đăng ký.
        </p>
      )}
      {error && (
        <p role="alert" className="feedback-error">
          {error}
        </p>
      )}
      <button id="update-loan-btn" className="solid-button" disabled={saving}>
        {saving ? "Đang lưu..." : "Lưu trạng thái"}
        <i className="fa fa-arrow-right" aria-hidden="true" />
      </button>
    </form>
  );
}
function InventoryRow({
  book,
  onSaved,
}: {
  book: BorrowingBook;
  onSaved: (book: BorrowingBook) => void;
}) {
  const [count, setCount] = useState(String(book.totalCopies));
  const [enabled, setEnabled] = useState(book.borrowable);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    setError("");
    try {
      if (!count.trim()) throw new Error("Vui lòng nhập tổng số bản.");
      onSaved(
        await adminBorrowingApi.updateInventory(
          book.productId,
          Number(count),
          enabled,
        ),
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Không lưu được kho mượn.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <tr>
      <td>
        <div className="loan-table-book">
          <img src={imageSrc(book.imageUrl)} alt="" />
          <span>
            <strong>{book.name}</strong>
            <small>
              {book.isActive ? book.author : "Sách đang bị ẩn khỏi catalog"}
            </small>
          </span>
        </div>
        {error && (
          <p className="feedback-error" role="alert">
            {error}
          </p>
        )}
      </td>
      <td>
        <span className="inventory-number">{book.availableCopies}</span> /{" "}
        {book.totalCopies}
      </td>
      <td>
        <input
          type="number"
          min={0}
          max={100}
          step={1}
          aria-label={`Tổng số bản ${book.name}`}
          value={count}
          onChange={(e) => setCount(e.target.value)}
        />
      </td>
      <td>
        <label className="check-filter">
          <input
            type="checkbox"
            disabled={!book.isActive}
            aria-label={`Cho phép mượn ${book.name}`}
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          {enabled ? "Đang bật" : "Tạm ngừng"}
        </label>
      </td>
      <td>
        <button
          className="outline-button"
          onClick={() => {
            void save();
          }}
          disabled={saving}
        >
          {saving ? "Đang lưu" : "Lưu kho"}
        </button>
      </td>
    </tr>
  );
}
