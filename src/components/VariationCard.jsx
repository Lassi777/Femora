import './PadCard.css';
import { unitLabel } from '../services/products';

// Generic product-variation card used by the pack builder for every product type.
export default function VariationCard({ item, highlighted = false }) {
  return (
    <div className={`padcard ${highlighted ? 'padcard--highlight' : ''}`}>
      {highlighted && <span className="padcard__badge">Recommended for you</span>}
      <h3 className="padcard__name">{item.name}</h3>
      <p className="padcard__tagline">{item.desc}</p>
      <dl className="padcard__specs">
        {item.specs.map(([k, val]) => <div key={k}><dt>{k}</dt><dd>{val}</dd></div>)}
      </dl>
      <div className="padcard__price">₹{item.price}<span>/{unitLabel(item.type, 1)} (proposed)</span></div>
    </div>
  );
}
