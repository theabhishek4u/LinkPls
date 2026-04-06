import './GlassCard.css';

export default function GlassCard({
  children,
  className = '',
  hoverable = false,
  accent = false,
  glow = false,
  style,
  onClick,
}) {
  const classes = [
    'glass-card',
    hoverable && 'glass-card--hoverable',
    accent && 'glass-card--accent',
    glow && 'glass-card--glow',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} style={style} onClick={onClick}>
      {children}
    </div>
  );
}
