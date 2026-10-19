"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import Sidebar from "../../components/admin/Sidebar";
import Topbar from "../../components/admin/Topbar";
import { PageSpinner } from "../../components/ui/Spinner";
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!isLoading && (!user || user.role !== "ADMIN"))
      router.replace("/client/auth/login");
  }, [user, isLoading, router]);
  if (isLoading) return <PageSpinner />;
  if (!user || user.role !== "ADMIN") return null;
  return (
    <div className="admin-app">
      <Sidebar />
      <main className="admin-content">
        <Topbar />
        {children}
      </main>
      <footer className="admin-footer">
        <strong>BookStore Workspace</strong>
        <span>Mỗi cuốn sách được chăm chút. Mỗi người đọc được quan tâm.</span>
      </footer>
    </div>
  );
}
