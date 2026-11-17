import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useUser } from '../context/UserContext';
import { PRODUCT_TYPES } from '../config';
import { recommendProduct, isProductType } from '../services/products';
import { attachTilt } from '../utils/motion';
import './ProductType.css';

const NEUTRAL = {
  pads: 'External and disposable. Sizes vary by length and absorbency tier.',
  tampons: 'Internal and disposable. Absorbency categories such as Regular, Super and Super Plus.',
  cups: 'Internal, reusable and washed between uses. Fit differs from person to person.',
  underwear: 'External, reusable and washable. Absorbency is built into the garment.',
};

const ICONS = {
  pads: <><rect x="16" y="6" width="16" height="36" rx="8" /><rect x="8" y="20" width="32" height="9" rx="4" /></>,
  tampons: <><rect x="14" y="8" width="20" height="20" rx="6" /><rect x="20" y="28" width="8" height="10" rx="3" /><path d="M24 38v6" /></>,
  cups: <><path d="M10 12h28l-4 20a10 10 0 0 1-20 0z" /><path d="M24 36v8" /></>,
  underwear: <><path d="M6 12h36l-6 18c-2 6-8 8-12 0-4 8-10 6-12 0z" /></>,
  unsure: <><circle cx="24" cy="24" r="17" /><path d="M19 19a5 5 0 1 1 7 4.5c-2 1-2 2.5-2 4" /><path d="M24 34v.5" /></>,
};

export default function ProductType() {
  const navigate = useNavigate();
  const { user, answers, problemText, problemTags, path, productType, setProductType, setRecommendation } = useUser();
  const [choice, setChoice] = useState(isProductType(productType) ? productType : null);
  const [category, setCategory] = useState(isProductType(productType) ? productType : null);
  const final = choice === 'unsure' ? category : choice;

  useEffect(() => {
    if (!user) navigate('/login');
    else if (!path) navigate('/ready');
  }, [user, path, navigate]);
  useEffect(() => attachTilt('.ptile', 8), []);

  function next() {
    if (!isProductType(final)) return;
    setProductType(final);
    const rec = recommendProduct({ productType: final, path, answers, problemText, problemTags });
    setRecommendation(rec);
    navigate('/recommendation');
  }

  if (!user || !path) return null;
  return (
    <div className="ptype">
      <Navbar transparent />
      <div className="ptype__bg" aria-hidden="true"><span /><span /><span /><span /></div>
      <main className="container ptype__main">
        <span className="ptype__eyebrow">Last step before your suggestion</span>
        <h1 className="ptype__title">Which kind of period product would you choose?</h1>
        <p className="ptype__sub">Your suggestion will be for the product type you choose, never a different one. All product types here are prototype concepts.</p>

        <div className="ptype__grid" role="radiogroup" aria-label="Period product type">
          {PRODUCT_TYPES.map((t, i) => (
            <button key={t.id} type="button" role="radio" aria-checked={choice === t.id} style={{ '--i': i }}
              className={`ptile ${choice === t.id ? 'is-on' : ''}`} onClick={() => setChoice(t.id)}>
              <svg viewBox="0 0 48 48" className="ptile__icon" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">{ICONS[t.id]}</svg>
              <span className="ptile__label">{t.label}</span>
              <span className="ptile__desc">{t.desc}</span>
              <span className="ptile__badge">{t.id === 'unsure' ? 'Compare options' : 'Concept range'}</span>
              <span className="ptile__check" aria-hidden="true">✓</span>
            </button>
          ))}
        </div>

        {choice === 'unsure' && (
          <div className="ptype__explain" role="radiogroup" aria-label="Choose a category to continue">
            <h2>Four options, compared neutrally</h2>
            <p>Each suits different preferences. None is better for everyone. Choose a category and we'll suggest a variation within it.</p>
            <div className="ptype__options">
              {PRODUCT_TYPES.filter((t) => t.id !== 'unsure').map((t) => (
                <button key={t.id} type="button" role="radio" aria-checked={category === t.id} className={`ptype__option ${category === t.id ? 'is-on' : ''}`} onClick={() => setCategory(t.id)}>
                  <strong>{t.label}</strong><span>{NEUTRAL[t.id]}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="ptype__actions">
          <button type="button" className="btn btn-ghost" onClick={() => navigate(path === 'problem' ? '/tell-us' : '/questionnaire')}>Back</button>
          <button type="button" className="btn btn-primary" disabled={!isProductType(final)} onClick={next}>See my suggestion</button>
        </div>
      </main>
    </div>
  );
}
