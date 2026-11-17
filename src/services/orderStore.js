// Order persistence + state rules. Every mutation re-reads the latest stored orders, applies a validated
// rule, and writes back, so stale UI state can never overwrite a newer status (e.g. a cancellation).
// NOTE: this is a browser-only prototype; these rules are not server-enforced security.
import { ALL_STATUSES, PAYMENT_METHODS } from '../config.js';
import { validatePack } from './products.js';

export const ORDERS_KEY = 'femora_orders_v2';
export const CANCELLABLE = ['Placed', 'Confirmed'];
export const LOCKED_MESSAGE = 'This order was cancelled and is locked. Its status can no longer be changed.';

export function loadOrders(storage) {
  try {
    const v = JSON.parse(storage.getItem(ORDERS_KEY) || '[]');
    return Array.isArray(v) ? v.filter((o) => o && typeof o === 'object' && typeof o.id === 'string') : [];
  } catch { return []; }
}
const save = (storage, orders) => { try { storage.setItem(ORDERS_KEY, JSON.stringify(orders)); return true; } catch { return false; } };
const now = () => new Date().toISOString();

/* ---- pure rules ---- */
export function applyCancel(orders, id, email) {
  const o = orders.find((x) => x.id === id);
  if (!o) return { ok: false, error: 'Order not found.', orders };
  if (!email || o.userEmail !== email) return { ok: false, error: 'You can only cancel your own orders.', orders };
  if (o.status === 'Cancelled') return { ok: false, error: 'This order is already cancelled.', orders };
  if (!CANCELLABLE.includes(o.status)) return { ok: false, error: 'This order can no longer be cancelled.', orders };
  const next = orders.map((x) => (x.id === id ? { ...x, status: 'Cancelled', history: [...(x.history || []), { status: 'Cancelled', at: now(), note: 'Cancelled by customer' }] } : x));
  return { ok: true, orders: next };
}

export function applyStatus(orders, id, status, note, role) {
  if (role !== 'admin') return { ok: false, error: 'Only an admin can update order status.', orders };
  if (!ALL_STATUSES.includes(status)) return { ok: false, error: 'Unknown status.', orders };
  const o = orders.find((x) => x.id === id);
  if (!o) return { ok: false, error: 'Order not found.', orders };
  if (o.status === 'Cancelled') return { ok: false, error: LOCKED_MESSAGE, orders };
  const cleanNote = typeof note === 'string' ? note.trim() : '';
  if (status === o.status && !cleanNote) return { ok: true, unchanged: true, orders };
  const next = orders.map((x) => (x.id === id ? { ...x, status, history: [...(x.history || []), { status, at: now(), note: cleanNote }] } : x));
  return { ok: true, orders: next };
}

/* ---- storage-backed mutations (always fresh read) ---- */
function run(storage, rule) {
  const r = rule(loadOrders(storage));
  if (r.ok && !r.unchanged && !save(storage, r.orders)) return { ok: false, error: 'Could not save to browser storage.', orders: r.orders };
  return r;
}
export const cancelOrderInStorage = (storage, id, email) => run(storage, (o) => applyCancel(o, id, email));
export const setStatusInStorage = (storage, id, status, note, role) => run(storage, (o) => applyStatus(o, id, status, note, role));

/** Builds a trusted order: totals and line prices come from the catalogue, never from client state. */
export function addOrderInStorage(storage, draft) {
  const { user, productType, pack, address, recommendation, paymentMethod, paymentMeta } = draft || {};
  if (!user?.email) return { ok: false, error: 'Please log in to place an order.' };
  if (!Object.prototype.hasOwnProperty.call(PAYMENT_METHODS, paymentMethod)) return { ok: false, error: 'Please choose a payment method.' };
  const v = validatePack(productType, pack);
  if (!v.ok) return { ok: false, error: v.error };
  const order = {
    id: draft.id || `FEM-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
    date: now(), userEmail: user.email, userName: user.name, userPhone: user.phone, userAge: user.age,
    productType, pack: v.pack, lines: v.lines, count: v.count, total: v.total, address,
    recommendationVariation: recommendation?.variationId || null,
    // No payment gateway is connected, so a payment can never be recorded as PAID here.
    paymentMethod, paymentStatus: 'PENDING', paymentProvider: null, paymentMode: paymentMethod === 'COD' ? 'cod' : 'simulation',
    // Only a masked UPI handle may be kept. Card data, CVV and expiry are never accepted or stored.
    paymentMeta: paymentMethod === 'UPI' && typeof paymentMeta?.upiMasked === 'string' && /^[A-Za-z0-9._-]{1,2}\*{3}@[A-Za-z0-9]+$/.test(paymentMeta.upiMasked) ? { upiMasked: paymentMeta.upiMasked } : null,
    status: 'Placed', history: [{ status: 'Placed', at: now(), note: '' }],
  };
  // Idempotent: re-submitting the same checkout (double click, refresh, retry) returns the existing order.
  const existing = loadOrders(storage).find((x) => x.id === order.id);
  if (existing) return existing.userEmail === user.email ? { ok: true, order: existing, duplicate: true } : { ok: false, error: 'Duplicate order id.' };
  const r = run(storage, (orders) => ({ ok: true, orders: [order, ...orders] }));
  return r.ok ? { ok: true, order } : r;
}
