import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ADMIN } from '../config';
import { hashPassword } from '../services/auth';
import { recommendProduct, isValidRecommendation, isProductType } from '../services/products';
import { loadOrders, cancelOrderInStorage, setStatusInStorage, addOrderInStorage } from '../services/orderStore';

const K = {
  accounts: 'femora_accounts_v2',
  orders: 'femora_orders_v2',
  profiles: 'femora_profiles_v2',
  session: 'femora_session_v2',
};
const EMPTY_PACK = {};
const emptyProfile = () => ({
  answers: null, problemText: null, problemTags: [], path: null,
  recommendation: null, pack: { ...EMPTY_PACK }, address: null, periodTracker: null, productType: null,
});

const rd = (store, key, fb) => { try { const r = store.getItem(key); return r ? JSON.parse(r) : fb; } catch { return fb; } };
const wr = (store, key, v) => { try { store.setItem(key, JSON.stringify(v)); } catch { /* storage unavailable */ } };
// Always read-modify-write from storage so two open tabs (e.g. admin + customer) never overwrite each other.
function mutate(key, fb, fn) { const next = fn(rd(localStorage, key, fb)); wr(localStorage, key, next); return next; }

const rdArr = (st, k) => { const v = rd(st, k, []); return Array.isArray(v) ? v : []; };
const rdObj = (st, k) => { const v = rd(st, k, {}); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; };

