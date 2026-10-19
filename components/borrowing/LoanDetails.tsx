import type { Loan } from "../../lib/types/borrowing";
import {
  isLoanOverdue,
  LOAN_STATUS_LABEL,
  vietnamDate,
} from "../../lib/types/borrowing";

export const loanDate = (value: string | null) => {
  if (!value) return "Chưa xác định";
  const date = value.includes("T") ? vietnamDate(new Date(value)) : value;
  return date.split("-").reverse().join("/");
};
export function LoanBadge({ loan }: { loan: Loan }) {
  return (
    <span
      className={`loan-badge status-${isLoanOverdue(loan) ? "overdue" : loan.status}`}
    >
      {isLoanOverdue(loan) ? "Quá hạn trả" : LOAN_STATUS_LABEL[loan.status]}
    </span>
  );
}
export default function LoanDetails({ loan }: { loan: Loan }) {
  return (
    <div className="loan-detail-content">
      <dl className="loan-facts">
        <div>
          <dt>Người nhận</dt>
          <dd>{loan.contactName}</dd>
        </div>
        <div>
          <dt>Điện thoại</dt>
          <dd>{loan.phone}</dd>
        </div>
        <div>
          <dt>Ngày nhận dự kiến</dt>
          <dd>{loanDate(loan.pickupDate)}</dd>
        </div>
        <div>
          <dt>Thời hạn mượn</dt>
          <dd>{loan.durationDays} ngày</dd>
        </div>
        <div>
          <dt>Ngày bàn giao</dt>
          <dd>
            {loan.borrowedAt ? loanDate(loan.borrowedAt) : "Chưa nhận sách"}
          </dd>
        </div>
        <div>
          <dt>Hạn trả</dt>
          <dd>{loanDate(loan.dueDate)}</dd>
        </div>
        {loan.returnedAt && (
          <div>
            <dt>Đã trả ngày</dt>
            <dd>{loanDate(loan.returnedAt)}</dd>
          </div>
        )}
      </dl>
      <div className="loan-pickup">
        <i className="fa fa-map-marker" aria-hidden="true" />
        <div>
          <strong>{loan.storeName}</strong>
          <p>{loan.storeAddress}</p>
        </div>
      </div>
      {loan.customerNote && (
        <p className="loan-note">
          <strong>Ghi chú của bạn:</strong> {loan.customerNote}
        </p>
      )}
      <h4 className="loan-timeline-title">Lịch sử xử lý</h4>
      <ol className="loan-timeline">
        {loan.timeline.map((event, index) => (
          <li key={`${event.at}-${index}`}>
            <span className="timeline-dot" />
            <div>
              <strong>{LOAN_STATUS_LABEL[event.status]}</strong>
              <time dateTime={event.at}>{loanDate(event.at)}</time>
              <p>{event.note}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="loan-full-id">Mã phiếu: {loan.id}</p>
    </div>
  );
}
