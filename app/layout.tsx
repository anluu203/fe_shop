import type { Metadata } from "next";
import MockNotice from "../components/client/MockNotice";
import { Inter } from "next/font/google";
import "./globals.css";
import "./bookstore.css";
import { AuthProvider } from "../contexts/AuthContext";
import { CartProvider } from "../contexts/CartContext";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--inter-font",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "BookStore — Nhà Sách Trực Tuyến",
  description:
    "Khám phá sách văn học, kinh tế, kỹ năng sống, thiếu nhi và ngoại ngữ tại BookStore.",
  keywords: "sách, nhà sách, văn học, thiếu nhi, sách kinh tế",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={inter.variable}>
      <head>
        {/* Preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body
        style={{
          fontFamily: "var(--inter-font, var(--font-sans))",
        }}
      >
        <AuthProvider>
          <CartProvider><MockNotice />{children}</CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
