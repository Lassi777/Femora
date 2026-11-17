import { ORDER_STATUSES, paymentStatusLabel } from '../config';
import './OrderStatus.css';

export function StatusBadge({ status }) {
  return <span className={`sbadge sbadge--${status.replace(/\s+/g, '-').toLowerCase()}`}>{status}</span>;
}

export function StatusTimeline({ order }) {
  if (order.status === 'Cancelled') return <p className="otl__cancel">This order was cancelled.</p>;
  const idx = ORDER_STATUSES.indexOf(order.status);
  const at = (s) => (order.history || []).filter((h) => h.status === s).pop()?.at;
  return (
    <ol className="otl">
      {ORDER_STATUSES.map((s, i) => (
        <li key={s} className={i < idx ? 'is-done' : i === idx ? 'is-now' : ''}>
          <span className="otl__dot">{i <= idx ? '✓' : ''}</span>
          <span className="otl__label">{s}</span>
          {at(s) && <span className="otl__time">{new Date(at(s)).toLocaleDateString()}</span>}
        </li>
      ))}
    </ol>
  );
}

export function PaymentBadge({ status }) {
  return <span className={`pbadge pbadge--${String(status || 'none').toLowerCase()}`}>{paymentStatusLabel(status)}</span>;
}
