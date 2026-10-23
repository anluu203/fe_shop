import Header from "../../components/client/Header";
import Footer from "../../components/client/Footer";
import Chatbot from "../../components/client/Chatbot";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BookStore — Nhà Sách Trực Tuyến",
  description:
    "Khám phá sách văn học, kinh tế, kỹ năng sống, thiếu nhi và ngoại ngữ tại BookStore.",
};

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="client-app"
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
      <Chatbot />
    </div>
  );
}
