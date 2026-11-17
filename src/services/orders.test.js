import test from 'node:test';
import assert from 'node:assert/strict';
import { loadOrders, cancelOrderInStorage, setStatusInStorage, addOrderInStorage, applyStatus } from './orderStore.js';

const mem = () => { const d = {}; return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, _d: d }; };
const user = (n) => ({ email: `u${n}@x.com`, name: `U${n}`, phone: '9876543210', age: 22 });
const addr = { line1: 'a', city: 'c', state: 's', pincode: '500001' };
const place = (st, n, pack = { MEDIUM: 2 }, type = 'pads') => addOrderInStorage(st, { user: user(n), productType: type, pack, address: addr, recommendation: null, paymentMethod: 'COD', id: `O${n}${Math.random().toString(36).slice(2, 5)}` });

test('customer cancels an eligible order; it persists across a "refresh"', () => {
  const st = mem(); const { order } = place(st, 1);
  const r = cancelOrderInStorage(st, order.id, 'u1@x.com');
  assert.equal(r.ok, true);
  assert.equal(loadOrders(st)[0].status, 'Cancelled');
  assert.equal(loadOrders(mem.call ? st : st)[0].status, 'Cancelled');
});
test('admin cannot move a cancelled order to ANY status', () => {
  const st = mem(); const { order } = place(st, 1);
  cancelOrderInStorage(st, order.id, 'u1@x.com');
  for (const s of ['Placed', 'Confirmed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled']) {
    const r = setStatusInStorage(st, order.id, s, '', 'admin');
    assert.equal(r.ok, false);
    assert.equal(loadOrders(st)[0].status, 'Cancelled');
  }
  const before = JSON.stringify(loadOrders(st));
  assert.equal(setStatusInStorage(st, order.id, 'Cancelled', 'adding a note', 'admin').ok, false);
  assert.equal(JSON.stringify(loadOrders(st)), before);
});
test('stale admin view cannot restore an old status after cancellation', () => {
  const st = mem(); const { order } = place(st, 1);
  const stale = loadOrders(st);               // admin tab loaded this earlier
  cancelOrderInStorage(st, order.id, 'u1@x.com');
  assert.equal(applyStatus(stale, order.id, 'Shipped', '', 'admin').ok, true); // pure rule on stale data would pass...
  assert.equal(setStatusInStorage(st, order.id, 'Shipped', '', 'admin').ok, false); // ...but the stored mutation re-reads and rejects
  assert.equal(loadOrders(st)[0].status, 'Cancelled');
});
test('repeated cancellation is safe and does not corrupt history', () => {
  const st = mem(); const { order } = place(st, 1);
  cancelOrderInStorage(st, order.id, 'u1@x.com');
  const hist = loadOrders(st)[0].history.length;
  assert.equal(cancelOrderInStorage(st, order.id, 'u1@x.com').ok, false);
  assert.equal(loadOrders(st)[0].history.length, hist);
});
test('cancellation checks ownership, existence and eligibility', () => {
  const st = mem(); const { order } = place(st, 1);
  assert.equal(cancelOrderInStorage(st, order.id, 'u2@x.com').ok, false);
  assert.equal(cancelOrderInStorage(st, 'nope', 'u1@x.com').ok, false);
  setStatusInStorage(st, order.id, 'Shipped', '', 'admin');
  assert.equal(cancelOrderInStorage(st, order.id, 'u1@x.com').ok, false);
  assert.equal(loadOrders(st)[0].status, 'Shipped');
});
test('normal orders still follow valid admin transitions; customers cannot set status', () => {
  const st = mem(); const { order } = place(st, 1);
  for (const s of ['Confirmed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered']) {
    assert.equal(setStatusInStorage(st, order.id, s, '', 'admin').ok, true);
    assert.equal(loadOrders(st)[0].status, s);
  }
  assert.equal(setStatusInStorage(st, order.id, 'Placed', '', 'user').ok, false);
  assert.equal(setStatusInStorage(st, order.id, 'Bogus', '', 'admin').ok, false);
});
test('cancelling one order does not affect others', () => {
  const st = mem(); const a = place(st, 1).order; const b = place(st, 2).order;
  cancelOrderInStorage(st, a.id, 'u1@x.com');
  const o = loadOrders(st);
  assert.equal(o.find((x) => x.id === a.id).status, 'Cancelled');
  assert.equal(o.find((x) => x.id === b.id).status, 'Placed');
  assert.equal(setStatusInStorage(st, b.id, 'Confirmed', '', 'admin').ok, true);
});
test('order totals come from the catalogue, ignoring client prices', () => {
  const st = mem();
  assert.equal(addOrderInStorage(st, { user: user(1), productType: 'tampons', pack: { TAMPON_SUPER: 3, price: 1 }, address: addr, paymentMethod: 'COD' }).ok, false);
  const r = addOrderInStorage(st, { user: user(1), productType: 'tampons', pack: { TAMPON_SUPER: 3 }, total: 1, address: addr, paymentMethod: 'UPI' });
  assert.equal(r.ok, true); assert.equal(r.order.total, 30); assert.equal(r.order.count, 3); assert.equal(r.order.productType, 'tampons');
  assert.equal(r.order.lines[0].price, 10);
});
test('invalid packs are rejected (wrong type, bad qty, empty)', () => {
  const st = mem();
  assert.equal(place(st, 1, { MEDIUM: 2 }, 'tampons').ok, false);
  assert.equal(place(st, 1, { TAMPON_SUPER: -1 }, 'tampons').ok, false);
  assert.equal(place(st, 1, { TAMPON_SUPER: 1.5 }, 'tampons').ok, false);
  assert.equal(place(st, 1, { TAMPON_SUPER: 999 }, 'tampons').ok, false);
  assert.equal(place(st, 1, {}, 'tampons').ok, false);
  assert.equal(place(st, 1, { NOPE: 2 }, 'pads').ok, false);
  assert.equal(loadOrders(st).length, 0);
});
test('malformed stored data does not crash', () => {
  const st = mem(); st.setItem('femora_orders_v2', '{"x":1}'); assert.deepEqual(loadOrders(st), []);
  st.setItem('femora_orders_v2', 'not json'); assert.deepEqual(loadOrders(st), []);
  st.setItem('femora_orders_v2', '[null, 3, {"id":"A","status":"Placed"}]'); assert.equal(loadOrders(st).length, 1);
});

