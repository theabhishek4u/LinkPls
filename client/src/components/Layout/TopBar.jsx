import { Bell, RefreshCw } from 'lucide-react';
import './TopBar.css';

export default function TopBar({ title, subtitle }) {
  return (
    <header className="topbar">
      <div className="topbar__title-group">
        <h1 className="topbar__title">{title}</h1>
        {subtitle && <p className="topbar__subtitle">{subtitle}</p>}
      </div>

      <div className="topbar__actions">
        <button className="topbar__icon-btn" title="Refresh">
          <RefreshCw size={18} />
        </button>
        <button className="topbar__icon-btn" title="Notifications">
          <Bell size={18} />
          <span className="topbar__badge" />
        </button>
      </div>
    </header>
  );
}
