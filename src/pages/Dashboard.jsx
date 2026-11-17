import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { StatusBadge, PaymentBadge, StatusTimeline } from '../components/OrderStatus';
import { useUser } from '../context/UserContext';
import { paymentMethodLabel, isSimulatedPayment } from '../config';
import { TYPE_META, getVariation, packTotals, unitLabel, packBelongsTo } from '../services/products';
import { computeNextPeriod, formatDate } from '../services/periodTracker';
import './Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [openId, setOpenId] = useState(null);
  const { user, recommendation, productType, pack, orders, cancelOrder, periodTracker, resetPersonalization, logout } = useUser();

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  useEffect(() => {
    if (location.state?.scrollTo === 'orders') document.getElementById('orders')?.scrollIntoView({ behavior: 'smooth' });
  }, [location.state]);

  if (!user) return null;

  const myOrders = orders;
  const cycleEstimate = periodTracker?.lastPeriodDate
    ? computeNextPeriod(periodTracker.lastPeriodDate, periodTracker.cycleLength)
    : null;

  function handleRepersonalize() {
    resetPersonalization();
    navigate('/ready');
  }

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <div className="dashpage">
      <Navbar />
      <div className="container dashpage__wrap">
        <div className="dashpage__header">
          <div>
            <span className="eyebrow-plain">Dashboard</span>
            <h1 className="dashpage__title">Welcome, {user.name.split(' ')[0]}</h1>
          </div>
          <button type="button" className="dashpage__logout" onClick={handleLogout}>
            Log out
          </button>
        </div>

        <div className="dashgrid">
          <div className="dashcard">
            <h2>My Recommendation</h2>
            {recommendation ? (
              <>
                <p className="dashcard__big">{getVariation(recommendation.variationId)?.name}</p>
                <p className="dashcard__sub">{TYPE_META[productType]?.label} · {recommendation.flowLevel} flow</p>
                <button className="dashcard__link" onClick={() => navigate('/recommendation')}>View details</button>
              </>
            ) : (
              <>
                <p className="dashcard__sub">You haven't personalized a recommendation yet.</p>
                <button className="dashcard__link" onClick={() => navigate('/ready')}>Get recommendation</button>
              </>
            )}
          </div>

          <div className="dashcard">
            <h2>My FEMORA Pack</h2>
            {productType && packBelongsTo(productType, pack) && packTotals(pack).count > 0 ? (
              <>
                <p className="dashcard__big">{packTotals(pack).count} {unitLabel(productType, packTotals(pack).count)}</p>
                <p className="dashcard__sub">Total ₹{packTotals(pack).total}</p>
                <button className="dashcard__link" onClick={() => navigate('/pack')}>Edit pack</button>
              </>
            ) : (
              <>
                <p className="dashcard__sub">No pack built yet.</p>
                <button className="dashcard__link" onClick={() => navigate('/pack')}>Build pack</button>
              </>
            )}
          </div>

          <div className="dashcard">
            <h2>My Preferences</h2>
            <p className="dashcard__sub">
              {recommendation
                ? `Product type: ${TYPE_META[productType]?.label || '—'} · Skin-comfort priority: ${recommendation.attributes?.find((a) => a[0] === 'Skin-comfort priority')?.[1] || 'Standard'}`
                : 'Complete personalization to see your preferences.'}
            </p>
            <button className="dashcard__link" onClick={handleRepersonalize}>Re-personalize My Pack</button>
          </div>

          <div className="dashcard">
            <h2>My Cycle</h2>
            {cycleEstimate ? (
              <>
                <p className="dashcard__big">{formatDate(cycleEstimate.nextDate)}</p>
                <p className="dashcard__sub">
                  {cycleEstimate.isOverdue
                    ? `${Math.abs(cycleEstimate.daysUntil)} day${Math.abs(cycleEstimate.daysUntil) === 1 ? '' : 's'} overdue`
                    : cycleEstimate.daysUntil === 0
                      ? 'Estimated for today'
                      : `In ${cycleEstimate.daysUntil} day${cycleEstimate.daysUntil === 1 ? '' : 's'}`}
                </p>
              </>
            ) : (
              <p className="dashcard__sub">You haven't set up your period tracker yet.</p>
            )}
            <button className="dashcard__link" onClick={() => navigate('/', { state: { scrollTo: 'period-tracker' } })}>
              {cycleEstimate ? 'Update tracker' : 'Set up tracker'}
            </button>
          </div>

          <div className="dashcard dashcard--wide" id="orders">
            <h2>My Orders</h2>
            {myOrders.length === 0 ? (
              <>
                <p className="dashcard__sub">You haven't placed an order yet.</p>
                <button className="dashcard__link" onClick={() => navigate(recommendation ? '/pack' : '/ready')}>Build my pack</button>
              </>
            ) : (
              <div className="dashorders">
                {myOrders.map((o) => (
                  <div className="dashorder" key={o.id}>
                    <button className="dashorders__row" onClick={() => setOpenId(openId === o.id ? null : o.id)} aria-expanded={openId === o.id}>
                      <span className="dashorders__id">{o.id}</span>
                      <span>{o.count} {unitLabel(o.productType || 'pads', o.count)} · ₹{o.total}</span>
                      <span><StatusBadge status={o.status} /></span>
                      <span>{o.address ? `${o.address.city}, ${o.address.state}` : '—'}</span>
                      <span className="dashorders__date">{new Date(o.date).toLocaleDateString()}</span>
                    </button>
                    {openId === o.id && (
                      <div className="dashorder__detail">
                        <p className="dashorder__note"><strong>Payment:</strong> {paymentMethodLabel(o.paymentMethod)} <PaymentBadge status={o.paymentStatus} />{isSimulatedPayment(o) && <span className="pbadge pbadge--none" style={{ marginLeft: 8 }}>Simulated · no real payment</span>}</p>
                        <StatusTimeline order={o} />
                        {(o.history || []).filter((h) => h.note).map((h, i) => (
                          <p className="dashorder__note" key={i}>Update from FEMORA ({new Date(h.at).toLocaleDateString()}): {h.note}</p>
                        ))}
                        {['Placed', 'Confirmed'].includes(o.status) && (
                          <button className="dashcard__link" onClick={() => { if (window.confirm('Cancel this order?')) { const r = cancelOrder(o.id); if (!r.ok) window.alert(r.error); } }}>Cancel order</button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
