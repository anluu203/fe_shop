"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { productApi } from "../../lib/api/products";
import { adminOrderApi } from "../../lib/api/admin-orders";
import { adminChatbotApi } from "../../lib/api/chatbot";
import { reportApi } from "../../lib/api/reports";
import { defaultReportQuery } from "../../lib/services/reports";
import { subscribeMockData, USE_MOCK } from "../../lib/mock/config";
import type { Order, Page } from "../../lib/types";
import { ORDER_STATUS_LABEL } from "../../lib/types";
import { formatDate, formatPrice, shortId } from "../../lib/utils/format";
import { PageSpinner } from "../../components/ui/Spinner";

export default function AdminDashboard() {
  const [data, setData] = useState<{
    books: number;
    orders: Page<Order>;
    revenue: string;
    pendingChats: number;
  } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [books, orders, report, logs] = await Promise.all([
          productApi.getAll({ pageSize: 1 }),
          adminOrderApi.getAll({ pageSize: 5 }),
          reportApi.getRevenue(defaultReportQuery()),
          adminChatbotApi.getLogs(),
        ]);
        if (active) {
          setData({
            books: books.totalCount,
            orders,
            revenue: report.revenue,
            pendingChats: logs.filter((l) => l.needsHuman && !l.resolved)
              .length,
          });
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
    };
    void load();
    const unsubscribe = USE_MOCK
      ? subscribeMockData(() => void load())
      : () => {};
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);
  if (loading) return <PageSpinner />;
  return (
    <div className="feature-page">
      {error && (
        <p role="alert" className="feature-error">
          {error}{" "}
          <button type="button" onClick={() => window.location.reload()}>
            Tải lại
          </button>
        </p>
      )}
      <section className="overview-welcome">
        <div>
          <span className="eyebrow">BOOKSTORE WORKSPACE</span>
          <h2>
            Chăm chút từng cuốn sách.
            <br />
            Đồng hành cùng người đọc.
          </h2>
          <p>Quản lý bán hàng, tư vấn và theo dõi hoạt động của nhà sách.</p>
        </div>
        <div className="welcome-stamp">
          <i className="fa fa-book" aria-hidden="true" />
          <span>
            READ.
            <br />
            DISCOVER.
            <br />
            REPEAT.
          </span>
        </div>
      </section>
      {data && (
        <>
          <div className="feature-stats">
            {[
              {
                label: "Đầu sách đang mở bán",
                value: data.books,
                href: "/admin/products",
              },
              {
                label: "Đơn mua sách",
                value: data.orders.totalCount,
                href: "/admin/orders",
              },
              {
                label: "Doanh thu tháng này",
                value: formatPrice(data.revenue),
                href: "/admin/reports",
              },
              {
                label: "Lượt chat cần chăm sóc",
                value: data.pendingChats,
                href: "/admin/chatbot",
              },
            ].map((stat) => (
              <Link href={stat.href} key={stat.label}>
                <article>
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                  <small>Xem chi tiết ↗</small>
                </article>
              </Link>
            ))}
          </div>
          <section className="workspace-panel feature-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">HOẠT ĐỘNG BÁN SÁCH</span>
                <h3>Đơn mua gần đây</h3>
              </div>
              <Link href="/admin/orders">Xem tất cả ↗</Link>
            </div>
            <div className="workspace-table-wrap">
              <table className="workspace-table">
                <thead>
                  <tr>
                    <th>Đơn hàng</th>
                    <th>Khách hàng</th>
                    <th>Ngày đặt</th>
                    <th>Giá trị</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {data.orders.items.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <Link href={`/admin/orders/${order.id}`}>
                          {shortId(order.id!)}
                        </Link>
                      </td>
                      <td>{order.user?.username ?? "Khách hàng"}</td>
                      <td>
                        {order.createdAt ? formatDate(order.createdAt) : "—"}
                      </td>
                      <td>{formatPrice(order.totalPrice)}</td>
                      <td>{ORDER_STATUS_LABEL[order.status]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!data.orders.items.length && (
              <p className="workspace-empty">Chưa có đơn mua sách.</p>
            )}
          </section>
        </>
      )}
      <section className="workspace-panel feature-panel">
        <span className="eyebrow">CÔNG VIỆC HÔM NAY</span>
        <div className="dashboard-shortcuts">
          {[
            {
              href: "/admin/products/new",
              icon: "fa-plus",
              title: "Thêm đầu sách",
              description: "Bổ sung sách và thông tin xuất bản lên kệ.",
            },
            {
              href: "/admin/chatbot",
              icon: "fa-comments-o",
              title: "Chăm sóc người đọc",
              description: "Cấu hình trợ lý và xử lý các lượt chat cần hỗ trợ.",
            },
            {
              href: "/admin/reports",
              icon: "fa-line-chart",
              title: "Xem báo cáo",
              description: "Theo dõi doanh thu và danh sách sách bán chạy.",
            },
          ].map((item) => (
            <Link href={item.href} key={item.href}>
              <i className={`fa ${item.icon}`} aria-hidden="true" />
              <strong>{item.title}</strong>
              <p>{item.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
