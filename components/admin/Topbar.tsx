"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const TITLES: Record<string, string> = {
  "/admin": "Tổng quan hoạt động",
  "/admin/chatbot": "Quản lý & cấu hình Chatbot AI",
  "/admin/reports": "Báo cáo & thống kê doanh thu",
  "/admin/orders": "Đơn mua sách",
  "/admin/products": "Quản lý đầu sách",
  "/admin/reviews": "Quản lý đánh giá",
  "/admin/products/new": "Thêm một đầu sách",
  "/admin/categories": "Thể loại & bộ sưu tập",
  "/admin/warranty": "Hỗ trợ đổi trả",
  "/admin/consultation": "Gợi ý dành cho người đọc",
};
export default function Topbar() {
  const pathname = usePathname();
  const title =
    TITLES[pathname] ??
    (pathname.startsWith("/admin/products/")
      ? "Biên tập đầu sách"
      : pathname.startsWith("/admin/orders/")
        ? "Chi tiết đơn mua sách"
        : "Không gian quản trị");
  return (
    <div className="workspace-page-heading">
      <div>
        <div className="workspace-breadcrumb">
          <Link href="/admin">Không gian quản trị</Link>
          <span>/</span>
          <span>{pathname === "/admin" ? "Tổng quan" : title}</span>
        </div>
        <h1>
          {title}
          <span>.</span>
        </h1>
      </div>
      <div className="workspace-heading-actions">
        <Link className="outline-button" href="/admin/chatbot">
          <i className="fa fa-comments-o" aria-hidden="true" /> Chăm sóc khách hàng
        </Link>
        <Link
          className="solid-button"
          id="admin-add-product-btn"
          href="/admin/products/new"
        >
          <i className="fa fa-plus" aria-hidden="true" /> Thêm sách
        </Link>
      </div>
    </div>
  );
}
