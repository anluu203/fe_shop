import Header from "../../components/client/Header";
import Footer from "../../components/client/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TechParts — Linh Kiện Máy Tính Chính Hãng",
  description:
    "Mua sắm linh kiện máy tính chính hãng: CPU, GPU, RAM, SSD, Mainboard với giá tốt nhất.",
};

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        background: "var(--bg-page)",
      }}
    >
      <Header />
      <main style={{ flex: 1 }}>{children}</main>
      <Footer />
    </div>
  );
}
