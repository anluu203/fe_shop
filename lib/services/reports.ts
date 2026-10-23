import type { Order } from "../types";
import type {
  BestSeller,
  ReportQuery,
  RevenueBucket,
  RevenueReport,
} from "../types/reports";

const DAY = 86400000;
export function vietnamDate(date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
export function defaultReportQuery(): ReportQuery {
  const to = vietnamDate();
  return { from: `${to.slice(0, 7)}-01`, to, period: "day" };
}
function dateValue(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error("Ngày báo cáo không hợp lệ.");
  const time = Date.parse(`${value}T00:00:00Z`);
  if (
    !Number.isFinite(time) ||
    new Date(time).toISOString().slice(0, 10) !== value
  )
    throw new Error("Ngày báo cáo không hợp lệ.");
  return time;
}
export function validateReportQuery(query: ReportQuery) {
  if (!["day", "week", "month", "year"].includes(query.period))
    throw new Error("Kỳ báo cáo không hợp lệ.");
  const start = dateValue(query.from),
    end = dateValue(query.to);
  if (start > end)
    throw new Error("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.");
  if ((end - start) / DAY > 3660)
    throw new Error("Khoảng báo cáo tối đa 10 năm.");
  if (query.period === "day" && (end - start) / DAY > 365)
    throw new Error(
      "Biểu đồ theo ngày tối đa 366 ngày. Hãy chọn tuần, tháng hoặc năm.",
    );
  return { start, end };
}
function bucketKey(date: string, period: ReportQuery["period"]): string {
  if (period === "year") return date.slice(0, 4);
  if (period === "month") return date.slice(0, 7);
  if (period === "week") {
    const time = dateValue(date);
    const weekday = new Date(time).getUTCDay();
    return new Date(time - ((weekday + 6) % 7) * DAY)
      .toISOString()
      .slice(0, 10);
  }
  return date;
}
function label(key: string, period: ReportQuery["period"]): string {
  if (period === "year") return key;
  if (period === "month") return `${key.slice(5, 7)}/${key.slice(0, 4)}`;
  return `${period === "week" ? "Tuần " : ""}${key.slice(8, 10)}/${key.slice(5, 7)}/${key.slice(0, 4)}`;
}

export function buildRevenueReport(
  orders: Order[],
  query: ReportQuery,
): RevenueReport {
  const { start, end } = validateReportQuery(query);
  const buckets = new Map<string, RevenueBucket>();
  for (let time = start; time <= end; time += DAY) {
    const key = bucketKey(
      new Date(time).toISOString().slice(0, 10),
      query.period,
    );
    if (!buckets.has(key))
      buckets.set(key, {
        key,
        label: label(key, query.period),
        revenue: "0",
        orders: 0,
        quantity: 0,
      });
  }
  const books = new Map<string, BestSeller>();
  let revenue = BigInt(0),
    orderCount = 0,
    quantity = 0;
  for (const order of orders) {
    if (order.status !== "Done") continue;
    const completed = order.completedAt ?? order.updatedAt ?? order.createdAt;
    if (!completed || !Number.isFinite(Date.parse(completed))) continue;
    const date = vietnamDate(new Date(completed));
    if (date < query.from || date > query.to) continue;
    const bucket = buckets.get(bucketKey(date, query.period))!;
    revenue += BigInt(order.totalPrice);
    bucket.revenue = (
      BigInt(bucket.revenue) + BigInt(order.totalPrice)
    ).toString();
    bucket.orders++;
    orderCount++;
    for (const item of order.items) {
      const sold = BigInt(item.unitPrice) * BigInt(item.quantity);
      const book = books.get(item.productId) ?? {
        productId: item.productId,
        name: item.product.name,
        quantity: 0,
        revenue: "0",
      };
      book.quantity += item.quantity;
      book.revenue = (BigInt(book.revenue) + sold).toString();
      books.set(item.productId, book);
      quantity += item.quantity;
      bucket.quantity += item.quantity;
    }
  }
  return {
    query,
    revenue: revenue.toString(),
    orders: orderCount,
    quantity,
    averageOrder: orderCount ? (revenue / BigInt(orderCount)).toString() : "0",
    buckets: [...buckets.values()],
    bestSellers: [...books.values()].sort(
      (a, b) =>
        b.quantity - a.quantity ||
        (BigInt(a.revenue) > BigInt(b.revenue)
          ? -1
          : BigInt(a.revenue) < BigInt(b.revenue)
            ? 1
            : a.productId.localeCompare(b.productId)),
    ),
  };
}

export function reportCSV(report: RevenueReport): string {
  const cell = (value: string | number) =>
    `"${String(value)
      .replace(/^[=+@\-\t\r]/, "'$&")
      .replace(/"/g, '""')}"`;
  const rows: (string | number)[][] = [
    ["Báo cáo doanh thu", report.query.from, report.query.to],
    ["Kỳ", "Doanh thu (VND)", "Đơn hoàn thành", "Số sách"],
    ...report.buckets.map((b) => [b.label, b.revenue, b.orders, b.quantity]),
    ["Tổng", report.revenue, report.orders, report.quantity],
    [],
    ["Sách bán chạy", "Số lượng", "Doanh thu (VND)"],
    ...report.bestSellers.map((b) => [b.name, b.quantity, b.revenue]),
  ];
  return "\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n");
}
