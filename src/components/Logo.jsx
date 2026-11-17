import femoraLogo from '../assets/femora-logo.png';

export default function Logo({ size = 40, withWordmark = true, dark = false }) {
  const ink = dark ? '#FAF6EE' : '#1F2A1C';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <img
        src={femoraLogo}
        alt="FEMORA logo"
        width={size}
        height={size}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
      {withWordmark && (
        <span style={{
          fontFamily: 'Fraunces, serif',
          fontWeight: 600,
          fontSize: size * 0.62,
          letterSpacing: '0.01em',
          color: ink,
        }}>
          FEMORA
        </span>
      )}
    </div>
  );
}
