"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { productApi } from "../../lib/api/products";
import { adminOrderApi } from "../../lib/api/admin-orders";
import { adminBorrowingApi } from "../../lib/api/borrowing";
import { subscribeMockData, USE_MOCK } from "../../lib/mock/config";
import type { Order } from "../../lib/types";
import type { Loan } from "../../lib/types/borrowing";
import { isLoanOverdue } from "../../lib/types/borrowing";
import { ORDER_STATUS_LABEL } from "../../lib/types";
import { formatPrice } from "../../lib/utils/format";
import { imageSrc } from "../../lib/utils/image";
import { LoanBadge, loanDate } from "../../components/borrowing/LoanDetails";
import { PageSpinner } from "../../components/ui/Spinner";
export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [books, setBooks] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [orderPage, requests, bookPage] = await Promise.all([
          adminOrderApi.getAll({ pageSize: 100 }),
          adminBorrowingApi.getAll(),
          productApi.getAll({ pageSize: 1 }),
        ]);
        let allOrders = orderPage.items;
        for (let page = 2; page <= orderPage.totalPages; page++) {
          const next = await adminOrderApi.getAll({ pageSize: 100, page });
          allOrders = [...allOrders, ...next.items];
        }
        if (active) {
          setOrders(allOrders);
          setLoans(requests);
          setBooks(bookPage.totalCount);
          setError("");
        }
      } catch (caught) {
        if (active)
          setError(
            caught instanceof Error
              ? caught.message
              : "Không tải được tổng quan.",
          );
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    const unsub = USE_MOCK
      ? subscribeMockData(() => {
          void load();
        })
      : () => {};
    return () => {
      active = false;
      unsub();
    };
  }, []);
  if (loading) return <PageSpinner />;
  const pending = loans.filter((l) => l.status === "pending");
  const activeLoans = loans.filter((l) =>
    ["approved", "borrowed"].includes(l.status),
  );
  const overdue = loans.filter((l) => isLoanOverdue(l));
  const revenue = orders
    .filter((o) => o.status === "Done")
    .reduce((sum, o) => sum + Number(o.totalPrice), 0);
  const statuses = ["Processing", "Preparing", "Shipping", "Done"] as const;
  const max = Math.max(
    1,
    ...statuses.map((s) => orders.filter((o) => o.status === s).length),
  );
  return (
    <div className="overview-page">
      {error && (
        <p role="alert" className="feedback-error">
          {error}
        </p>
      )}
      <section className="overview-welcome">
        <div>
          <span className="eyebrow">MỘT GÓC NHÌN, MỌI HOẠT ĐỘNG</span>
          <h2>
            Chào ngày mới,
            <br />
            người giữ những trang sách.
          </h2>
          <p>Từ kệ sách đến tay người đọc — cùng chăm chút từng hành trình.</p>
        </div>
        <div className="welcome-stamp">
          <i className="fa fa-book" aria-hidden="true" />
          <span>
            READ.
            <br />
            SHARE.
            <br />
            REPEAT.
          </span>
        </div>
      </section>
      <div className="workspace-stats overview-stats">
        {[
          {
            label: "Đầu sách đang mở bán",
            value: String(books),
            detail: "Trong catalog khách hàng",
            icon: "fa-book",
            href: "/admin/products",
          },
          {
            label: "Đơn mua sách",
            value: String(orders.length),
            detail: `${orders.filter((o) => o.status === "Processing").length} đơn cần xử lý`,
            icon: "fa-shopping-bag",
            href: "/admin/orders",
          },
          {
            label: "Phiếu mượn cần duyệt",
            value: String(pending.length),
            detail: "Chờ xác nhận từ nhà sách",
            icon: "fa-inbox",
            href: "/admin/borrowing",
          },
          {
            label: "Đang giữ chỗ / mượn",
            value: String(activeLoans.length),
            detail: `${overdue.length} phiếu quá hạn trả`,
            icon: "fa-exchange",
            href: "/admin/borrowing",
          },
        ].map((stat) => (
          <Link href={stat.href} key={stat.label}>
            <span>
              {stat.label}
              <i className={`fa ${stat.icon}`} aria-hidden="true" />
            </span>
            <strong>{stat.value.padStart(2, "0")}</strong>
            <small>
              {stat.detail}{" "}
              <i className="fa fa-arrow-right" aria-hidden="true" />
            </small>
          </Link>
        ))}
      </div>
      <div className="overview-bento">
        <section className="workspace-panel sales-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">HOẠT ĐỘNG BÁN SÁCH</span>
              <h3>Đơn hàng đang ở đâu?</h3>
            </div>
            <Link href="/admin/orders">Xem tất cả ↗</Link>
          </div>
          <div className="order-distribution">
            {statuses.map((status) => {
              const count = orders.filter((o) => o.status === status).length;
              return (
                <div key={status}>
                  <div>
                    <span>{ORDER_STATUS_LABEL[status]}</span>
                    <strong>{count} đơn</strong>
                  </div>
                  <span className="distribution-track">
                    <span style={{ width: `${(count / max) * 100}%` }} />
                  </span>
                </div>
              );
            })}
          </div>
          <div className="revenue-total">
            <span>Doanh thu từ đơn hoàn thành</span>
            <strong>{formatPrice(String(revenue))}</strong>
          </div>
        </section>
        <section className="workspace-panel library-overview">
          <span className="eyebrow">THƯ VIỆN CHIA SẺ</span>
          <h3>
            Những câu chuyện
            <br />
            đang được chuyền tay.
          </h3>
          <div className="library-big-number">
            {loans
              .filter((l) => l.status === "returned")
              .length.toString()
              .padStart(2, "0")}
            <span>
              lượt mượn
              <br />
              đã hoàn tất
            </span>
          </div>
          <p>
            Quản lý số bản, duyệt đăng ký và cập nhật việc trả sách tại cùng một
            nơi.
          </p>
          <Link href="/admin/borrowing">
            Mở bàn quản lý mượn sách{" "}
            <i className="fa fa-long-arrow-right" aria-hidden="true" />
          </Link>
        </section>
        <section className="workspace-panel recent-loans-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">VỪA ĐƯỢC GỬI ĐẾN</span>
              <h3>Phiếu mượn gần đây</h3>
            </div>
            <Link href="/admin/borrowing">Xem tất cả ↗</Link>
          </div>
          <div className="workspace-table-wrap">
            <table className="workspace-table">
              <thead>
                <tr>
                  <th>Cuốn sách</th>
                  <th>Người nhận</th>
                  <th>Ngày hẹn</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {loans.slice(0, 5).map((loan) => (
                  <tr key={loan.id}>
                    <td>
                      <Link className="loan-table-book" href="/admin/borrowing">
                        <img src={imageSrc(loan.bookImage)} alt="" />
                        <strong>{loan.bookName}</strong>
                      </Link>
                    </td>
                    <td>{loan.contactName}</td>
                    <td>{loanDate(loan.pickupDate)}</td>
                    <td>
                      <LoanBadge loan={loan} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loans.length && (
              <p className="workspace-empty">
                Chưa có phiếu mượn. Phiếu mới sẽ xuất hiện tại đây.
              </p>
            )}
          </div>
        </section>
        <section className="workspace-panel quick-work">
          <span className="eyebrow">SẮP XẾP KHÔNG GIAN SÁCH</span>
          <h3>
            Một chút chăm chút
            <br />
            cho ngày hôm nay.
          </h3>
          {[
            {
              href: "/admin/products/new",
              title: "Thêm một câu chuyện",
              desc: "Đưa đầu sách mới lên kệ",
              icon: "fa-plus",
            },
            {
              href: "/admin/borrowing",
              title: "Chào một người đọc",
              desc: `${pending.length} phiếu đang chờ duyệt`,
              icon: "fa-bookmark-o",
            },
            {
              href: "/admin/categories",
              title: "Sắp lại ngăn sách",
              desc: "Quản lý thể loại & bộ sưu tập",
              icon: "fa-th-large",
            },
          ].map((item) => (
            <Link key={item.href} href={item.href}>
              <span>
                <i className={`fa ${item.icon}`} aria-hidden="true" />
              </span>
              <div>
                <strong>{item.title}</strong>
                <small>{item.desc}</small>
              </div>
              <i className="fa fa-angle-right" aria-hidden="true" />
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}
