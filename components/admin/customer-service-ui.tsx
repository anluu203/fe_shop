import type { ReactNode } from "react";
import type { WarrantyStatus } from "../../lib/types/warranty";
import { WARRANTY_STATUS_LABEL } from "../../lib/services/warranty";

export const adminServiceClasses = {
  panel: "min-w-0 rounded-2xl border border-[var(--border)] bg-white p-4 sm:p-6",
  label: "flex min-w-0 flex-col gap-2 text-[13px] font-semibold text-[var(--text-secondary)]",
  control: "w-full min-w-0 rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm font-normal text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
  primary: "inline-flex items-center justify-center gap-2 rounded-xl border border-primary bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50",
  secondary: "inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-section)] disabled:cursor-not-allowed disabled:opacity-50",
  muted: "text-[13px] text-[var(--text-muted)]",
};

export function ServiceAdminIntro({ title, description, children, demo = true }: { title: string; description: string; children?: ReactNode; demo?: boolean }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        {demo && <span className="mb-2 inline-block rounded-full bg-[var(--primary-bg)] px-3 py-1 text-xs font-semibold text-primary-dark">Dữ liệu minh họa</span>}
        <h2 className="text-2xl font-extrabold text-[var(--text-primary)]">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm text-[var(--text-secondary)]">{description}</p>
      </div>
      {children}
    </div>
  );
}

export function ServiceFeedback({ warning, success, error }: { warning?: string; success?: string; error?: string }) {
  return (
    <div className="space-y-3 empty:hidden">
      {warning && <p role="alert" className="mb-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{warning}</p>}
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {success && <p role="status" className="mb-4 rounded-xl bg-green-50 p-4 text-sm text-green-800">{success}</p>}
    </div>
  );
}

export function WarrantyStatusBadge({ status }: { status: WarrantyStatus }) {
  return <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${status === "completed" ? "bg-green-50 text-green-700" : "bg-[var(--primary-bg)] text-primary-dark"}`}>{WARRANTY_STATUS_LABEL[status]}</span>;
}
