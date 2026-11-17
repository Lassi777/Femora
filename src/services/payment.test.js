import test from 'node:test';
import assert from 'node:assert/strict';
import { validateUpiId, maskUpi, luhn, validateCardNumber, formatCardNumber, validateCardName, validateExpiry, validateCvv, validateCard, isClean, cardBrand } from './paymentValidation.js';

test('UPI ID: empty, malformed and valid', () => {
  for (const bad of ['', '   ', 'abc', 'abc@', '@upi', 'a b@upi', 'name@@upi', 'name@up i', 'n@upi', 'name@1bank', 'name@']) assert.notEqual(validateUpiId(bad), '', `"${bad}" should be invalid`);
  for (const ok of ['rahul@okaxis', 'rahul.k-1@ybl', '9876543210@paytm', 'Teja_Sree@oksbi']) assert.equal(validateUpiId(ok), '', `${ok} should be valid`);
});
test('UPI masking keeps almost nothing of the handle', () => {
  assert.equal(maskUpi('rahul@okaxis'), 'ra***@okaxis'); assert.equal(maskUpi('notupi'), null);
});
test('card number: Luhn, length, characters and spacing', () => {
  for (const ok of ['4242 4242 4242 4242', '4111111111111111', '5555 5555 5555 4444', '3782 822463 10005', '4242-4242-4242-4242']) assert.equal(validateCardNumber(ok), '', ok);
  for (const bad of ['', '4242 4242 4242 4241', '1234', 'abcd efgh ijkl mnop', '4242 4242 4242 42422222', '378282246310006', '3782 8224 6310 00']) assert.notEqual(validateCardNumber(bad), '', `"${bad}"`);
  assert.equal(luhn('79927398713'), true); assert.equal(luhn('79927398710'), false);
  assert.equal(cardBrand('4242424242424242'), 'Visa'); assert.equal(cardBrand('378282246310005'), 'American Express'); assert.equal(cardBrand('5555555555554444'), 'Mastercard');
});
test('card number formatting groups digits and caps length', () => {
  assert.equal(formatCardNumber('4242424242424242'), '4242 4242 4242 4242');
  assert.equal(formatCardNumber('378282246310005'), '3782 822463 10005');
  assert.equal(formatCardNumber('42a42-4242'), '4242 4242');
});
test('cardholder name', () => {
  assert.notEqual(validateCardName(''), ''); assert.notEqual(validateCardName('  '), ''); assert.notEqual(validateCardName('12345'), '');
  assert.equal(validateCardName("Teja Sree K."), ''); assert.equal(validateCardName('Zoë O’Neil'), '');
});
test('expiry: required, not in the past, not absurdly far', () => {
  const now = new Date('2026-10-22T10:00:00');
  assert.notEqual(validateExpiry('', '', now), ''); assert.notEqual(validateExpiry('5', '', now), '');
  assert.notEqual(validateExpiry('9', '2026', now), ''); assert.notEqual(validateExpiry('12', '2025', now), '');
  assert.equal(validateExpiry('10', '2026', now), ''); assert.equal(validateExpiry('1', '2027', now), '');
  assert.notEqual(validateExpiry('13', '2027', now), ''); assert.notEqual(validateExpiry('1', '2060', now), '');
});
test('CVV: 3 digits normally, 4 for American Express', () => {
  assert.notEqual(validateCvv('', '4242424242424242'), ''); assert.notEqual(validateCvv('12', '4242424242424242'), ''); assert.notEqual(validateCvv('1234', '4242424242424242'), ''); assert.notEqual(validateCvv('12a', '4242424242424242'), '');
  assert.equal(validateCvv('123', '4242424242424242'), ''); assert.equal(validateCvv('1234', '378282246310005'), ''); assert.notEqual(validateCvv('123', '378282246310005'), '');
});
test('whole-card validation reports each field', () => {
  const y = new Date().getFullYear() + 2;
  assert.equal(isClean(validateCard({ name: 'A B', number: '4242 4242 4242 4242', month: '12', year: String(y), cvv: '123' })), true);
  const e = validateCard({ name: '', number: '1', month: '', year: '', cvv: '' });
  assert.ok(e.name && e.number && e.expiry && e.cvv);
});
