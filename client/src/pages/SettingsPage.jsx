import { Globe, Shield, AlertTriangle } from 'lucide-react';
import TopBar from '../components/Layout/TopBar';
import GlassCard from '../components/UI/GlassCard';
import Button from '../components/UI/Button';
import './SettingsPage.css';

export default function SettingsPage() {
  return (
    <div className="fade-in">
      <TopBar title="Settings" subtitle="Configure your automation engine" />

      <div className="settings-page">
        {/* Instagram Connection */}
        <GlassCard className="settings-section slide-up">
          <h2 className="settings-section__title">Instagram Connection</h2>
          <p className="settings-section__desc">
            Connect your Instagram Business account to enable automation.
          </p>

          <div className="settings-connection">
            <div
              className="settings-connection__icon"
              style={{ background: 'linear-gradient(135deg, #833AB4, #E1306C, #F77737)' }}
            >
              <Globe size={22} color="white" />
            </div>
            <div className="settings-connection__info">
              <div className="settings-connection__name">Instagram Business</div>
              <div className="settings-connection__status" style={{ color: 'var(--text-secondary)' }}>
                <span className="settings-connection__dot settings-connection__dot--disconnected" />
                Not connected
              </div>
            </div>
            <Button variant="primary" size="sm">Connect</Button>
          </div>
        </GlassCard>

        {/* API Configuration */}
        <GlassCard className="settings-section slide-up" style={{ animationDelay: '0.1s' }}>
          <h2 className="settings-section__title">
            <Shield size={18} style={{ color: 'var(--accent-primary)', marginRight: '8px', verticalAlign: 'middle' }} />
            API Configuration
          </h2>
          <p className="settings-section__desc">
            These values are stored in your server environment. Update your .env file to change them.
          </p>

          <div className="settings-form">
            <div className="settings-form__group">
              <label className="settings-form__label">Page Access Token</label>
              <input
                type="password"
                value="••••••••••••••••••••••"
                readOnly
                className="settings-form__token"
              />
              <span className="settings-form__hint">
                Set via IG_ACCESS_TOKEN in your .env file
              </span>
            </div>

            <div className="settings-form__group">
              <label className="settings-form__label">Webhook Verify Token</label>
              <input
                type="password"
                value="••••••••••••"
                readOnly
                className="settings-form__token"
              />
              <span className="settings-form__hint">
                Set via WEBHOOK_VERIFY_TOKEN in your .env file
              </span>
            </div>

            <div className="settings-form__group">
              <label className="settings-form__label">Meta App Secret</label>
              <input
                type="password"
                value="••••••••••••"
                readOnly
                className="settings-form__token"
              />
              <span className="settings-form__hint">
                Used for webhook signature verification
              </span>
            </div>
          </div>
        </GlassCard>

        {/* Danger Zone */}
        <GlassCard className="settings-section settings__danger-zone slide-up" style={{ animationDelay: '0.2s' }}>
          <h2 className="settings-section__title">
            <AlertTriangle size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Danger Zone
          </h2>
          <p className="settings-section__desc">
            Destructive actions that cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button variant="danger" size="sm">Clear All Data</Button>
            <Button variant="danger" size="sm">Delete Account</Button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
