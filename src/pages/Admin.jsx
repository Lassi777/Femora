import { useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { StatusBadge, PaymentBadge, StatusTimeline } from '../components/OrderStatus';
import { useUser } from '../context/UserContext';
import { ALL_STATUSES, productTypeLabel, paymentMethodLabel, paymentStatusLabel, isSimulatedPayment } from '../config';
import { LOCKED_MESSAGE } from '../services/orderStore';
import { packLines, unitLabel } from '../services/products';
import './Admin.css';

export function adminStats(orders, customers) {
  const live = orders.filter((o) => o.status !== 'Cancelled');
  return {
    total: orders.length,
    pending: orders.filter((o) => !['Delivered', 'Cancelled'].includes(o.status)).length,
    delivered: orders.filter((o) => o.status === 'Delivered').length,
    revenue: live.reduce((s, o) => s + o.total, 0),
    customers: customers.length,
  };
}

function csv(orders) {
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [['Order ID', 'Date', 'Customer', 'Email', 'Phone', 'Pads', 'Total', 'Address', 'Payment method', 'Payment status', 'Status']];
  orders.forEach((o) => rows.push([o.id, new Date(o.date).toLocaleString(), o.userName, o.userEmail, o.userPhone || o.address?.phone,
    o.count, o.total, `${o.address?.line1} ${o.address?.line2 || ''}, ${o.address?.city}, ${o.address?.state} ${o.address?.pincode}`, paymentMethodLabel(o.paymentMethod), paymentStatusLabel(o.paymentStatus) + (isSimulatedPayment(o) ? ' (simulated)' : ''), o.status]));
  const blob = new Blob([rows.map((r) => r.map(q).join(',')).join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'femora-orders.csv'; a.click();
  URL.revokeObjectURL(a.href);
}

export default function Admin() {
  const { orders, customers, updateOrderStatus } = useUser();
  const [tab, setTab] = useState('orders');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('All');
  const [open, setOpen] = useState(null);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  const s = adminStats(orders, customers);

  const shown = useMemo(() => orders.filter((o) =>
    (filter === 'All' || o.status === filter) &&
    `${o.id} ${o.userName} ${o.userEmail}`.toLowerCase().includes(q.toLowerCase())), [orders, q, filter]);

  const byCustomer = (email) => orders.filter((o) => o.userEmail === email);

  return (
    <div className="adminpage">
      <Navbar />
      <div className="container adminpage__wrap">
        <span className="eyebrow-plain">Admin dashboard · Demo mode</span>
        <p className="aempty" style={{ textAlign: 'left', marginTop: 12 }}>Demo mode: accounts and orders are stored in this browser only and the admin login is checked in the browser, so this is not secure production authentication. Orders are not real purchases.</p>
        <h1 className="adminpage__title">Orders &amp; customers</h1>

        <div className="astats">
          {[['Total orders', s.total], ['In progress', s.pending], ['Delivered', s.delivered], ['Customers', s.customers], ['Demo revenue (not real sales)', `₹${s.revenue}`]].map(([l, v]) => (
            <div className="astat" key={l}><span className="astat__v">{v}</span><span className="astat__l">{l}</span></div>
          ))}
        </div>

        <div className="atabs">
          <button className={tab === 'orders' ? 'is-on' : ''} onClick={() => setTab('orders')}>Orders ({orders.length})</button>
          <button className={tab === 'customers' ? 'is-on' : ''} onClick={() => setTab('customers')}>Customers ({customers.length})</button>
        </div>

        {tab === 'orders' && (
          <>
            <div className="atools">
              <input className="field-input" placeholder="Search order ID, name or email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search orders" />
              <select className="field-input" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by status">
                {['All', ...ALL_STATUSES].map((x) => <option key={x}>{x}</option>)}
              </select>
              <button className="btn btn-secondary" disabled={!shown.length} onClick={() => csv(shown)}>Export CSV</button>
            </div>

            {msg && <p className="field-error" role="alert">{msg}</p>}
            {orders.length === 0 && <p className="aempty">No orders have been placed yet. They will appear here as soon as a customer places one.</p>}
            {orders.length > 0 && shown.length === 0 && <p className="aempty">No orders match your search.</p>}

            <div className="alist">
              {shown.map((o) => (
                <div className="acard" key={o.id}>
                  <div className="acard__row">
                    <button className="acard__main" onClick={() => { setOpen(open === o.id ? null : o.id); setNote(''); }} aria-expanded={open === o.id}>
                      <strong>{o.id}</strong>
                      <span>{o.userName}<small>{o.userEmail}</small></span>
                      <span>{o.count} {unitLabel(o.productType || 'pads', o.count)} · ₹{o.total}<small>{paymentMethodLabel(o.paymentMethod)} · {paymentStatusLabel(o.paymentStatus)}{isSimulatedPayment(o) ? ' (simulated)' : ''}</small></span>
                      <span className="acard__date">{new Date(o.date).toLocaleDateString()}</span>
                    </button>
                    <div className="acard__status">
                      <StatusBadge status={o.status} />
                      {o.status === 'Cancelled' ? (
                        <span className="acard__locked" title={LOCKED_MESSAGE}>🔒 Locked · cancelled</span>
                      ) : (
                        <select className="field-input" value={o.status} aria-label={`Update status of ${o.id}`}
                          onChange={(e) => { const r = updateOrderStatus(o.id, e.target.value); setMsg(r.ok ? '' : r.error); }}>
                          {ALL_STATUSES.map((x) => <option key={x}>{x}</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                  {open === o.id && (
                    <div className="acard__detail">
                      <div className="adetail">
                        <div>
                          <h4>Customer</h4>
                          <p>{o.userName}<br />{o.userEmail}<br />{o.userPhone || o.address?.phone || '—'}{o.userAge ? <><br />Age {o.userAge}</> : null}</p>
                        </div>
                        <div>
                          <h4>Delivery address</h4>
                          <p>{o.address?.line1}{o.address?.line2 ? `, ${o.address.line2}` : ''}<br />{o.address?.city}, {o.address?.state} {o.address?.pincode}{o.address?.phone ? <><br />{o.address.phone}</> : null}</p>
                        </div>
                        <div>
                          <h4>Items</h4>
                          <p>{(o.lines || packLines(o.pack)).map((l) => <span key={l.id} style={{ display: 'block' }}>{l.name} × {l.qty} (₹{l.price} each)</span>)}
                            <strong>Total ₹{o.total}</strong> <br />Product type: {productTypeLabel(o.productType)} · {o.count} {unitLabel(o.productType || 'pads', o.count)}</p>
                        </div>
                      </div>
                      <p className="apay"><strong>Payment:</strong> {paymentMethodLabel(o.paymentMethod)} <PaymentBadge status={o.paymentStatus} />{isSimulatedPayment(o) && <span className="pbadge pbadge--none">Simulated · no real transaction</span>}{o.paymentMeta?.upiMasked && <span>UPI ID: {o.paymentMeta.upiMasked}</span>}
                        <small>Payment status is separate from the order status and is not changed by status updates.</small></p>
                      <StatusTimeline order={o} />
                      {o.status === 'Cancelled' ? <p className="aempty" role="note">{LOCKED_MESSAGE}</p> : (
                      <div className="anote">
                        <input className="field-input" placeholder="Optional note for the customer (e.g. courier name)" value={note} onChange={(e) => setNote(e.target.value)} />
                        <button className="btn btn-ghost" disabled={!note.trim()} onClick={() => {
                          const r = updateOrderStatus(o.id, o.status, note.trim()); setMsg(r.ok ? '' : r.error); setNote('');
                        }}>Add note</button>
                      </div>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'customers' && (
          customers.length === 0 ? <p className="aempty">No customers have signed up yet.</p> : (
            <div className="alist">
              {customers.map((c) => {
                const mine = byCustomer(c.email);
                return (
                  <div className="acard" key={c.email}>
                    <div className="acard__row acard__row--cust">
                      <strong>{c.name}</strong>
                      <span>{c.email}</span>
                      <span>{c.phone} · Age {c.age}</span>
                      <span>{mine.length} order{mine.length === 1 ? '' : 's'} · ₹{mine.filter((o) => o.status !== 'Cancelled').reduce((t, o) => t + o.total, 0)}</span>
                      <span className="acard__date">Joined {new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
      <Footer />
    </div>
  );
}
