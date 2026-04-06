import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Zap,
  Film,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react';
import './Sidebar.css';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/campaigns', icon: Zap, label: 'Campaigns' },
  { to: '/media', icon: Film, label: 'Media Mapping' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
];

const settingsItems = [
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar({ user, onLogout }) {
  const initials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : 'IN';

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar__brand">
        <div className="sidebar__logo">⚡</div>
        <div>
          <div className="sidebar__title gradient-text">InAutoDm</div>
          <div className="sidebar__subtitle">Automation Engine</div>
        </div>
      </div>

      {/* Status */}
      <div style={{ padding: '12px 0' }}>
        <div className="sidebar__status">
          <span className="sidebar__status-dot" />
          <span className="sidebar__status-text">System Active</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar__nav">
        <span className="sidebar__section-label">Main</span>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
            }
          >
            <item.icon size={18} className="sidebar__link-icon" />
            {item.label}
          </NavLink>
        ))}

        <span className="sidebar__section-label" style={{ marginTop: '12px' }}>System</span>
        {settingsItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
            }
          >
            <item.icon size={18} className="sidebar__link-icon" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer / User */}
      <div className="sidebar__footer">
        <div className="sidebar__user" onClick={onLogout} title="Sign out">
          <div className="sidebar__avatar">{initials}</div>
          <div className="sidebar__user-info">
            <div className="sidebar__user-name">{user?.email || 'User'}</div>
            <div className="sidebar__user-plan">Pro Plan</div>
          </div>
          <LogOut size={16} style={{ color: 'var(--text-tertiary)' }} />
        </div>
      </div>
    </aside>
  );
}