function loadSession() {
  return rd(sessionStorage, K.session, null) || rd(localStorage, K.session, null);
}
function loadAll() {
  return {
    accounts: rdArr(localStorage, K.accounts),
    orders: loadOrders(localStorage),
    profiles: rdObj(localStorage, K.profiles),
    session: loadSession(),
  };
}

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [state, setState] = useState(loadAll);

  // Live-sync across tabs: when admin changes an order status, the customer's open tab updates too.
  useEffect(() => {
    function onStorage(e) {
      if (e.key && [K.accounts, K.orders, K.profiles].includes(e.key)) {
        setState((s) => ({ ...s, accounts: rdArr(localStorage, K.accounts), orders: loadOrders(localStorage), profiles: rdObj(localStorage, K.profiles) }));
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const isAdmin = state.session?.role === 'admin';
  const account = !isAdmin && state.session ? state.accounts.find((a) => a.email === state.session.email) : null;
  const user = useMemo(() => (isAdmin
    ? { name: ADMIN.username, email: ADMIN.email, role: 'admin' }
    : account ? { name: account.name, email: account.email, age: account.age, phone: account.phone, role: 'user' } : null), [isAdmin, account]);
  const profile = (user && !isAdmin && state.profiles[user.email]) || emptyProfile();

  const setProfile = useCallback((patch) => {
    setState((s) => {
      if (!s.session || s.session.role === 'admin') return s;
      const email = s.session.email;
      const profiles = mutate(K.profiles, {}, (p) => ({ ...p, [email]: { ...emptyProfile(), ...p[email], ...patch } }));
      return { ...s, profiles };
    });
  }, []);

  // Stable setters (pages use them in effect dependency arrays).
  const setAnswers = useCallback((answers) => setProfile({ answers, path: 'questionnaire' }), [setProfile]);
  const setProblem = useCallback((problemText, problemTags) => setProfile({ problemText, problemTags, path: 'problem' }), [setProfile]);
  const setRecommendation = useCallback((recommendation) => setProfile({ recommendation }), [setProfile]);
  // Changing the product type clears any recommendation and pack from the previous type.
  const setProductType = useCallback((productType) => {
    setState((s) => {
      if (!s.session || s.session.role === 'admin') return s;
      const email = s.session.email;
      const profiles = mutate(K.profiles, {}, (p) => {
        const cur = { ...emptyProfile(), ...p[email] };
        const patch = cur.productType === productType ? { productType } : { productType, recommendation: null, pack: {} };
        return { ...p, [email]: { ...cur, ...patch } };
      });
      return { ...s, profiles };
    });
  }, []);
  const setPack = useCallback((pack) => setProfile({ pack }), [setProfile]);
  const setAddress = useCallback((address) => setProfile({ address }), [setProfile]);
  const setPeriodTracker = useCallback((periodTracker) => setProfile({ periodTracker }), [setProfile]);
  const resetPersonalization = useCallback(() => setProfile({ answers: null, problemText: null, problemTags: [], path: null, recommendation: null, productType: null, pack: { ...EMPTY_PACK } }), [setProfile]);

  const signUp = useCallback(({ name, email, age, phone, password }) => {
    const mail = email.trim().toLowerCase();
    if (mail === ADMIN.email) return { ok: false, error: 'This email is reserved. Please use a different one.' };
    const fresh = rdArr(localStorage, K.accounts);
    if (fresh.some((a) => a.email === mail)) return { ok: false, error: 'An account with this email already exists. Try logging in.' };
    const acc = { name: name.trim(), email: mail, age: Number(age), phone: phone.trim(), hash: hashPassword(mail, password), createdAt: new Date().toISOString() };
    const accounts = mutate(K.accounts, [], (a) => [...a, acc]);
    const session = { role: 'user', email: mail };
    wr(sessionStorage, K.session, session);
    setState((s) => ({ ...s, accounts, session }));
    return { ok: true };
  }, []);

  const login = useCallback(({ role, identifier, password, remember }) => {
    const id = identifier.trim().toLowerCase();
    let session = null;
    if (role === 'admin') {
      const match = id === ADMIN.email || id === ADMIN.username.toLowerCase();
      if (match && hashPassword(ADMIN.email, password) === ADMIN.hash) session = { role: 'admin', email: ADMIN.email };
    } else {
      const acc = rdArr(localStorage, K.accounts).find((a) => a.email === id);
      if (acc && acc.hash === hashPassword(id, password)) session = { role: 'user', email: id };
    }
    if (!session) return { ok: false, error: 'Incorrect login details. Please check and try again.' };
    wr(sessionStorage, K.session, session);
    if (remember) wr(localStorage, K.session, session);
    setState((s) => ({ ...s, accounts: rdArr(localStorage, K.accounts), orders: loadOrders(localStorage), profiles: rdObj(localStorage, K.profiles), session }));
    return { ok: true, role: session.role };
  }, []);

  const logout = useCallback(() => {
    try { sessionStorage.removeItem(K.session); localStorage.removeItem(K.session); } catch { /* ignore */ }
    setState((s) => ({ ...s, session: null }));
  }, []);

  const placeOrder = useCallback((draft) => {
    const r = addOrderInStorage(localStorage, draft);
    setState((st) => ({ ...st, orders: loadOrders(localStorage) }));
    return r;
  }, []);

  const updateOrderStatus = useCallback((orderId, status, note = '') => {
    const r = setStatusInStorage(localStorage, orderId, status, note, state.session?.role);
    setState((st) => ({ ...st, orders: loadOrders(localStorage) }));
    return r;
  }, [state.session]);

  const cancelOrder = useCallback((orderId) => {
    const r = cancelOrderInStorage(localStorage, orderId, state.session?.role === 'user' ? state.session.email : null);
    setState((st) => ({ ...st, orders: loadOrders(localStorage) }));
    return r;
  }, [state.session]);

  const value = useMemo(() => ({
    user, isAdmin,
    ...profile,
    productType: isProductType(profile.productType) ? profile.productType : null,
    // Always consistent with the chosen product type: a stale or foreign recommendation is never exposed.
    recommendation: isValidRecommendation(profile.recommendation, profile.productType) ? profile.recommendation
      : (isProductType(profile.productType) && profile.path
        ? recommendProduct({ productType: profile.productType, path: profile.path, answers: profile.answers, problemText: profile.problemText, problemTags: profile.problemTags })
        : null),
    orders: isAdmin ? state.orders : state.orders.filter((o) => user && o.userEmail === user.email),
    customers: isAdmin ? state.accounts.map(({ hash: _hash, ...rest }) => rest) : [],
    signUp, login, logout, placeOrder, updateOrderStatus, cancelOrder,
    setAnswers, setProblem, setRecommendation, setProductType, setPack, setAddress, setPeriodTracker, resetPersonalization,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [state, signUp, login, logout, placeOrder, updateOrderStatus, cancelOrder, setAnswers, setProblem, setRecommendation, setProductType, setPack, setAddress, setPeriodTracker, resetPersonalization]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
