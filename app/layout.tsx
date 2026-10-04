import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../contexts/AuthContext";
import { CartProvider } from "../contexts/CartContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--inter-font",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "TechParts — Linh Kiện Máy Tính Chính Hãng",
  description:
    "Mua sắm linh kiện máy tính chính hãng: CPU, GPU, RAM, SSD, Mainboard với giá tốt nhất.",
  keywords: "linh kiện máy tính, cpu, gpu, ram, ssd, mainboard",
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
          <CartProvider>{children}</CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
