import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('home hero no longer contains pad illustrations, floating characters or prices', () => {
  const home = read('pages/Home.jsx');
  const hero = home.slice(home.indexOf('<header className="hx"'), home.indexOf('</header>'));
  assert.ok(hero.length > 200);
  for (const banned of ['PadConcept', 'hero__pads', 'hero__visual', 'floaty', 'PadConcept', 'padsvg', '₹', 'price']) assert.ok(!hero.includes(banned), `hero still contains ${banned}`);
  assert.ok(!home.includes('PadConcept'));
});
test('admin interface locks cancelled orders and shows no status dropdown for them', () => {
  const admin = read('pages/Admin.jsx');
  assert.ok(admin.includes("o.status === 'Cancelled' ? (") && admin.includes('Locked'));
  assert.ok(admin.includes('LOCKED_MESSAGE'));
});
test('the viewer renders a model for every product type and has a static fallback', () => {
  const m = read('components/viewer/models.js');
  for (const k of ['buildPad', 'buildTampon', 'buildCup', 'buildUnderwear']) assert.ok(m.includes(`export function ${k}`));
  assert.ok(/MODEL_BUILDERS = \{ pads: buildPad, tampons: buildTampon, cups: buildCup, underwear: buildUnderwear \}/.test(m));
  const v = read('components/ProductViewer.jsx');
  assert.ok(v.includes('ViewerFallback') && v.includes('webglAvailable') && v.includes('data-viz-kind'));
});
test('no order/pack page falls back to pad-only logic', () => {
  for (const f of ['pages/PackBuilder.jsx', 'pages/Summary.jsx', 'pages/Recommendation.jsx']) {
    const s = read(f);
    assert.ok(!s.includes('PAD_SIZES') && !s.includes('PAD_CATALOG') && !s.includes('calculatePackTotal'), `${f} still uses pad-only helpers`);
  }
});

test('checkout goes address -> payment -> confirmation and collects no card credentials', () => {
  const s = read('pages/Summary.jsx');
  assert.ok(s.includes("setStage('payment')") && s.includes('Continue to payment') && s.includes('Choose your online payment method'));
  assert.ok(s.includes('Place Order') && s.includes('Proceed to Pay'));
  assert.ok(!/place (your )?demo order/i.test(s), 'misleading demo-order wording is still present');
  const before = s.slice(s.indexOf('function handleAddressSubmit'), s.indexOf('const chosenMethod'));
  assert.ok(!before.includes('placeOrder('), 'the order must not be placed when the address is submitted');
  for (const banned of ['localStorage', 'sessionStorage', 'fetch(', 'console.log']) assert.ok(!s.includes(banned), `Summary contains ${banned}`);
  const forms = read('components/PaymentForms.jsx');
  for (const banned of ['localStorage', 'sessionStorage', 'fetch(', 'console.log']) assert.ok(!forms.includes(banned), `PaymentForms contains ${banned}`);
  assert.ok(s.includes('Credit Card') && s.includes('Debit Card') && s.includes('UPI') && forms.includes('UPI PIN'));
  assert.ok(!s.includes('card,') || !/paymentMeta = \{[^}]*card/.test(s), 'card data must not be passed into the order');
});
test('admin shows payment method and status for each order', () => {
  const a = read('pages/Admin.jsx');
  assert.ok(a.includes('paymentMethodLabel(o.paymentMethod)') && a.includes('PaymentBadge') && a.includes('Payment method'));
});
