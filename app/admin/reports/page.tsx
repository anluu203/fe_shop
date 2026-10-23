"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { reportApi } from "../../../lib/api/reports";
import type {
  ReportPeriod,
  ReportQuery,
  RevenueReport,
} from "../../../lib/types/reports";
import {
  defaultReportQuery,
  reportCSV,
  validateReportQuery,
  vietnamDate,
} from "../../../lib/services/reports";
import { formatPrice } from "../../../lib/utils/format";
import { subscribeMockData, USE_MOCK } from "../../../lib/mock/config";
import RevenueChart from "../../../components/admin/RevenueChart";

const PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: "day", label: "Ngày" },
  { value: "week", label: "Tuần" },
  { value: "month", label: "Tháng" },
  { value: "year", label: "Năm" },
];
export default function RevenueReportsPage() {
  const [form, setForm] = useState<ReportQuery>(defaultReportQuery);
  const [query, setQuery] = useState<ReportQuery>(defaultReportQuery);
  const [report, setReport] = useState<RevenueReport | null>(null);
  const [chartType, setChartType] = useState<"bar" | "line">("bar");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);
  useEffect(() => {
    let active = true;
    const load = async () => {
      const id = ++requestId.current;
      try {
        const value = await reportApi.getRevenue(query);
        if (active && id === requestId.current) {
          setReport(value);
          setError("");
        }
      } catch (caught) {
        if (active && id === requestId.current) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Không tải được báo cáo.",
          );
          setReport(null);
        }
      } finally {
        if (active && id === requestId.current) setLoading(false);
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
  }, [query]);
  function apply(next: ReportQuery) {
    try {
      validateReportQuery(next);
      setError("");
      setForm(next);
      setLoading(true);
      setReport(null);
      setQuery({ ...next });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Bộ lọc không hợp lệ.",
      );
    }
  }
  function preset(type: "today" | "week" | "month" | "year") {
    const to = vietnamDate();
    const day = new Date(`${to}T00:00:00Z`);
    const from =
      type === "today"
        ? to
        : type === "week"
          ? new Date(day.getTime() - ((day.getUTCDay() + 6) % 7) * 86400000)
              .toISOString()
              .slice(0, 10)
          : type === "month"
            ? `${to.slice(0, 7)}-01`
            : `${to.slice(0, 4)}-01-01`;
    apply({ from, to, period: type === "year" ? "month" : "day" });
  }
  function exportCSV() {
    if (!report) return;
    const url = URL.createObjectURL(
      new Blob([reportCSV(report)], { type: "text/csv;charset=utf-8;" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `doanh-thu-${report.query.from}-${report.query.to}.csv`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="feature-page">
      <div className="feature-title-row">
        <p className="feature-intro">
          Theo dõi doanh thu, nhịp bán sách và những đầu sách được bạn đọc lựa
          chọn nhiều nhất.
        </p>
        <button
          type="button"
          className="outline-button"
          disabled={!report || loading}
          onClick={exportCSV}
        >
          <i className="fa fa-download" aria-hidden="true" />
          Xuất CSV
        </button>
      </div>
      <section className="workspace-panel feature-panel">
        <div className="feature-presets">
          {[
            { key: "today", label: "Hôm nay" },
            { key: "week", label: "Tuần này" },
            { key: "month", label: "Tháng này" },
            { key: "year", label: "Năm nay" },
          ].map((p) => (
            <button
              className="outline-button"
              type="button"
              key={p.key}
              onClick={() =>
                preset(p.key as "today" | "week" | "month" | "year")
              }
            >
              {p.label}
            </button>
          ))}
        </div>
        <form
          className="feature-toolbar report-filters"
          onSubmit={(e) => {
            e.preventDefault();
            apply(form);
          }}
        >
          <label>
            Từ ngày
            <input
              type="date"
              required
              value={form.from}
              onChange={(e) => setForm({ ...form, from: e.target.value })}
            />
          </label>
          <label>
            Đến ngày
            <input
              type="date"
              required
              value={form.to}
              onChange={(e) => setForm({ ...form, to: e.target.value })}
            />
          </label>
          <label>
            Gom dữ liệu theo
            <select
              value={form.period}
              onChange={(e) =>
                setForm({ ...form, period: e.target.value as ReportPeriod })
              }
            >
              {PERIODS.map((p) => (
                <option value={p.value} key={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <button className="solid-button" type="submit">
            Xem báo cáo
          </button>
        </form>
        <p className="feature-muted">
          Chỉ ghi nhận đơn hoàn thành, theo ngày hoàn thành và múi giờ Việt Nam.
          Tuần bắt đầu từ thứ Hai; kỳ đầu/cuối chỉ tính phần nằm trong khoảng đã
          chọn.
        </p>
      </section>
      {error && (
        <p className="feature-error" role="alert">
          {error}{" "}
          <button type="button" onClick={() => apply(query)}>
            Thử tải lại
          </button>
        </p>
      )}
      {loading && (
        <p className="workspace-empty" role="status">
          Đang tổng hợp báo cáo…
        </p>
      )}
      {report && !loading && (
        <>
          <div className="feature-stats">
            {[
              { label: "Doanh thu", value: formatPrice(report.revenue) },
              { label: "Đơn hoàn thành", value: report.orders },
              { label: "Số sách bán ra", value: report.quantity },
              {
                label: "Giá trị đơn trung bình",
                value: formatPrice(report.averageOrder),
              },
            ].map((stat) => (
              <article key={stat.label}>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </article>
            ))}
          </div>
          <section className="workspace-panel feature-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">
                  DOANH THU THEO{" "}
                  {PERIODS.find(
                    (p) => p.value === report.query.period,
                  )?.label.toUpperCase()}
                </span>
                <h2>Từng cuốn sách, từng hành trình</h2>
                <small>
                  {report.query.from} → {report.query.to}
                </small>
              </div>
              <div className="feature-tabs" aria-label="Kiểu biểu đồ">
                <button
                  type="button"
                  aria-pressed={chartType === "bar"}
                  onClick={() => setChartType("bar")}
                >
                  <i className="fa fa-bar-chart" aria-hidden="true" /> Cột
                </button>
                <button
                  type="button"
                  aria-pressed={chartType === "line"}
                  onClick={() => setChartType("line")}
                >
                  <i className="fa fa-line-chart" aria-hidden="true" /> Đường
                </button>
              </div>
            </div>
            {!report.orders && (
              <p className="feature-note">
                Không có đơn hoàn thành trong khoảng này. Bạn có thể chọn khoảng
                ngày khác.
              </p>
            )}
            <RevenueChart
              key={`${report.query.from}-${report.query.to}-${report.query.period}`}
              buckets={report.buckets}
              type={chartType}
            />
            <details className="report-data">
              <summary>Xem bảng số liệu theo kỳ</summary>
              <div className="workspace-table-wrap">
                <table className="workspace-table">
                  <thead>
                    <tr>
                      <th>Kỳ</th>
                      <th>Doanh thu</th>
                      <th>Đơn hoàn thành</th>
                      <th>Số sách</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.buckets.map((bucket) => (
                      <tr key={bucket.key}>
                        <td>{bucket.label}</td>
                        <td>{formatPrice(bucket.revenue)}</td>
                        <td>{bucket.orders}</td>
                        <td>{bucket.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>
          <section className="workspace-panel feature-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">ĐƯỢC BẠN ĐỌC LỰA CHỌN</span>
                <h2>Sách bán chạy</h2>
              </div>
              <small>Xếp theo số lượng, cùng khoảng báo cáo</small>
            </div>
            <div className="workspace-table-wrap">
              <table className="workspace-table">
                <thead>
                  <tr>
                    <th>Hạng</th>
                    <th>Cuốn sách</th>
                    <th>Đã bán</th>
                    <th>Doanh thu</th>
                  </tr>
                </thead>
                <tbody>
                  {report.bestSellers.slice(0, 20).map((book, i) => (
                    <tr key={book.productId}>
                      <td>
                        <span className="bestseller-rank">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                      </td>
                      <td>
                        <Link href={`/admin/products/${book.productId}`}>
                          {book.name}
                        </Link>
                      </td>
                      <td>{book.quantity}</td>
                      <td>
                        <strong>{formatPrice(book.revenue)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!report.bestSellers.length && (
              <p className="workspace-empty">
                Chưa có sách bán ra trong các đơn hoàn thành của kỳ này.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
