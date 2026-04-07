import { useEffect, useState } from 'react';
import { Globe, AlertTriangle } from 'lucide-react';
import TopBar from '../components/Layout/TopBar';
import GlassCard from '../components/UI/GlassCard';
import Button from '../components/UI/Button';
import { useToast } from '../components/UI/Toast';
import api from '../services/api';
import './SettingsPage.css';

export default function SettingsPage() {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      setProfile(data.profile);
    } catch (err) {
      console.error('Failed to fetch profile', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check for OAuth success param
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('oauth_success') === 'true') {
      toast.success('Successfully connected Instagram account!');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    fetchProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnectClick = () => {
    if (!user) return;
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    // Redirect to backend OAuth initiator
    window.location.href = `${API_URL}/auth/instagram?userId=${user.id}`;
  };

  const isConnected = !!profile?.ig_business_id;

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
              <div className="settings-connection__name">
                {isConnected ? (profile.ig_username || 'Business Account') : 'Instagram Business'}
              </div>
              <div className="settings-connection__status" style={{ color: 'var(--text-secondary)' }}>
                <span className={`settings-connection__dot ${isConnected ? 'settings-connection__dot--connected' : 'settings-connection__dot--disconnected'}`} />
                {isConnected ? 'Connected' : 'Not connected'}
              </div>
            </div>
            <Button 
                variant={isConnected ? 'secondary' : 'primary'} 
                size="sm" 
                onClick={handleConnectClick}
                disabled={loading}
            >
              {isConnected ? 'Reconnect' : 'Connect'}
            </Button>
          </div>
        </GlassCard>

        {/* Danger Zone */}
        <GlassCard className="settings-section settings__danger-zone slide-up" style={{ animationDelay: '0.1s' }}>
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

