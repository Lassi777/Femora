import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useUser } from '../context/UserContext';
import { TYPE_META, packLines, packTotals, packBelongsTo, getVariation, unitLabel } from '../services/products';
import './FormPage.css';
import { paymentMethodLabel, ONLINE_METHODS, isSimulatedPayment } from '../config';
import { UpiForm, CardForm } from '../components/PaymentForms';
import { validateUpiId, maskUpi, validateCard, isClean } from '../services/paymentValidation';
import { StatusBadge, PaymentBadge } from '../components/OrderStatus';
import './Summary.css';

function generateOrderId() {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `FEM-${rand}`;
}

const EMPTY_CARD = { name: '', number: '', month: '', year: '', cvv: '' };

function Steps({ current }) {
  const items = ['Address', 'Payment', 'Confirmation'];
  return (
    <ol className="cksteps" aria-label="Checkout progress">
      {items.map((t, i) => (
        <li key={t} className={i < current ? 'is-done' : i === current ? 'is-now' : ''} aria-current={i === current ? 'step' : undefined}>
          <span>{i < current ? '✓' : i + 1}</span>{t}
        </li>
      ))}
    </ol>
  );
}

const ICON = {
  online: <><rect x="4" y="9" width="40" height="28" rx="4" /><path d="M4 18h40M11 29h10" /></>,
  cod: <><rect x="4" y="13" width="40" height="22" rx="3" /><circle cx="24" cy="24" r="6" /><path d="M10 19v.1M38 29v.1" /></>,
  upi: <><rect x="14" y="4" width="20" height="40" rx="4" /><path d="M21 38h6M19 17l5 6 5-6M24 23v7" /></>,
  card: <><rect x="4" y="10" width="40" height="28" rx="4" /><path d="M4 20h40M10 30h8M30 30h8" /></>,
};
const PayIcon = ({ name }) => <svg viewBox="0 0 48 48" className="payicon" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICON[name]}</svg>;

const EMPTY_ADDRESS_BASE = { line1: '', line2: '', city: '', state: '', pincode: '', phone: '' };

function validateAddress(a) {
  const e = {};
  if (!a.line1.trim()) e.line1 = 'Address line is required.';
  if (!a.city.trim()) e.city = 'City is required.';
  if (!a.state.trim()) e.state = 'State is required.';
  if (!a.pincode.trim()) e.pincode = 'PIN code is required.';
  else if (!/^\d{4,8}$/.test(a.pincode.trim())) e.pincode = 'Enter a valid PIN/ZIP code.';
  if (!/^[\d+\-\s]{7,15}$/.test(a.phone.trim())) e.phone = 'Enter a valid phone number.';
  return e;
}

