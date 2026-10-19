"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "../../../contexts/AuthContext";
import { borrowingApi } from "../../../lib/api/borrowing";
import { storeApi } from "../../../lib/api/stores";
import { subscribeMockData, USE_MOCK } from "../../../lib/mock/config";
import type { Store, User } from "../../../lib/types";
import type { BorrowingBook, Loan } from "../../../lib/types/borrowing";
import {
  ACTIVE_LOAN_STATUSES,
  LOAN_DURATIONS,
  LOAN_STATUS_LABEL,
  addCalendarDays,
  isLoanOverdue,
  vietnamDate,
} from "../../../lib/types/borrowing";
import { imageSrc } from "../../../lib/utils/image";
import { PageSpinner } from "../../../components/ui/Spinner";
import LoanDetails, {
  LoanBadge,
  loanDate,
} from "../../../components/borrowing/LoanDetails";

function BorrowingContent() {
  const { user, isLoading: authLoading } = useAuth();
  const params = useSearchParams();
  const requestedBook = params.get("bookId");
  const requestedTab = params.get("tab");
  const opened = useRef<string | null>(null);
  const [books, setBooks] = useState<BorrowingBook[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [tab, setTab] = useState(requestedTab === "mine" ? "mine" : "catalog");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [status, setStatus] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [cancelId, setCancelId] = useState("");
  useEffect(() => {
    setTab(requestedTab === "mine" ? "mine" : "catalog");
  }, [requestedTab, requestedBook]);
  useEffect(() => {
    if (authLoading) return;
    let active = true;
    const load = () =>
      Promise.all([
        borrowingApi.getBooks(),
        storeApi.getAll(),
        user ? borrowingApi.getMine() : Promise.resolve([] as Loan[]),
      ])
        .then(([catalog, branches, requests]) => {
          if (active) {
            setBooks(catalog);
            setStores(branches);
            setLoans(requests);
            setError("");
          }
        })
        .catch((caught) => {
          if (active)
            setError(
              caught instanceof Error
                ? caught.message
                : "Không tải được dịch vụ mượn sách.",
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
  }, [user?.id, authLoading]);
  useEffect(() => {
    if (requestedBook && books.length && opened.current !== requestedBook) {
      opened.current = requestedBook;
      setSelectedId(requestedBook);
    }
  }, [requestedBook, books]);
  useEffect(() => {
    if (!selectedId || tab !== "catalog") return;
    const frame = requestAnimationFrame(() => {
      document.getElementById("loan-registration")?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [selectedId, tab]);
  const selected = books.find((book) => book.productId === selectedId);
  const keyword = search.trim().toLocaleLowerCase("vi");
  const catalog = books.filter(
    (book) =>
      (!keyword ||
        `${book.name} ${book.author}`
          .toLocaleLowerCase("vi")
          .includes(keyword)) &&
      (!category || book.categoryName === category) &&
      (!availableOnly || (book.availableCopies > 0 && book.borrowable)),
  );
  const filteredLoans = loans.filter(
    (loan) =>
      !status ||
      (status === "overdue" ? isLoanOverdue(loan) : loan.status === status),
  );
  async function cancel(loanId: string) {
    setBusy(loanId);
    setError("");
    try {
      await borrowingApi.cancel(loanId);
      setLoans(await borrowingApi.getMine());
      setSuccess("Đã hủy phiếu mượn. Bạn có thể chọn một cuốn sách khác.");
      setCancelId("");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Không thể hủy phiếu.",
      );
    } finally {
      setBusy("");
    }
  }
  return (
    <div className="container lending-page">
      <header className="lending-hero">
        <div>
          <span className="eyebrow">BOOKSTORE / THƯ VIỆN CHIA SẺ</span>
          <h1>
            Mượn một cuốn sách.
            <br />
            <em>Mang về một thế giới.</em>
          </h1>
          <p>
            Đọc theo nhịp của bạn. Đăng ký trực tuyến, nhận sách tại nhà sách và
            trao lại những câu chuyện cho người đọc tiếp theo.
          </p>
        </div>
        <div className="lending-policy">
          <span>THẺ GHI NHỚ</span>
          <strong>14</strong>
          <p>
            ngày cho một hành trình đọc
            <br />
            hoặc chọn 7 / 30 ngày khi đăng ký
          </p>
          <div>
            <i className="fa fa-bookmark-o" aria-hidden="true" /> Mỗi phiếu một
            cuốn · Tối đa 5 phiếu hoạt động
          </div>
        </div>
      </header>
      <div className="loan-process">
        {[
          "Chọn sách & gửi đăng ký",
          "Chờ nhà sách duyệt",
          "Đến nhận & bắt đầu đọc",
          "Trả sách tại nhà sách",
        ].map((text, i) => (
          <div key={text}>
            <span>0{i + 1}</span>
            <p>{text}</p>
          </div>
        ))}
      </div>
      <div
        className="workspace-tabs"
        role="tablist"
        aria-label="Dịch vụ mượn sách"
      >
        <button
          role="tab"
          aria-selected={tab === "catalog"}
          onClick={() => setTab("catalog")}
        >
          Tủ sách cho mượn{" "}
          <span>{books.filter((b) => b.borrowable).length}</span>
        </button>
        <button
          role="tab"
          aria-selected={tab === "mine"}
          onClick={() => setTab("mine")}
        >
          Phiếu mượn của tôi{" "}
          <span>
            {
              loans.filter((l) => ACTIVE_LOAN_STATUSES.includes(l.status))
                .length
            }
          </span>
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
      {loading ? (
        <PageSpinner />
      ) : tab === "catalog" ? (
        <>
          {selectedId && (
            <section className="loan-registration" id="loan-registration">
              <div className="registration-book">
                <span className="eyebrow">ĐĂNG KÝ MƯỢN</span>
                {selected ? (
                  <>
                    <img
                      src={imageSrc(selected.imageUrl)}
                      alt={selected.name}
                    />
                    <h2>{selected.name}</h2>
                    <p>{selected.author}</p>
                    <span>{selected.availableCopies} bản có thể giữ chỗ</span>
                  </>
                ) : (
                  <p>Cuốn sách này không có trong tủ sách cho mượn.</p>
                )}
                <button
                  className="text-button"
                  onClick={() => setSelectedId(null)}
                >
                  Đóng đăng ký
                </button>
              </div>
              {selected &&
                (user ? (
                  <RegistrationForm
                    key={`${selected.productId}-${user.id}`}
                    book={selected}
                    stores={stores}
                    user={user}
                    onCreated={async (loan) => {
                      setSuccess(
                        `Đã gửi phiếu ${loan.id.slice(-8)}. Nhà sách sẽ kiểm tra và xác nhận đăng ký.`,
                      );
                      setLoans(await borrowingApi.getMine());
                      setSelectedId(null);
                      setTab("mine");
                    }}
                  />
                ) : (
                  <div className="loan-login">
                    <h3>Một tài khoản, một kệ sách riêng.</h3>
                    <p>
                      Đăng nhập để gửi đăng ký và theo dõi hành trình mượn sách
                      của bạn.
                    </p>
                    <Link
                      className="solid-button"
                      href={`/client/auth/login?returnTo=${encodeURIComponent(`/client/borrowing?bookId=${selected.productId}`)}`}
                    >
                      Đăng nhập để đăng ký
                    </Link>
                  </div>
                ))}
            </section>
          )}
          <div className="lending-toolbar">
            <label className="search-control">
              <i className="fa fa-search" aria-hidden="true" />
              <input
                aria-label="Tìm sách để mượn"
                placeholder="Tìm cuốn sách hoặc tác giả..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <select
              aria-label="Thể loại sách mượn"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Mọi thể loại</option>
              {Array.from(new Set(books.map((b) => b.categoryName))).map(
                (name) => (
                  <option key={name}>{name}</option>
                ),
              )}
            </select>
            <label className="check-filter">
              <input
                type="checkbox"
                checked={availableOnly}
                onChange={(e) => setAvailableOnly(e.target.checked)}
              />{" "}
              Chỉ sách còn bản mượn
            </label>
          </div>
          <div className="lending-catalog">
            {catalog.map((book) => (
              <article key={book.productId} className="lending-book">
                <Link href={`/client/products/${book.productId}`}>
                  <img
                    src={imageSrc(book.imageUrl)}
                    alt={book.name}
                    loading="lazy"
                  />
                </Link>
                <div>
                  <span className="eyebrow">{book.categoryName}</span>
                  <h2>
                    <Link href={`/client/products/${book.productId}`}>
                      {book.name}
                    </Link>
                  </h2>
                  <p>{book.author}</p>
                  <span
                    className={`availability ${book.borrowable && book.availableCopies > 0 ? "available" : "unavailable"}`}
                  >
                    <i className="fa fa-circle" aria-hidden="true" />
                    {book.borrowable && book.availableCopies > 0
                      ? `Còn ${book.availableCopies} bản để mượn`
                      : "Tạm hết bản mượn"}
                  </span>
                  <button
                    id={`borrow-${book.productId}`}
                    disabled={!book.borrowable || book.availableCopies < 1}
                    onClick={() => {
                      setSelectedId(book.productId);
                      setSuccess("");
                    }}
                  >
                    Đăng ký mượn{" "}
                    <i className="fa fa-arrow-right" aria-hidden="true" />
                  </button>
                </div>
              </article>
            ))}
          </div>
          {!catalog.length && (
            <div className="workspace-empty">
              Chưa có sách phù hợp với bộ lọc. Thử một từ khóa khác nhé.
            </div>
          )}
        </>
      ) : !user ? (
        <div className="workspace-empty">
          <i className="fa fa-bookmark-o" />
          <h2>Kệ sách của bạn đang chờ.</h2>
          <p>Đăng nhập để xem và quản lý các phiếu mượn.</p>
          <Link
            className="solid-button"
            href="/client/auth/login?returnTo=%2Fclient%2Fborrowing%3Ftab%3Dmine"
          >
            Đăng nhập
          </Link>
        </div>
      ) : (
        <>
          <div className="loans-heading">
            <div>
              <h2>Hành trình đọc của {user.username}</h2>
              <p>Hạn trả được tính từ ngày nhà sách bàn giao sách thực tế.</p>
            </div>
            <select
              aria-label="Lọc phiếu mượn"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Tất cả phiếu</option>
              {Object.entries(LOAN_STATUS_LABEL).map(([key, label]) => (
                <option value={key} key={key}>
                  {label}
                </option>
              ))}
              <option value="overdue">Quá hạn trả</option>
            </select>
          </div>
          <div className="my-loans">
            {filteredLoans.map((loan) => (
              <article className="my-loan" key={loan.id}>
                <div className="my-loan-header">
                  <img src={imageSrc(loan.bookImage)} alt={loan.bookName} />
                  <div>
                    <span className="eyebrow">PHIẾU #{loan.id.slice(-8)}</span>
                    <h3>{loan.bookName}</h3>
                    <p>{loan.author}</p>
                    <span>
                      Nhận dự kiến {loanDate(loan.pickupDate)} ·{" "}
                      {loan.durationDays} ngày
                    </span>
                  </div>
                  <LoanBadge loan={loan} />
                </div>
                {loan.status === "approved" && (
                  <p className="loan-callout">
                    Sách đã được giữ chỗ. Mời bạn đến {loan.storeName} vào ngày
                    nhận đã đăng ký.
                  </p>
                )}
                {isLoanOverdue(loan) && (
                  <p className="feedback-error">
                    Phiếu đã quá hạn trả ngày {loanDate(loan.dueDate)}. Vui lòng
                    mang sách đến nhà sách để hoàn tất trả.
                  </p>
                )}
                <details>
                  <summary>
                    Thông tin & lịch sử phiếu{" "}
                    <i className="fa fa-angle-down" aria-hidden="true" />
                  </summary>
                  <LoanDetails loan={loan} />
                </details>
                {["pending", "approved"].includes(loan.status) && (
                  <div className="loan-cancel">
                    {cancelId === loan.id ? (
                      <>
                        <span>Hủy đăng ký mượn cuốn sách này?</span>
                        <button
                          className="danger-button"
                          disabled={busy === loan.id}
                          onClick={() => {
                            void cancel(loan.id);
                          }}
                        >
                          Xác nhận hủy
                        </button>
                        <button
                          className="text-button"
                          onClick={() => setCancelId("")}
                        >
                          Giữ phiếu
                        </button>
                      </>
                    ) : (
                      <button
                        className="text-button"
                        onClick={() => setCancelId(loan.id)}
                      >
                        Hủy đăng ký
                      </button>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
          {!filteredLoans.length && (
            <div className="workspace-empty">
              <h3>Chưa có phiếu mượn ở mục này.</h3>
              <button
                className="solid-button"
                onClick={() => setTab("catalog")}
              >
                Chọn cuốn sách đầu tiên
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RegistrationForm({
  book,
  stores,
  user,
  onCreated,
}: {
  book: BorrowingBook;
  stores: Store[];
  user: User;
  onCreated: (loan: Loan) => Promise<void>;
}) {
  const [form, setForm] = useState({
    contactName: user.username,
    phone: "",
    storeId: stores[0]?.id ?? "",
    pickupDate: vietnamDate(),
    durationDays: 14,
    customerNote: "",
  });
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    setError("");
    try {
      const loan = await borrowingApi.create({
        ...form,
        productId: book.productId,
      });
      await onCreated(loan);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Chưa gửi được đăng ký.",
      );
    } finally {
      setSending(false);
    }
  }
  return (
    <form onSubmit={submit} className="loan-form">
      <h3>Hẹn bạn tại nhà sách.</h3>
      <p>
        Thông tin dưới đây giúp nhà sách chuẩn bị sách cho bạn. Một phiếu tương
        ứng một bản sách.
      </p>
      <div className="loan-form-grid">
        <label>
          Họ tên người nhận
          <input
            id="loan-contact"
            required
            minLength={2}
            maxLength={100}
            value={form.contactName}
            onChange={(e) => setForm({ ...form, contactName: e.target.value })}
            autoComplete="name"
          />
        </label>
        <label>
          Số điện thoại
          <input
            id="loan-phone"
            type="tel"
            required
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="090 123 4567"
            autoComplete="tel"
            maxLength={20}
          />
        </label>
        <label className="full-field">
          Nhận sách tại
          <select
            id="loan-store"
            required
            value={form.storeId}
            onChange={(e) => setForm({ ...form, storeId: e.target.value })}
          >
            <option value="" disabled>
              Chọn nhà sách
            </option>
            {stores.map((store) => (
              <option value={store.id} key={store.id}>
                {store.name} — {store.address}
              </option>
            ))}
          </select>
        </label>
        <label>
          Ngày đến nhận
          <input
            id="loan-pickup"
            type="date"
            required
            min={vietnamDate()}
            max={addCalendarDays(vietnamDate(), 30)}
            value={form.pickupDate}
            onChange={(e) => setForm({ ...form, pickupDate: e.target.value })}
          />
        </label>
        <label>
          Thời hạn mượn
          <select
            id="loan-duration"
            value={form.durationDays}
            onChange={(e) =>
              setForm({ ...form, durationDays: Number(e.target.value) })
            }
          >
            {LOAN_DURATIONS.map((days) => (
              <option value={days} key={days}>
                {days} ngày
              </option>
            ))}
          </select>
        </label>
        <label className="full-field">
          Lời nhắn cho nhà sách <span>(không bắt buộc)</span>
          <textarea
            id="loan-customer-note"
            rows={2}
            maxLength={1000}
            value={form.customerNote}
            onChange={(e) => setForm({ ...form, customerNote: e.target.value })}
          />
        </label>
      </div>
      <p className="loan-policy-note">
        <i className="fa fa-info-circle" aria-hidden="true" /> Sách chỉ được giữ
        chỗ sau khi duyệt. Hạn trả bắt đầu từ ngày nhận thực tế; không thu phí
        mượn trong bản demo.
      </p>
      {error && (
        <p role="alert" className="feedback-error">
          {error}
        </p>
      )}
      <button
        id="submit-loan-btn"
        className="solid-button"
        disabled={
          sending ||
          !book.borrowable ||
          book.availableCopies < 1 ||
          !stores.length
        }
      >
        {sending ? "Đang gửi đăng ký..." : "Gửi đăng ký mượn"}
        <i className="fa fa-arrow-right" aria-hidden="true" />
      </button>
    </form>
  );
}
export default function BorrowingPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <BorrowingContent />
    </Suspense>
  );
}