/* ---------- Payment method integration ---------- */
const placePay = (st, n, method, pack = { MEDIUM: 2 }, id) => addOrderInStorage(st, { user: user(n), productType: 'pads', pack, address: addr, paymentMethod: method, id });

test('COD, UPI, Credit Card and Debit Card orders store the chosen method with a PENDING payment status', () => {
  const st = mem();
  for (const m of ['COD', 'UPI', 'CREDIT_CARD', 'DEBIT_CARD']) {
    const r = placePay(st, 1, m);
    assert.equal(r.ok, true); assert.equal(r.order.paymentMethod, m); assert.equal(r.order.paymentStatus, 'PENDING');
    assert.equal(r.order.paymentMode, m === 'COD' ? 'cod' : 'simulation'); assert.equal(r.order.status, 'Placed');
  }
  assert.deepEqual(loadOrders(st).map((o) => o.paymentMethod).sort(), ['COD', 'CREDIT_CARD', 'DEBIT_CARD', 'UPI']);
  assert.ok(loadOrders(st).every((o) => o.paymentStatus === 'PENDING'));
});
test('a payment method is required and must be a known value', () => {
  const st = mem();
  for (const m of [undefined, null, '', 'ONLINE', 'cod', 'PAID', 'CARD', 'Demo (no payment)', '__proto__']) assert.equal(placePay(st, 1, m).ok, false);
  assert.equal(loadOrders(st).length, 0);
});
test('a client cannot supply a paid status, a total, or card data', () => {
  const st = mem();
  const r = addOrderInStorage(st, { user: user(1), productType: 'pads', pack: { MEDIUM: 2 }, address: addr, paymentMethod: 'CREDIT_CARD', paymentStatus: 'PAID', total: 1, cardNumber: '4111111111111111', cvv: '123', expiry: '12/30', paymentMeta: { cardNumber: '4111111111111111', cvv: '123' } });
  assert.equal(r.order.paymentStatus, 'PENDING'); assert.equal(r.order.total, 2 * 12);
  const raw = JSON.stringify(st._d);
  for (const bad of ['4111', 'cvv', 'cardNumber', '12/30', '"123"']) assert.ok(!raw.includes(bad), bad);
  assert.equal(r.order.paymentMeta, null);
});
test('submitting the same checkout twice does not create a duplicate order', () => {
  const st = mem();
  const a = placePay(st, 1, 'COD', { MEDIUM: 2 }, 'FEM-DUP1'); const b = placePay(st, 1, 'COD', { MEDIUM: 2 }, 'FEM-DUP1');
  assert.equal(a.ok && b.ok, true); assert.equal(b.duplicate, true);
  assert.equal(loadOrders(st).length, 1);
  assert.equal(placePay(st, 2, 'COD', { MEDIUM: 2 }, 'FEM-DUP1').ok, false); // another customer cannot reuse the id
});
test('fulfilment status updates and cancellation never change the payment fields', () => {
  const st = mem(); const o = placePay(st, 1, 'UPI').order;
  for (const s of ['Confirmed', 'Packed', 'Shipped', 'Delivered']) setStatusInStorage(st, o.id, s, '', 'admin');
  let cur = loadOrders(st)[0]; assert.equal(cur.paymentStatus, 'PENDING'); assert.equal(cur.paymentMethod, 'UPI');
  const o2 = placePay(st, 2, 'COD').order;
  cancelOrderInStorage(st, o2.id, 'u2@x.com');
  cur = loadOrders(st).find((x) => x.id === o2.id);
  assert.equal(cur.status, 'Cancelled'); assert.equal(cur.paymentStatus, 'PENDING'); assert.equal(cur.paymentMethod, 'COD');
  assert.equal(setStatusInStorage(st, o2.id, 'Shipped', '', 'admin').ok, false); // still locked
});
test('older orders without payment fields still load and get safe labels', async () => {
  const { paymentMethodLabel, paymentStatusLabel, PAYMENT_METHODS } = await import('../config.js');
  const st = mem(); st.setItem('femora_orders_v2', JSON.stringify([{ id: 'OLD1', status: 'Placed', paymentMethod: 'Demo (no payment)' }, { id: 'OLD2', status: 'Placed' }]));
  const o = loadOrders(st);
  assert.equal(o.length, 2);
  assert.equal(paymentMethodLabel(o[0].paymentMethod), 'Not recorded (older order)'); assert.equal(paymentMethodLabel(o[1].paymentMethod), 'Not recorded (older order)');
  assert.equal(paymentStatusLabel(o[1].paymentStatus), 'Not recorded');
  assert.deepEqual(Object.values(PAYMENT_METHODS), ['Cash on Delivery', 'UPI', 'Credit Card', 'Debit Card']);
  assert.equal(paymentMethodLabel('CARD'), 'Credit/Debit Card (older order)'); assert.equal(paymentMethodLabel('__proto__'), 'Not recorded (older order)');
  assert.equal(setStatusInStorage(st, 'OLD1', 'Confirmed', '', 'admin').ok, true);
});

test('only a masked UPI handle may be stored with an order', () => {
  const st = mem();
  const ok = addOrderInStorage(st, { user: user(1), productType: 'pads', pack: { MEDIUM: 1 }, address: addr, paymentMethod: 'UPI', paymentMeta: { upiMasked: 'ra***@okaxis' } });
  assert.deepEqual(ok.order.paymentMeta, { upiMasked: 'ra***@okaxis' });
  const raw = addOrderInStorage(st, { user: user(1), productType: 'pads', pack: { MEDIUM: 1 }, address: addr, paymentMethod: 'UPI', paymentMeta: { upiMasked: 'rahul@okaxis' } });
  assert.equal(raw.order.paymentMeta, null);                       // an unmasked ID is refused
  const cod = addOrderInStorage(st, { user: user(1), productType: 'pads', pack: { MEDIUM: 1 }, address: addr, paymentMethod: 'COD', paymentMeta: { upiMasked: 'ra***@okaxis' } });
  assert.equal(cod.order.paymentMeta, null);
});
