import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import VariationCard from '../components/VariationCard';
import QuantitySelector from '../components/QuantitySelector';
import { useUser } from '../context/UserContext';
import { CONCEPT_NOTE, MAX_QTY, TYPE_META, variationsOf, packTotals, packBelongsTo, defaultPack, unitLabel } from '../services/products';
import './PackBuilder.css';

export default function PackBuilder() {
  const navigate = useNavigate();
  const { user, recommendation, productType, pack, setPack } = useUser();
  const recId = recommendation?.variationId;

  useEffect(() => {
    if (!user) navigate('/login');
    else if (!productType) navigate('/product-type');
    else if (!recommendation) navigate('/ready');
    // A pack that is empty, or belongs to another product type, is replaced by the recommended starter pack.
    else if (!pack || Object.keys(pack).length === 0 || !packBelongsTo(productType, pack)) setPack(defaultPack(recommendation));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, productType, recId, pack]);

  if (!user || !productType || !recommendation || !packBelongsTo(productType, pack)) return null;

  const meta = TYPE_META[productType];
  const items = variationsOf(productType);
  const { count, total } = packTotals(pack);
  const updateQty = (id, qty) => setPack({ ...pack, [id]: Math.min(MAX_QTY, Math.max(0, Math.floor(qty))) });

  return (
    <div className="packpage">
      <Navbar />
      <div className="container packpage__wrap">
        <span className="eyebrow-plain">{meta.label}</span>
        <h1 className="packpage__title">Explore the FEMORA range</h1>
        <p className="packpage__hint">{CONCEPT_NOTE} Prices are per {meta.unit}.</p>
        <div className="packpage__grid">
          {items.map((item) => <VariationCard key={item.id} item={item} highlighted={item.id === recId} />)}
        </div>

        <div className="packpage__builder">
          <span className="eyebrow-plain">Build your pack</span>
          <h2 className="packpage__subtitle">Build Your FEMORA Pack</h2>
          <p className="packpage__hint">
            We've pre-filled a starter quantity of your recommended variation (proposed prototype prices, per {meta.unit}). Adjust any variation below, up to 50 each.
          </p>

          <div className="packpage__selectors">
            {items.map((item) => (
              <QuantitySelector key={item.id} label={item.name} price={item.price} unit={meta.unit} qty={Math.floor(Number(pack[item.id]) || 0)}
                onChange={(q) => updateQty(item.id, q)} max={MAX_QTY} recommended={item.id === recId} />
            ))}
          </div>

          {count === 0 && <p className="field-error" role="status">Add at least one item to continue.</p>}
          <div className="packpage__summary">
            <div>
              <span className="packpage__summary-label">Total {unitLabel(productType, 2)}</span>
              <span className="packpage__summary-value">{count}</span>
            </div>
            <div>
              <span className="packpage__summary-label">Total price</span>
              <span className="packpage__summary-value packpage__summary-value--price">₹{total}</span>
            </div>
          </div>
        </div>

        <div className="packpage__actions">
          <button className="btn btn-secondary" onClick={() => navigate('/recommendation')}>Back</button>
          <button
            className="btn btn-primary"
            disabled={count === 0}
            onClick={() => navigate('/summary')}
          >
            Continue to Summary
          </button>
        </div>
        {count === 0 && <p className="packpage__empty-hint">Select at least one item to continue.</p>}
      </div>
    </div>
  );
}
