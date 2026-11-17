import { useId } from 'react';
import { cardBrand, formatCardNumber } from '../services/paymentValidation';

function Field({ id, label, error, hint, children }) {
  return (
    <div className="pf">
      <label className="field-label" htmlFor={id}>{label}</label>
      {children}
      {hint && !error && <p className="pf__hint">{hint}</p>}
      {error && <p className="field-error" id={`${id}-err`} role="alert">{error}</p>}
    </div>
  );
}

// UPI: only the payment ID is collected, never a UPI PIN.
export function UpiForm({ value, onChange, error, onBlur, disabled }) {
  const id = useId();
  return (
    <div className="payform">
      <Field id={`${id}-upi`} label="UPI ID / VPA" error={error} hint="For example name@bank. We never ask for your UPI PIN.">
        <input id={`${id}-upi`} className={`field-input ${error ? 'has-error' : ''}`} type="text" inputMode="email" autoComplete="off" autoCapitalize="none" spellCheck={false}
          placeholder="username@upi" value={value} disabled={disabled} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-upi-err` : undefined}
          onChange={(e) => onChange(e.target.value)} onBlur={onBlur} />
      </Field>
    </div>
  );
}

const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));

// Card details live only in this component's parent state while the form is open (never saved or sent).
export function CardForm({ card, onChange, errors, touched, onTouch, kind, disabled }) {
  const id = useId();
  const year = new Date().getFullYear();
  const brand = cardBrand(card.number);
  const show = (k) => (touched[k] ? errors[k] : '');
  const set = (k) => (v) => onChange({ ...card, [k]: v });
  return (
    <div className="payform">
      <Field id={`${id}-name`} label="Cardholder name" error={show('name')}>
        <input id={`${id}-name`} className={`field-input ${show('name') ? 'has-error' : ''}`} type="text" autoComplete="cc-name" placeholder="Name as shown on the card" value={card.name} disabled={disabled}
          aria-invalid={Boolean(show('name'))} aria-describedby={show('name') ? `${id}-name-err` : undefined} onChange={(e) => set('name')(e.target.value)} onBlur={() => onTouch('name')} />
      </Field>
      <Field id={`${id}-num`} label={`${kind} number`} error={show('number')} hint={brand ? `Detected: ${brand}` : 'Digits only; spaces are added for you.'}>
        <input id={`${id}-num`} className={`field-input ${show('number') ? 'has-error' : ''}`} type="text" inputMode="numeric" autoComplete="cc-number" placeholder="1234 5678 9012 3456" maxLength={23}
          value={card.number} disabled={disabled} aria-invalid={Boolean(show('number'))} aria-describedby={show('number') ? `${id}-num-err` : undefined}
          onChange={(e) => set('number')(formatCardNumber(e.target.value))} onBlur={() => onTouch('number')} />
      </Field>
      <div className="pf__row">
        <Field id={`${id}-mon`} label="Expiry month" error={show('expiry')}>
          <select id={`${id}-mon`} className={`field-input ${show('expiry') ? 'has-error' : ''}`} autoComplete="cc-exp-month" value={card.month} disabled={disabled} onChange={(e) => set('month')(e.target.value)} onBlur={() => onTouch('expiry')}>
            <option value="">MM</option>{MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
        <Field id={`${id}-yr`} label="Expiry year">
          <select id={`${id}-yr`} className={`field-input ${show('expiry') ? 'has-error' : ''}`} autoComplete="cc-exp-year" value={card.year} disabled={disabled} onChange={(e) => set('year')(e.target.value)} onBlur={() => onTouch('expiry')}>
            <option value="">YYYY</option>{Array.from({ length: 16 }, (_, i) => year + i).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </Field>
        <Field id={`${id}-cvv`} label="CVV" error={show('cvv')}>
          <input id={`${id}-cvv`} className={`field-input ${show('cvv') ? 'has-error' : ''}`} type="password" inputMode="numeric" autoComplete="off" placeholder={brand === 'American Express' ? '4 digits' : '3 digits'}
            maxLength={4} value={card.cvv} disabled={disabled} aria-invalid={Boolean(show('cvv'))} aria-describedby={show('cvv') ? `${id}-cvv-err` : undefined}
            onChange={(e) => set('cvv')(e.target.value.replace(/\D/g, '').slice(0, 4))} onBlur={() => onTouch('cvv')} />
        </Field>
      </div>
    </div>
  );
}
