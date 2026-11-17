import { PAD_CATALOG } from '../services/recommendationEngine';
import './RecommendationCard.css';

export default function RecommendationCard({ recommendation }) {
  const pad = PAD_CATALOG[recommendation.size];

  const rows = [
    ['Pad type', pad.label],
    ['Flow level', recommendation.flowLevel],
    ['Absorbency tier (illustrative)', recommendation.absorbency],
    ['Thickness', recommendation.thickness],
    ['Softness', recommendation.softness],
    ['Leakage-protection priority', recommendation.leakageProtection],
    ['Skin-comfort priority', recommendation.skinFriendlyPriority ? 'Yes' : 'Standard'],
    ['Odor-control option', recommendation.odorManagement ? 'Noted' : 'Standard'],
    ['Material goal', 'Biodegradable (not yet verified)'],
  ];

  return (
    <div className="reccard">
      <div className="reccard__body">
        <dl className="reccard__grid">
          {rows.map(([k, v]) => (
            <div key={k} className="reccard__row">
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <p className="reccard__disclaimer">
          {recommendation.disclaimer} Specifications and prices are illustrative prototype values, not validated product data.
        </p>
      </div>
    </div>
  );
}
