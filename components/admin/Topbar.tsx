"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const TITLES: Record<string, string> = {
  "/admin": "Tổng quan hoạt động",
  "/admin/borrowing": "Mượn & trả sách",
  "/admin/orders": "Đơn mua sách",
  "/admin/products": "Quản lý đầu sách",
  "/admin/products/new": "Thêm một đầu sách",
  "/admin/categories": "Thể loại & bộ sưu tập",
  "/admin/stores": "Hệ thống nhà sách",
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
        <Link className="outline-button" href="/admin/borrowing">
          <i className="fa fa-exchange" aria-hidden="true" /> Xử lý phiếu mượn
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
