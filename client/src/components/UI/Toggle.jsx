import './Toggle.css';

export default function Toggle({ active, onChange, label }) {
  return (
    <div className="toggle-wrapper">
      <div
        className={`toggle ${active ? 'toggle--active' : ''}`}
        onClick={() => onChange(!active)}
        role="switch"
        aria-checked={active}
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onChange(!active)}
      >
        <div className="toggle__knob" />
      </div>
      {label && <span className="toggle-label">{label}</span>}
    </div>
  );
}
