// Local, in-browser format checks for the payment SIMULATION forms. Nothing here is sent or stored anywhere.
const digitsOnly = (s) => String(s ?? '').replace(/[\s-]/g, '');

export function validateUpiId(raw) {
  const v = String(raw ?? '').trim();
  if (!v) return 'Enter your UPI ID (for example name@bank).';
  if (/\s/.test(v)) return 'A UPI ID cannot contain spaces.';
  if (!/^[A-Za-z0-9._-]{2,64}@[A-Za-z][A-Za-z0-9]{1,31}$/.test(v)) return 'Enter a valid UPI ID in the format name@bank.';
  return '';
}
/** Safe-to-store metadata only: keeps two characters of the handle, hides the rest (never the PIN, which we never ask for). */
export function maskUpi(raw) {
  const v = String(raw ?? '').trim();
  const at = v.indexOf('@');
  if (at < 1) return null;
  return `${v.slice(0, Math.min(2, at))}***${v.slice(at)}`;
}

export function luhn(num) {
  const d = digitsOnly(num);
  if (!/^\d+$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i]);
    if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
  }
  return sum % 10 === 0;
}
export function cardBrand(num) {
  const d = digitsOnly(num);
  if (/^3[47]/.test(d)) return 'American Express';
  if (/^4/.test(d)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(d)) return 'Mastercard';
  if (/^(60|65|81|82|508)/.test(d)) return 'RuPay';
  return '';
}
export function validateCardNumber(raw) {
  const s = String(raw ?? '');
  if (!s.trim()) return 'Enter your card number.';
  if (!/^[\d\s-]+$/.test(s)) return 'Card number can only contain digits and spaces.';
  const d = digitsOnly(s);
  const brand = cardBrand(d);
  if (brand === 'American Express' ? d.length !== 15 : d.length < 13 || d.length > 19) return brand === 'American Express' ? 'American Express numbers have 15 digits.' : 'Card numbers have 13 to 19 digits.';
  if (brand !== 'American Express' && brand && d.length === 15) return 'This card number has the wrong length.';
  if (!luhn(d)) return 'This card number is not valid. Please check it.';
  return '';
}
export function formatCardNumber(raw) {
  const d = digitsOnly(raw).replace(/\D/g, '').slice(0, 19);
  if (/^3[47]/.test(d)) return [d.slice(0, 4), d.slice(4, 10), d.slice(10, 15)].filter(Boolean).join(' ');
  return d.replace(/(.{4})/g, '$1 ').trim();
}
export function validateCardName(raw) {
  const v = String(raw ?? '').trim();
  if (!v) return "Enter the cardholder's name.";
  if (v.length < 2 || !/^[\p{L}][\p{L}\s.'’-]*$/u.test(v)) return 'Enter the name as shown on the card (letters only).';
  return '';
}
export function validateExpiry(month, year, now = new Date()) {
  const m = Number(month), y = Number(year);
  if (!month || !year) return 'Choose the expiry month and year.';
  if (!Number.isInteger(m) || m < 1 || m > 12 || !Number.isInteger(y)) return 'Choose a valid expiry date.';
  const curY = now.getFullYear(), curM = now.getMonth() + 1;
  if (y < curY || (y === curY && m < curM)) return 'This card has expired.';
  if (y > curY + 20) return 'Choose a valid expiry date.';
  return '';
}
export function validateCvv(raw, number = '') {
  const v = String(raw ?? '');
  if (!v) return 'Enter the CVV.';
  const need = cardBrand(number) === 'American Express' ? 4 : 3;
  if (!/^\d+$/.test(v) || v.length !== need) return `CVV must be ${need} digits.`;
  return '';
}
export function validateCard(c) {
  return { name: validateCardName(c.name), number: validateCardNumber(c.number), expiry: validateExpiry(c.month, c.year), cvv: validateCvv(c.cvv, c.number) };
}
export const isClean = (errs) => Object.values(errs).every((e) => !e);