export default function Summary() {
  const navigate = useNavigate();
  const { user, recommendation, productType, pack, setPack, answers, address: savedAddress, setAddress, placeOrder } = useUser();
  const [stage, setStage] = useState('review'); // 'review' | 'address' | 'payment' | 'confirmed'
  const [checkoutAddress, setCheckoutAddress] = useState(null); // only set after the address passes validation
  const [payChoice, setPayChoice] = useState(null); // 'ONLINE' | 'COD' (never preselected)
  const [onlineMethod, setOnlineMethod] = useState(null); // 'UPI' | 'CREDIT_CARD' | 'DEBIT_CARD'
  // Sensitive form values exist only here, in memory, while the form is open. They are never saved or sent.
  const [upi, setUpi] = useState('');
  const [card, setCard] = useState(EMPTY_CARD);
  const [payTouched, setPayTouched] = useState({});
  const [processing, setProcessing] = useState(false);
  const timerRef = useRef(null);
  useEffect(() => () => clearTimeout(timerRef.current), []);
  const [submitting, setSubmitting] = useState(false);
  const orderIdRef = useRef(null);
  const [addressForm, setAddressForm] = useState(savedAddress || { ...EMPTY_ADDRESS_BASE, phone: user?.phone || '' });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [placed, setPlaced] = useState(null);
  const [orderError, setOrderError] = useState('');

  useEffect(() => {
    if (!user) navigate('/login');
    else if (!productType) navigate('/product-type');
    else if (!recommendation) navigate('/ready');
  }, [user, productType, recommendation, navigate]);

  if (!user || !recommendation || !productType) return null;

  const lines = packLines(pack);
  const { count, total } = packTotals(pack);
  const mismatch = !productType || !packBelongsTo(productType, pack);

  function handleField(field, value) {
    const next = { ...addressForm, [field]: value };
    setAddressForm(next);
    if (touched[field]) setErrors(validateAddress(next));
  }

  function handleBlur(field) {
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors(validateAddress(addressForm));
  }

  function handleAddressSubmit(e) {
    e.preventDefault();
    const found = validateAddress(addressForm);
    setErrors(found);
    setTouched({ line1: true, city: true, state: true, pincode: true, phone: true });
    if (Object.keys(found).length > 0) return;

    const cleanAddress = {
      line1: addressForm.line1.trim(),
      line2: addressForm.line2.trim(),
      city: addressForm.city.trim(),
      state: addressForm.state.trim(),
      pincode: addressForm.pincode.trim(),
      phone: addressForm.phone.trim(),
    };
    setAddress(cleanAddress);
    setCheckoutAddress(cleanAddress);
    setOrderError('');
    setStage('payment');
  }

  const chosenMethod = payChoice === 'COD' ? 'COD' : payChoice === 'ONLINE' ? onlineMethod : null;
  const isCard = onlineMethod === 'CREDIT_CARD' || onlineMethod === 'DEBIT_CARD';
  const upiError = validateUpiId(upi);
  const cardErrors = validateCard(card);
  const detailsValid = chosenMethod === 'COD' || (onlineMethod === 'UPI' && !upiError) || (isCard && isClean(cardErrors));

  function resetPaymentForms() { setUpi(''); setCard(EMPTY_CARD); setPayTouched({}); }
  function chooseOnlineMethod(id) { if (submitting) return; resetPaymentForms(); setOnlineMethod(id); setOrderError(''); }
  function choosePayChoice(id) { if (submitting) return; resetPaymentForms(); setPayChoice(id); setOnlineMethod(null); setOrderError(''); }

  function finishOrder() {
    const paymentMeta = chosenMethod === 'UPI' ? { upiMasked: maskUpi(upi) } : null; // card data is never passed on
    const res = placeOrder({ id: orderIdRef.current, user, productType, pack, address: checkoutAddress, recommendation, paymentMethod: chosenMethod, paymentMeta });
    resetPaymentForms(); // wipe UPI ID / card details from memory
    setProcessing(false);
    if (!res.ok) { setOrderError(res.error); setSubmitting(false); return; }
    setOrderError('');
    setPlaced(res.order);
    setPack({}); // the pack has become an order; refreshing cannot place it again
    setStage('confirmed');
    setSubmitting(false);
  }

  function handlePlaceOrder() {
    if (submitting || placed) return;                      // double-click / repeat protection
    if (!checkoutAddress) { setStage('address'); return; }  // cannot skip the address step
    if (!chosenMethod) { setOrderError(payChoice === 'ONLINE' ? 'Please choose UPI, Credit Card or Debit Card.' : 'Please choose a payment method.'); return; }
    if (!detailsValid) { setPayTouched({ upi: true, name: true, number: true, expiry: true, cvv: true }); setOrderError('Please fix the highlighted fields.'); return; }
    setSubmitting(true); setOrderError('');
    if (!orderIdRef.current) orderIdRef.current = generateOrderId(); // one id per checkout, so retries cannot duplicate the order
    if (chosenMethod === 'COD') { finishOrder(); return; }
    // No payment gateway is configured: this only SIMULATES the hand-off. Nothing is charged or reported as paid.
    setProcessing(true);
    timerRef.current = setTimeout(finishOrder, 1100);
  }

  if (stage === 'confirmed' && placed) {
    const online = placed.paymentMethod !== 'COD';
    return (
      <div className="summarypage">
        <Navbar />
        <div className="container summarypage__wrap">
          <Steps current={3} />
          <div className="confirm">
            <span className="confirm__check" aria-hidden="true">✓</span>
            <h1>{online ? 'Order placed · payment pending' : 'Order placed'}</h1>
            <p className="confirm__id">Order ID: <strong>{placed.id}</strong></p>
            <dl className="confirm__list">
              <div><dt>Product</dt><dd>{TYPE_META[placed.productType]?.label} · {placed.lines.map((l) => `${l.name} × ${l.qty}`).join(', ')}</dd></div>
              <div><dt>Quantity</dt><dd>{placed.count} {unitLabel(placed.productType, placed.count)}</dd></div>
              <div><dt>Total amount</dt><dd>₹{placed.total}</dd></div>
              <div><dt>Payment method</dt><dd>{paymentMethodLabel(placed.paymentMethod)}</dd></div>
              <div><dt>Payment status</dt><dd><PaymentBadge status={placed.paymentStatus} />{isSimulatedPayment(placed) && <span className="pbadge pbadge--none" style={{ marginLeft: 8 }}>Simulated</span>}</dd></div>
              {placed.paymentMeta?.upiMasked && <div><dt>UPI ID</dt><dd>{placed.paymentMeta.upiMasked}</dd></div>}
              <div><dt>Order status</dt><dd><StatusBadge status={placed.status} /></dd></div>
              <div><dt>Delivering to</dt><dd>
                {placed.address.line1}{placed.address.line2 ? `, ${placed.address.line2}` : ''}, {placed.address.city}, {placed.address.state} {placed.address.pincode}
                {placed.address.phone ? ` · ${placed.address.phone}` : ''}</dd></div>
            </dl>
            <p className="confirm__note">
              {online
                ? `Payment simulation: no payment gateway is connected, so no real payment was processed and no money was taken. The payment status stays Pending.`
                : `Cash on Delivery: payment of ₹${placed.total} is due when the order is delivered, and stays Pending until then.`}
              {' '}This prototype does not ship real orders.
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/dashboard', { state: { scrollTo: 'orders' } })}>Track my order</button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'payment') {
    const online = payChoice === 'ONLINE';
    const label = chosenMethod ? paymentMethodLabel(chosenMethod) : '';
    return (
      <div className="summarypage">
        <Navbar />
        <div className="container formpage__wrap">
          <div className="formpage__card paypage">
            <Steps current={1} />
            <h1 className="formpage__title">How would you like to pay?</h1>
            <p className="formpage__sub">Order total: <strong>₹{total}</strong> for {count} {unitLabel(productType, count)}.</p>

            <div className="payopts" role="radiogroup" aria-label="Payment method">
              {[['ONLINE', 'online', 'Online Payment', 'Pay with UPI, a credit card or a debit card.'], ['COD', 'cod', 'Cash on Delivery', 'Pay in cash when your order arrives.']].map(([id, icon, title, desc]) => (
                <button key={id} type="button" role="radio" aria-checked={payChoice === id} disabled={submitting} className={`paycard ${payChoice === id ? 'is-on' : ''}`} onClick={() => choosePayChoice(id)}>
                  <PayIcon name={icon} /><span className="paycard__title">{title}</span><span className="paycard__desc">{desc}</span><span className="paycard__tick" aria-hidden="true">✓</span>
                </button>
              ))}
            </div>

            {online && (
              <div className="paysub">
                <h2 className="paysub__title">Choose your online payment method</h2>
                <div className="payopts payopts--3" role="radiogroup" aria-label="Online payment method">
                  {[['UPI', 'upi', 'UPI', 'Any UPI app.'], ['CREDIT_CARD', 'card', 'Credit Card', 'Visa, Mastercard, RuPay, Amex.'], ['DEBIT_CARD', 'card', 'Debit Card', 'Visa, Mastercard, RuPay.']].map(([id, icon, title, desc]) => (
                    <button key={id} type="button" role="radio" aria-checked={onlineMethod === id} disabled={submitting} className={`paycard paycard--sm ${onlineMethod === id ? 'is-on' : ''}`} onClick={() => chooseOnlineMethod(id)}>
                      <PayIcon name={icon} /><span className="paycard__title">{title}</span><span className="paycard__desc">{desc}</span><span className="paycard__tick" aria-hidden="true">✓</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {online && onlineMethod && (
              <form className="payfields" noValidate onSubmit={(e) => { e.preventDefault(); handlePlaceOrder(); }} aria-label={`${label} payment details`}>
                <div className="payfields__head">
                  <span>Paying by <strong>{label}</strong></span><span className="payfields__total">₹{total}</span>
                </div>
                {onlineMethod === 'UPI'
                  ? <UpiForm value={upi} onChange={setUpi} error={payTouched.upi ? upiError : ''} onBlur={() => setPayTouched((t) => ({ ...t, upi: true }))} disabled={submitting} />
                  : <CardForm card={card} onChange={setCard} errors={cardErrors} touched={payTouched} onTouch={(k) => setPayTouched((t) => ({ ...t, [k]: true }))} kind={onlineMethod === 'CREDIT_CARD' ? 'Credit card' : 'Debit card'} disabled={submitting} />}
                <p className="paynote" role="note">
                  <strong>Payment simulation:</strong> no payment gateway is connected, so no real payment is made. Your details are only checked in this browser and are never saved or sent anywhere.
                  Use test data only and never enter a real card's CVV here.{onlineMethod === 'UPI' ? ' We never ask for a UPI PIN.' : ''}
                </p>
                {processing && <p className="paystatus" role="status">Simulating the payment hand-off… no real payment is being made.</p>}
              </form>
            )}
            {payChoice === 'COD' && (
              <p className="paynote" role="note">Payment of <strong>₹{total}</strong> is intended to be collected when the order is delivered. It is recorded as <strong>Pending</strong> until then.</p>
            )}

            {orderError && <p className="field-error" role="alert">{orderError}</p>}
            <div className="summarypage__actions" style={{ marginTop: 20 }}>
              <button type="button" className="btn btn-secondary" disabled={submitting} onClick={() => setStage('address')}>Back to address</button>
              {online && onlineMethod && <button type="button" className="btn btn-ghost" disabled={submitting} onClick={() => chooseOnlineMethod(null)}>Change payment method</button>}
              <button type="button" className="btn btn-primary" disabled={!chosenMethod || !detailsValid || submitting} onClick={handlePlaceOrder}>
                {submitting ? (processing ? 'Processing…' : 'Placing order…') : payChoice === 'COD' ? 'Place Order' : 'Proceed to Pay'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'address') {
    return (
      <div className="summarypage">
        <Navbar />
        <div className="container formpage__wrap">
          <div className="formpage__card" style={{ maxWidth: 540 }}>
            <Steps current={0} />
            <span className="eyebrow-plain">Step 1 of 2</span>
            <h1 className="formpage__title">Where should we deliver your pack?</h1>
            <p className="formpage__sub">
              Enter your delivery details. Next, you'll choose how to pay.
            </p>

            <form onSubmit={handleAddressSubmit} noValidate>
              <div className="formpage__field">
                <label className="field-label" htmlFor="line1">Address line 1</label>
                <input
                  id="line1"
                  className={`field-input ${touched.line1 && errors.line1 ? 'has-error' : ''}`}
                  type="text"
                  value={addressForm.line1}
                  onChange={(e) => handleField('line1', e.target.value)}
                  onBlur={() => handleBlur('line1')}
                  placeholder="House / flat no., street"
                />
                {touched.line1 && errors.line1 && <p className="field-error">{errors.line1}</p>}
              </div>

              <div className="formpage__field">
                <label className="field-label" htmlFor="line2">Address line 2 (optional)</label>
                <input
                  id="line2"
                  className="field-input"
                  type="text"
                  value={addressForm.line2}
                  onChange={(e) => handleField('line2', e.target.value)}
                  placeholder="Locality, landmark"
                />
              </div>

              <div className="formpage__row">
                <div className="formpage__field">
                  <label className="field-label" htmlFor="city">City</label>
                  <input
                    id="city"
                    className={`field-input ${touched.city && errors.city ? 'has-error' : ''}`}
                    type="text"
                    value={addressForm.city}
                    onChange={(e) => handleField('city', e.target.value)}
                    onBlur={() => handleBlur('city')}
                    placeholder="e.g. Hyderabad"
                  />
                  {touched.city && errors.city && <p className="field-error">{errors.city}</p>}
                </div>
                <div className="formpage__field">
                  <label className="field-label" htmlFor="state">State</label>
                  <input
                    id="state"
                    className={`field-input ${touched.state && errors.state ? 'has-error' : ''}`}
                    type="text"
                    value={addressForm.state}
                    onChange={(e) => handleField('state', e.target.value)}
                    onBlur={() => handleBlur('state')}
                    placeholder="e.g. Telangana"
                  />
                  {touched.state && errors.state && <p className="field-error">{errors.state}</p>}
                </div>
              </div>

              <div className="formpage__row">
                <div className="formpage__field">
                  <label className="field-label" htmlFor="pincode">PIN / ZIP code</label>
                  <input
                    id="pincode"
                    className={`field-input ${touched.pincode && errors.pincode ? 'has-error' : ''}`}
                    type="text"
                    inputMode="numeric"
                    value={addressForm.pincode}
                    onChange={(e) => handleField('pincode', e.target.value)}
                    onBlur={() => handleBlur('pincode')}
                    placeholder="e.g. 500081"
                  />
                  {touched.pincode && errors.pincode && <p className="field-error">{errors.pincode}</p>}
                </div>
                <div className="formpage__field">
                  <label className="field-label" htmlFor="phone">Phone</label>
                  <input
                    id="phone"
                    className={`field-input ${touched.phone && errors.phone ? 'has-error' : ''}`}
                    type="tel"
                    value={addressForm.phone}
                    onChange={(e) => handleField('phone', e.target.value)}
                    onBlur={() => handleBlur('phone')}
                    placeholder="e.g. 98765 43210"
                  />
                  {touched.phone && errors.phone && <p className="field-error">{errors.phone}</p>}
                </div>
              </div>

              <div className="summarypage__actions" style={{ marginTop: 12 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setStage('review')}>Back</button>
                <button type="submit" className="btn btn-primary">Continue to payment</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="summarypage">
      <Navbar />
      <div className="container summarypage__wrap">
        <span className="eyebrow-plain">Review</span>
        <h1 className="summarypage__title">Your FEMORA Pack</h1>

        <div className="summarypage__grid">
          <section className="sumcard">
            <h2>Your details</h2>
            <dl className="sumcard__list">
              <div><dt>Name</dt><dd>{user.name}</dd></div>
              <div><dt>Email</dt><dd>{user.email}</dd></div>
              <div><dt>Phone</dt><dd>{user.phone}</dd></div>
            </dl>
          </section>

          <section className="sumcard">
            <h2>Personalization</h2>
            <dl className="sumcard__list">
              <div><dt>Product type</dt><dd>{TYPE_META[productType].label}</dd></div>
              <div><dt>Suggested variation</dt><dd>{getVariation(recommendation.variationId)?.name}</dd></div>
              <div><dt>Flow</dt><dd>{recommendation.flowLevel}</dd></div>
              <div><dt>Skin sensitivity</dt><dd>{answers?.skinSensitivity || '—'}</dd></div>
              <div><dt>Leakage concern</dt><dd>{answers?.leakageConcern || '—'}</dd></div>
              <div><dt>Comfort preference</dt><dd>{answers?.comfortImportance || recommendation.softness}</dd></div>
            </dl>
            <button className="sumcard__edit" onClick={() => navigate('/recommendation')}>Edit preferences</button>
          </section>

          <section className="sumcard sumcard--wide">
            <h2>Order ({TYPE_META[productType].label}, proposed prototype prices per {TYPE_META[productType].unit})</h2>
            <div className="sumcard__order">
              {lines.length === 0 && <p className="sumcard__empty">No items selected yet.</p>}
              {mismatch && lines.length > 0 && <p className="field-error" role="alert">Your pack does not match your product type. Please review your pack.</p>}
              {lines.map((l) => (
                <div className="sumcard__order-row" key={l.id}>
                  <span>{l.name} × {l.qty}</span>
                  <span>₹{l.subtotal}</span>
                </div>
              ))}
              <div className="sumcard__order-total">
                <span>Total ({count} {unitLabel(productType, count)})</span>
                <span>₹{total}</span>
              </div>
            </div>
            <button className="sumcard__edit" onClick={() => navigate('/pack')}>Edit pack</button>
          </section>
        </div>

        <div className="summarypage__actions">
          <button className="btn btn-secondary" onClick={() => navigate('/pack')}>Back to pack</button>
          <button className="btn btn-primary" disabled={count === 0 || mismatch} onClick={() => setStage('address')}>
            Continue to delivery details
          </button>
        </div>
      </div>
    </div>
  );
}
