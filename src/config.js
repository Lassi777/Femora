export const ADMIN = {
  username: 'Laasya',
  email: 'pinjalalaasya@gmail.com',
  // SHA-256 of "email:password:femora-v2" - the plain password is not stored in the code
  hash: 'c7c4e73425976dd35819e860e2dafec72c4f6de34d922d9353c66ca01c9074c7',
};
export const SUPPORT_EMAIL = ADMIN.email;
export const PRODUCT_TYPES = [
  { id: 'pads', label: 'Sanitary pads', desc: 'Worn in your underwear. Disposable, with no insertion.', inRange: true },
  { id: 'tampons', label: 'Tampons', desc: 'Worn internally. Disposable, in absorbency categories.', inRange: true },
  { id: 'cups', label: 'Menstrual cups', desc: 'A reusable internal cup you empty and wash.', inRange: true },
  { id: 'underwear', label: 'Period underwear (night panties)', desc: 'Washable underwear with built-in absorbency, often used overnight.', inRange: true },
  { id: 'unsure', label: 'Not sure yet', desc: 'Compare the options first, then choose a category.', inRange: true },
];
export const productTypeLabel = (id) => PRODUCT_TYPES.find((p) => p.id === id)?.label || 'Not specified';
export const PAYMENT_METHODS = { COD: 'Cash on Delivery', UPI: 'UPI', CREDIT_CARD: 'Credit Card', DEBIT_CARD: 'Debit Card' };
export const ONLINE_METHODS = ['UPI', 'CREDIT_CARD', 'DEBIT_CARD'];
const LEGACY_PAYMENT_LABELS = { CARD: 'Credit/Debit Card (older order)' };
export const PAYMENT_STATUSES = { PENDING: 'Pending', PAID: 'Paid', FAILED: 'Failed', REFUNDED: 'Refunded' };
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
// Older orders (before payment methods existed) have no payment fields; these fall back safely.
export const paymentMethodLabel = (m) => (has(PAYMENT_METHODS, m) ? PAYMENT_METHODS[m] : has(LEGACY_PAYMENT_LABELS, m) ? LEGACY_PAYMENT_LABELS[m] : 'Not recorded (older order)');
export const paymentStatusLabel = (s) => (has(PAYMENT_STATUSES, s) ? PAYMENT_STATUSES[s] : 'Not recorded');
// Anything that was not a real, verified transaction is a simulation (no gateway is configured).
export const isSimulatedPayment = (o) => Boolean(o) && o.paymentMethod !== 'COD' && ['UPI', 'CREDIT_CARD', 'DEBIT_CARD', 'CARD'].includes(o.paymentMethod);
export const ORDER_STATUSES = ['Placed', 'Confirmed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'];
export const ALL_STATUSES = [...ORDER_STATUSES, 'Cancelled'];
