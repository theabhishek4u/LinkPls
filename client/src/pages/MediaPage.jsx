import { useEffect, useState } from 'react';
import { Plus, Link2, Film, Image } from 'lucide-react';
import TopBar from '../components/Layout/TopBar';
import GlassCard from '../components/UI/GlassCard';
import Button from '../components/UI/Button';
import Toggle from '../components/UI/Toggle';
import Modal from '../components/UI/Modal';
import { useToast } from '../components/UI/Toast';
import { useCampaigns } from '../hooks/useCampaigns';
import { truncate } from '../utils/formatters';
import api from '../services/api';
import './MediaPage.css';

export default function MediaPage() {
  const { campaigns, fetchCampaigns } = useCampaigns();
  const toast = useToast();
  const [mappings, setMappings] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    campaign_id: '',
    ig_media_id: '',
    resource_url: '',
    resource_label: '',
  });

  useEffect(() => {
    fetchCampaigns();
    fetchMappings();
  }, [fetchCampaigns]);

  const fetchMappings = async () => {
    try {
      const { data } = await api.get('/media/mappings');
      setMappings(data.mappings || []);
    } catch (err) {
      console.error('Failed to fetch mappings');
    }
  };

  const handleCreate = async () => {
    try {
      if (!form.campaign_id || !form.ig_media_id || !form.resource_url) {
        toast.error('All fields are required');
        return;
      }
      setLoading(true);
      const { data } = await api.post('/media/mappings', form);
      setMappings((prev) => [data.mapping, ...prev]);
      toast.success('Media mapping created! 🔗');
      setShowModal(false);
      setForm({ campaign_id: '', ig_media_id: '', resource_url: '', resource_label: '' });
    } catch {
      toast.error('Failed to create mapping');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      const { data } = await api.patch(`/media/mappings/${id}/toggle`);
      setMappings((prev) => prev.map((m) => (m.id === id ? data.mapping : m)));
    } catch {
      toast.error('Failed to toggle mapping');
    }
  };

  const typeIcons = {
    REEL: <Film size={12} />,
    POST: <Image size={12} />,
  };

  return (
    <div className="fade-in">
      <TopBar title="Media Mapping" subtitle="Map your Reels & Posts to resource links" />

      <div className="media-page">
        <div className="media-page__header">
          <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
            {mappings.length} mapping{mappings.length !== 1 ? 's' : ''}
          </span>
          <Button variant="primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> New Mapping
          </Button>
        </div>

        {mappings.length === 0 ? (
          <GlassCard>
            <div className="empty-state">
              <div className="empty-state__icon">
                <Link2 size={28} />
              </div>
              <p className="empty-state__text">
                No media mappings yet.<br />
                Connect your Reels to resource links to start automating.
              </p>
              <Button variant="primary" onClick={() => setShowModal(true)}>
                <Plus size={16} /> Create Mapping
              </Button>
            </div>
          </GlassCard>
        ) : (
          <div className="media-grid">
            {mappings.map((m, i) => (
              <GlassCard
                key={m.id}
                hoverable
                className="reel-card slide-up"
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                <div className="reel-card__preview">
                  {m.media_thumbnail || m.media_url ? (
                    <img
                      src={m.media_thumbnail || m.media_url}
                      alt="Media preview"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <Film size={40} style={{ color: 'var(--text-tertiary)' }} />
                  )}
                  <span className="reel-card__type-badge">
                    {typeIcons[m.media_type] || null} {m.media_type || 'POST'}
                  </span>
                  <span
                    className={`reel-card__status-badge reel-card__status-badge--${m.is_active ? 'active' : 'inactive'}`}
                  />
                </div>

                <div className="reel-card__body">
                  <p className="reel-card__caption">
                    {m.media_caption || `Media ID: ${truncate(m.ig_media_id, 20)}`}
                  </p>

                  <div className="reel-card__mapping">
                    <Link2 size={14} className="reel-card__mapping-icon" />
                    <span className="reel-card__mapping-url">{m.resource_url}</span>
                  </div>

                  <div className="reel-card__footer">
                    <Toggle
                      active={m.is_active}
                      onChange={() => handleToggle(m.id)}
                      label={m.is_active ? 'Active' : 'Paused'}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      {m.resource_label || 'Resource'}
                    </span>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      {/* Create Mapping Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create Media Mapping"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} loading={loading}>Create Mapping</Button>
          </>
        }
      >
        <div className="mapping-form">
          <div className="mapping-form__group">
            <label className="mapping-form__label">Campaign</label>
            <select
              className="mapping-form__select"
              value={form.campaign_id}
              onChange={(e) => setForm({ ...form, campaign_id: e.target.value })}
              id="mapping-campaign"
            >
              <option value="">Select a campaign</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.trigger_keyword})</option>
              ))}
            </select>
          </div>

          <div className="mapping-form__group">
            <label className="mapping-form__label">Instagram Media ID</label>
            <input
              type="text"
              placeholder="e.g., 17846368219941692"
              value={form.ig_media_id}
              onChange={(e) => setForm({ ...form, ig_media_id: e.target.value })}
              style={{ fontFamily: 'var(--font-mono)' }}
              id="mapping-media-id"
            />
          </div>

          <div className="mapping-form__group">
            <label className="mapping-form__label">Resource URL</label>
            <input
              type="url"
              placeholder="https://your-link.com/resource"
              value={form.resource_url}
              onChange={(e) => setForm({ ...form, resource_url: e.target.value })}
              id="mapping-resource-url"
            />
          </div>

          <div className="mapping-form__group">
            <label className="mapping-form__label">Label (optional)</label>
            <input
              type="text"
              placeholder="e.g., Free E-Book"
              value={form.resource_label}
              onChange={(e) => setForm({ ...form, resource_label: e.target.value })}
              id="mapping-label"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
