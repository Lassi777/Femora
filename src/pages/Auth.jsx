import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useUser } from '../context/UserContext';
import './FormPage.css';
import './Auth.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Password({ id, label, value, onChange, error, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div className="formpage__field">
      <label className="field-label" htmlFor={id}>{label}</label>
      <div className="pw">
        <input id={id} className={`field-input ${error ? 'has-error' : ''}`} type={show ? 'text' : 'password'}
          value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} />
        <button type="button" className="pw__toggle" onClick={() => setShow((v) => !v)}>{show ? 'Hide' : 'Show'}</button>
      </div>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

function Field({ id, label, type = 'text', value, onChange, error, placeholder, autoComplete }) {
  return (
    <div className="formpage__field">
      <label className="field-label" htmlFor={id}>{label}</label>
      <input id={id} className={`field-input ${error ? 'has-error' : ''}`} type={type} value={value}
        onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete={autoComplete} />
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

export default function Auth({ mode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, signUp } = useUser();
  const isSignup = mode === 'signup';
  const [role, setRole] = useState('user');
  const [f, setF] = useState({ name: '', email: '', phone: '', age: '', password: '', confirm: '', identifier: '', remember: false });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));

  function validate() {
    const e = {};
    if (isSignup) {
      if (!f.name.trim()) e.name = 'Please tell us your name.';
      if (!EMAIL_RE.test(f.email.trim())) e.email = 'Enter a valid email address.';
      if (!/^[\d+\-\s]{7,15}$/.test(f.phone.trim())) e.phone = 'Enter a valid phone number.';
      const a = Number(f.age);
      if (!f.age || !(a >= 10 && a <= 70)) e.age = 'Enter an age between 10 and 70.';
      if (f.password.length < 8) e.password = 'Use at least 8 characters.';
      if (f.confirm !== f.password) e.confirm = 'Passwords do not match.';
    } else {
      if (!f.identifier.trim()) e.identifier = role === 'admin' ? 'Enter the admin username or email.' : 'Enter your email.';
      if (!f.password) e.password = 'Enter your password.';
    }
    return e;
  }

  function submit(ev) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    setFormError('');
    if (Object.keys(e).length) return;
    if (isSignup) {
      const r = signUp(f);
      if (!r.ok) return setFormError(r.error);
      navigate('/ready', { replace: true });
    } else {
      const r = login({ role, identifier: role === 'admin' ? f.identifier : f.identifier, password: f.password, remember: f.remember });
      if (!r.ok) return setFormError(r.error);
      const from = location.state?.from;
      navigate(r.role === 'admin' ? '/admin' : from || '/dashboard', { replace: true });
    }
  }

  return (
    <div className="formpage">
      <Navbar />
      <div className="container formpage__wrap">
        <div className="formpage__card">
          <span className="eyebrow-plain">{isSignup ? 'Create your account' : 'Welcome back'}</span>
          <h1 className="formpage__title">{isSignup ? 'Sign up for FEMORA' : 'Log in to FEMORA'}</h1>

          {!isSignup && (
            <div className="seg" role="tablist" aria-label="Login type">
              {[['user', 'Customer'], ['admin', 'Admin']].map(([r, l]) => (
                <button key={r} type="button" role="tab" aria-selected={role === r} className={`seg__btn ${role === r ? 'is-on' : ''}`}
                  onClick={() => { setRole(r); setErrors({}); setFormError(''); }}>{l}</button>
              ))}
            </div>
          )}
          <p className="formpage__sub">
            {isSignup ? 'Create a customer account to get your personalized pack and track your orders.'
              : role === 'admin' ? 'Admin access to view orders, customers and update order status.'
              : 'Log in to continue your personalization and track your orders.'}
          </p>

          <form onSubmit={submit} noValidate>
            {isSignup ? (
              <>
                <Field id="name" label="Full name" value={f.name} onChange={set('name')} error={errors.name} placeholder="e.g. Ananya Rao" autoComplete="name" />
                <Field id="email" label="Email ID" type="email" value={f.email} onChange={set('email')} error={errors.email} placeholder="you@example.com" autoComplete="email" />
                <div className="formpage__row">
                  <Field id="phone" label="Phone" type="tel" value={f.phone} onChange={set('phone')} error={errors.phone} placeholder="98765 43210" autoComplete="tel" />
                  <Field id="age" label="Age" type="number" value={f.age} onChange={set('age')} error={errors.age} placeholder="e.g. 22" />
                </div>
                <Password id="password" label="Password" value={f.password} onChange={set('password')} error={errors.password} autoComplete="new-password" />
                <Password id="confirm" label="Confirm password" value={f.confirm} onChange={set('confirm')} error={errors.confirm} autoComplete="new-password" />
              </>
            ) : (
              <>
                <Field id="identifier" label={role === 'admin' ? 'Admin username or email' : 'Email ID'} value={f.identifier} onChange={set('identifier')} error={errors.identifier}
                  placeholder={role === 'admin' ? 'Username or email' : 'you@example.com'} autoComplete="username" />
                <Password id="password" label="Password" value={f.password} onChange={set('password')} error={errors.password} autoComplete="current-password" />
                <label className="remember"><input type="checkbox" checked={f.remember} onChange={(e) => set('remember')(e.target.checked)} /> Keep me signed in on this device</label>
              </>
            )}
            {formError && <p className="field-error formerror" role="alert">{formError}</p>}
            <p className="demo-note">Demo mode: your details are saved only in this browser, and passwords are checked in the browser. Do not reuse a real password.</p>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }}>{isSignup ? 'Create account' : 'Log in'}</button>
          </form>

          <p className="auth__alt">
            {isSignup ? <>Already have an account? <Link to="/login">Log in</Link></>
              : role === 'user' ? <>New to FEMORA? <Link to="/signup">Sign up</Link></> : 'Admin accounts cannot be created here.'}
          </p>
        </div>
      </div>
    </div>
  );
}
