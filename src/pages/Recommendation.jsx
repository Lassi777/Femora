import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ProductViewer from '../components/ProductViewer';
import { useUser } from '../context/UserContext';
import { TYPE_META, getVariation, variationsOf, defaultPack } from '../services/products';
import './Recommendation.css';

export default function Recommendation() {
  const navigate = useNavigate();
  const { user, recommendation: rec, productType, path, setPack } = useUser();
  const [picked, setPicked] = useState(null); // a variation the customer chose instead of the suggestion

  useEffect(() => {
    if (!user) navigate('/login');
    else if (!productType) navigate(path ? '/product-type' : '/ready');
    else if (!rec) navigate('/ready');
  }, [user, productType, rec, path, navigate]);

  if (!user || !productType || !rec) return null;

  const meta = TYPE_META[productType];
  const options = variationsOf(productType);
  const selectedId = picked && rec.alternatives.includes(picked) ? picked : rec.variationId;
  const sel = getVariation(selectedId);
  const suggested = getVariation(rec.variationId);

  function handleContinue() {
    setPack(defaultPack({ ...rec, variationId: selectedId }));
    navigate('/pack');
  }

  return (
    <div className="rp">
      <Navbar />
      <main className="container rp__wrap">
        <p className="rp__crumb">Your personalized suggestion · {meta.label}</p>
        <div className="rp__grid">
          <section className="rp__stage" aria-label="Product model">
            <ProductViewer type={productType} variationId={selectedId} />
          </section>

          <section className="rp__panel">
            <span className="rp__eyebrow">{meta.label} · Concept</span>
            <h1 className="rp__name">{sel.name}</h1>
            <p className={`rp__badge ${selectedId === rec.variationId ? '' : 'is-alt'}`}>
              {selectedId === rec.variationId ? 'Recommended for you' : `Your choice · suggested: ${suggested.name}`}
            </p>
            <p className="rp__desc">{sel.desc}</p>

            <p className="rp__price">₹{sel.price}<span>per {meta.unit} · proposed prototype price</span></p>

            <div className="rp__variants" role="radiogroup" aria-label={`${meta.label} variations`}>
              {options.map((o) => (
                <button key={o.id} type="button" role="radio" aria-checked={o.id === selectedId} className={`rp__chip ${o.id === selectedId ? 'is-on' : ''}`} onClick={() => setPicked(o.id)}>
                  <span>{o.name}</span><small>₹{o.price}{o.id === rec.variationId ? ' · suggested' : ''}</small>
                </button>
              ))}
            </div>

            <dl className="rp__specs">
              {sel.specs.map(([k, val]) => <div key={k}><dt>{k}</dt><dd>{val}</dd></div>)}
            </dl>

            <h2 className="rp__h">Why this suggestion</h2>
            <ul className="rp__reasons">{rec.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
            <details className="rp__more"><summary>Your personalization summary</summary>
              <dl className="rp__specs">{rec.attributes.map(([k, val]) => <div key={k}><dt>{k}</dt><dd>{val}</dd></div>)}</dl>
            </details>
            <p className="rp__disclaimer">{rec.disclaimer}</p>

            <div className="rp__actions">
              <button className="btn btn-primary" onClick={handleContinue}>Continue to pack builder</button>
              <button className="btn btn-secondary" onClick={() => navigate('/product-type')}>Change product type</button>
              <button className="btn btn-ghost" onClick={() => navigate(path === 'problem' ? '/tell-us' : '/questionnaire')}>{path === 'problem' ? 'Revise my description' : 'Review my answers'}</button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
