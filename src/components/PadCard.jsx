import './PadCard.css';

export default function PadCard({ pad, highlighted = false }) {
  return (
    <div className={`padcard ${highlighted ? 'padcard--highlight' : ''}`}>
      {highlighted && <span className="padcard__badge">Recommended for you</span>}
      <div className="padcard__glyph" aria-hidden="true">
        <svg viewBox="0 0 40 64" width="34" height="54">
          <rect x="4" y="2" width="32" height="60" rx="16" fill={highlighted ? '#B4365B' : '#6E8F63'} opacity="0.16" />
          <rect x="10" y="8" width="20" height="48" rx="10" fill={highlighted ? '#B4365B' : '#6E8F63'} opacity="0.55" />
        </svg>
      </div>
      <h3 className="padcard__name">{pad.label}</h3>
      <p className="padcard__tagline">{pad.tagline}</p>
      <dl className="padcard__specs">
        <div><dt>Flow</dt><dd>{pad.flow}</dd></div>
        <div><dt>Absorbency tier</dt><dd>{pad.absorbency}</dd></div>
        <div><dt>Thickness</dt><dd>{pad.thickness}</dd></div>
        <div><dt>Softness</dt><dd>{pad.softness}</dd></div>
      </dl>
      <div className="padcard__price">₹{pad.price}<span>/pad (proposed)</span></div>
    </div>
  );
}
