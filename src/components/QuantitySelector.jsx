import './QuantitySelector.css';

export default function QuantitySelector({ label, price, qty, onChange, recommended = false, step = 1, max = 50, unit = 'pad' }) {
  const subtotal = qty * price;

  function dec() { onChange(Math.max(0, qty - step)); }
  function inc() { onChange(Math.min(max, qty + step)); }

  return (
    <div className={`qsel ${recommended ? 'qsel--recommended' : ''}`}>
      <div className="qsel__info">
        <div className="qsel__label-row">
          <span className="qsel__label">{label}</span>
          {recommended && <span className="qsel__tag">Recommended</span>}
        </div>
        <span className="qsel__price">₹{price}/{unit}</span>
      </div>
      <div className="qsel__controls">
        <button type="button" className="qsel__btn" onClick={dec} aria-label={`Decrease ${label} quantity`} disabled={qty === 0}>−</button>
        <span className="qsel__qty" aria-live="polite">{qty}</span>
        <button type="button" className="qsel__btn" onClick={inc} aria-label={`Increase ${label} quantity`} disabled={qty >= max}>+</button>
      </div>
      <div className="qsel__subtotal">₹{subtotal}</div>
    </div>
  );
}
