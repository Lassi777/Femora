export default function ProgressBar({ current, total, label }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div style={{ width: '100%' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', marginBottom: 10,
        fontSize: 13.5, fontWeight: 700, color: 'var(--ink-500)',
      }}>
        <span>{label || `Step ${current} of ${total}`}</span>
        <span>{pct}%</span>
      </div>
      <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Questionnaire progress" style={{
        height: 8, borderRadius: 999, background: 'var(--sage-50)', overflow: 'hidden',
        border: '1px solid var(--line)',
      }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: 999,
          background: 'linear-gradient(90deg, var(--sage-500), var(--berry-500))',
          transition: 'width 0.35s ease',
        }} />
      </div>
    </div>
  );
}
