import { Component, lazy, Suspense, useState } from 'react';
import { vizFor, getVariation, TYPE_META } from '../services/products';
import './ProductViewer.css';

const Viewer3D = lazy(() => import('./viewer/ProductViewer3D'));

class Boundary extends Component {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  render() { return this.state.err ? this.props.fallback : this.props.children; }
}

export function webglAvailable() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

// Static, non-interactive silhouettes used while loading or if WebGL is unavailable.
const SHAPES = {
  pads: <><rect x="70" y="30" width="60" height="140" rx="30" /><rect x="40" y="80" width="120" height="36" rx="16" /></>,
  tampons: <><rect x="50" y="76" width="100" height="48" rx="24" /><path d="M150 100 q22 4 30 24 t-8 30" fill="none" /></>,
  cups: <><path d="M60 50h80l-12 70a28 28 0 0 1-56 0z" /><path d="M100 148v26" fill="none" /></>,
  underwear: <><path d="M30 50h140l-22 60c-8 22-30 22-48 6-18 16-40 16-48-6z" /></>,
};
export function ViewerFallback({ type, label, note }) {
  return (
    <div className="pv__fallback" role="img" aria-label={`${label}. Static illustration${note ? `: ${note}` : ''}`}>
      <svg viewBox="0 0 200 200" fill="rgba(244,198,198,.25)" stroke="var(--blush-300)" strokeWidth="3" strokeLinecap="round" aria-hidden="true">{SHAPES[type] || SHAPES.pads}</svg>
      {note && <p>{note}</p>}
    </div>
  );
}

export default function ProductViewer({ type, variationId }) {
  const item = getVariation(variationId);
  const viz = vizFor(type, variationId);
  const [failed, setFailed] = useState(() => !webglAvailable());
  const [ready, setReady] = useState(false);
  const label = `${TYPE_META[type]?.label || 'Product'}${item ? `, ${item.name}` : ''}`;
  const fallback = <ViewerFallback type={viz.kind} label={label} note="3D view unavailable on this device" />;
  return (
    <div className="pv" data-viz-kind={viz.kind} data-viz-tier={viz.tier} data-mode={failed ? 'fallback' : '3d'}>
      <div className="pv__stage">
        {failed ? fallback : (
          <Boundary fallback={fallback}>
            <Suspense fallback={<ViewerFallback type={viz.kind} label={label} note="Loading 3D model…" />}>
              <Viewer3D type={viz.kind} tier={viz.tier} label={label} onFail={() => setFailed(true)} onReady={() => setReady(true)} />
            </Suspense>
          </Boundary>
        )}
        {!failed && !ready && <span className="pv__loading" role="status">Loading 3D model…</span>}
      </div>
      <p className="pv__caption">Concept 3D model, not a real product photo. {failed ? '' : 'Drag or use the arrow keys to rotate.'}</p>
    </div>
  );
}
