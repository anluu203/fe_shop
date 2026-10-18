"use client";

import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="mt-auto bg-[#1a202c] text-[#e2e8f0]">
      <div className="mx-auto w-full max-w-7xl px-8 pt-12 pb-8">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-10">
          <div>
            <Link href="/client" aria-label="Tech Store — Trang chủ" className="mb-4 inline-block">
              <Image src="/images/Logo_Tech_Store_RGB.jpg" alt="Logo Tech Store" width={80} height={80}
                className="size-20 rounded-[var(--radius-md)] object-contain" />
            </Link>
            <p className="mb-4 text-[13px] leading-[1.7] text-[#a0aec0]">
              Chuyên cung cấp linh kiện máy tính chính hãng với giá tốt nhất.
              Uy tín — Chất lượng — Bảo hành.
            </p>
            <div className="flex gap-2.5">
              {["fa-facebook", "fa-instagram", "fa-twitter", "fa-youtube-play"].map((icon) => (
                <span key={icon} className="flex size-9 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] bg-white/8 text-base transition-colors">
                  <i className={`fa ${icon}`} />
                </span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="mb-4 text-[15px] font-bold text-white">Sản phẩm</h4>
            <ul className="flex list-none flex-col gap-2.5">
              {[
                { label: "CPU & Bộ xử lý", href: "/client/products" },
                { label: "Card đồ hoạ (GPU)", href: "/client/products" },
                { label: "RAM & Bộ nhớ", href: "/client/products" },
                { label: "Ổ cứng SSD", href: "/client/products" },
                { label: "Mainboard", href: "/client/products" },
              ].map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-[13px] text-[#a0aec0] no-underline transition-colors duration-200 hover:text-primary-light">{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-[15px] font-bold text-white">Hỗ trợ</h4>
            <ul className="flex list-none flex-col gap-2.5">
              <li><Link href="/client/warranty" className="text-[13px] text-[#a0aec0] hover:text-primary-light">Bảo hành</Link></li>
              <li><Link href="/client/consultation" className="text-[13px] text-[#a0aec0] hover:text-primary-light">Tư vấn chọn sản phẩm</Link></li>
              {["Hướng dẫn đặt hàng", "Chính sách đổi trả", "Câu hỏi thường gặp", "Liên hệ hỗ trợ"].map((item) => (
                <li key={item}><span className="cursor-pointer text-[13px] text-[#a0aec0]">{item}</span></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-[15px] font-bold text-white">Liên hệ</h4>
            <div className="flex flex-col gap-2.5 text-[13px] text-[#a0aec0]">
              <div className="flex items-center gap-2"><i className="fa fa-map-marker w-4 text-center" /><span>123 Nguyễn Trãi, Q.1, TP.HCM</span></div>
              <div className="flex items-center gap-2"><i className="fa fa-phone w-4 text-center" /><span>1900 1234</span></div>
              <div className="flex items-center gap-2"><i className="fa fa-envelope w-4 text-center" /><span>support@techparts.vn</span></div>
              <div className="flex items-center gap-2"><i className="fa fa-clock-o w-4 text-center" /><span>8:00 - 21:00 mỗi ngày</span></div>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-white/8 px-8 py-4">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <span className="text-xs text-[#718096]">© 2024 TechParts. Bảo lưu mọi quyền.</span>
          <div className="flex gap-5">
            {["Điều khoản sử dụng", "Bảo mật thông tin"].map((item) => (
              <span key={item} className="cursor-pointer text-xs text-[#718096]">{item}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
