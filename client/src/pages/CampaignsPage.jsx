import { useEffect, useState } from 'react';
import {
  Plus,
  Zap,
  Hash,
  Trash2,
} from 'lucide-react';
import TopBar from '../components/Layout/TopBar';
import GlassCard from '../components/UI/GlassCard';
import Button from '../components/UI/Button';
import Toggle from '../components/UI/Toggle';
import Modal from '../components/UI/Modal';
import { useToast } from '../components/UI/Toast';
import { useCampaigns } from '../hooks/useCampaigns';
import { timeAgo } from '../utils/formatters';
import './CampaignsPage.css';

const DEFAULT_REPLIES = [
  "Check your DM! 📩",
  "Sent! Check your inbox 🚀",
  "Just sent it to you! 💜",
  "It's in your DMs! Go check ✨",
  "Heading to your DMs right now! 🎉",
];

export default function CampaignsPage() {
  const {
    campaigns,
    loading,
    fetchCampaigns,
    createCampaign,
    toggleCampaign,
    deleteCampaign,
  } = useCampaigns();

  const toast = useToast();
  const [showEditor, setShowEditor] = useState(false);
  const [form, setForm] = useState({
    name: '',
    trigger_keyword: '',
    comment_replies: [...DEFAULT_REPLIES],
    welcome_dm_text:
      "Hey there! I'm so happy you're here, thanks so much for your interest 😊",
  });

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleCreate = async () => {
    try {
      if (!form.name || !form.trigger_keyword) {
        toast.error('Name and keyword are required');
        return;
      }
      await createCampaign({
        ...form,
        trigger_keyword: form.trigger_keyword.toUpperCase(),
        comment_replies: form.comment_replies.filter((r) => r.trim()),
      });
      toast.success('Campaign created! 🎉');
      setShowEditor(false);
      setForm({
        name: '',
        trigger_keyword: '',
        comment_replies: [...DEFAULT_REPLIES],
        welcome_dm_text:
          "Hey there! I'm so happy you're here, thanks so much for your interest 😊",
      });
    } catch {
      toast.error('Failed to create campaign');
    }
  };

  const handleToggle = async (id) => {
    try {
      const updated = await toggleCampaign(id);
      toast.success(updated.is_active ? 'Campaign activated' : 'Campaign paused');
    } catch {
      toast.error('Failed to toggle campaign');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this campaign? This cannot be undone.')) return;
    try {
      await deleteCampaign(id);
      toast.success('Campaign deleted');
    } catch {
      toast.error('Failed to delete campaign');
    }
  };

  const updateReply = (index, value) => {
    const updated = [...form.comment_replies];
    updated[index] = value;
    setForm({ ...form, comment_replies: updated });
  };

  return (
    <div className="fade-in">
      <TopBar title="Campaigns" subtitle="Manage your automation rules" />

      <div className="campaigns-page">
        <div className="campaigns-page__header">
          <span className="campaigns-page__count">
            {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}
          </span>
          <Button variant="primary" onClick={() => setShowEditor(true)}>
            <Plus size={16} /> New Campaign
          </Button>
        </div>

        {campaigns.length === 0 && !loading ? (
          <GlassCard>
            <div className="empty-state">
              <div className="empty-state__icon">
                <Zap size={28} />
              </div>
              <p className="empty-state__text">
                No campaigns yet.<br />
                Create your first Follow-Gate automation to get started.
              </p>
              <Button variant="primary" onClick={() => setShowEditor(true)}>
                <Plus size={16} /> Create Campaign
              </Button>
            </div>
          </GlassCard>
        ) : (
          <div className="campaigns-grid">
            {campaigns.map((c, i) => (
              <GlassCard
                key={c.id}
                hoverable
                accent={c.is_active}
                className="campaign-card slide-up"
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                <div className="campaign-card__header">
                  <div>
                    <div className="campaign-card__name">{c.name}</div>
                  </div>
                  <span className="campaign-card__keyword">
                    <Hash size={12} /> {c.trigger_keyword}
                  </span>
                </div>

                <div className="campaign-card__stats">
                  <div className="campaign-card__stat">
                    <div className="campaign-card__stat-value" style={{ color: 'var(--info)' }}>
                      {c.media_mappings?.[0]?.count || 0}
                    </div>
                    <div className="campaign-card__stat-label">Media</div>
                  </div>
                  <div className="campaign-card__stat">
                    <div className="campaign-card__stat-value" style={{ color: 'var(--accent-primary)' }}>
                      {c.interactions?.[0]?.count || 0}
                    </div>
                    <div className="campaign-card__stat-label">Interactions</div>
                  </div>
                  <div className="campaign-card__stat">
                    <div className="campaign-card__stat-value" style={{ color: 'var(--success)' }}>
                      {(c.comment_replies || []).length}
                    </div>
                    <div className="campaign-card__stat-label">Replies</div>
                  </div>
                </div>

                <div className="campaign-card__footer">
                  <Toggle
                    active={c.is_active}
                    onChange={() => handleToggle(c.id)}
                    label={c.is_active ? 'Active' : 'Paused'}
                  />
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className="campaign-card__date">{timeAgo(c.created_at)}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                      style={{ color: 'var(--text-tertiary)', padding: '4px' }}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      {/* Create Campaign Modal */}
      <Modal
        isOpen={showEditor}
        onClose={() => setShowEditor(false)}
        title="Create Campaign"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowEditor(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate}>Create Campaign</Button>
          </>
        }
      >
        <div className="campaign-editor">
          <div className="campaign-editor__group">
            <label className="campaign-editor__label">Campaign Name</label>
            <input
              type="text"
              placeholder="e.g., Free Guide Giveaway"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              id="campaign-name"
            />
          </div>

          <div className="campaign-editor__group">
            <label className="campaign-editor__label">Trigger Keyword</label>
            <input
              type="text"
              placeholder="e.g., GUIDE"
              value={form.trigger_keyword}
              onChange={(e) => setForm({ ...form, trigger_keyword: e.target.value.toUpperCase() })}
              style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}
              id="campaign-keyword"
            />
            <span className="campaign-editor__hint">
              When someone comments this keyword, automation starts
            </span>
          </div>

          <div className="campaign-editor__group">
            <label className="campaign-editor__label">Comment Reply Variations (5)</label>
            <span className="campaign-editor__hint">
              System picks a random reply for each comment
            </span>
            <div className="campaign-editor__replies">
              {form.comment_replies.map((reply, i) => (
                <div className="campaign-editor__reply-row" key={i}>
                  <span className="campaign-editor__reply-num">{i + 1}</span>
                  <input
                    type="text"
                    value={reply}
                    onChange={(e) => updateReply(i, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="campaign-editor__group">
            <label className="campaign-editor__label">Welcome DM Message</label>
            <textarea
              value={form.welcome_dm_text}
              onChange={(e) => setForm({ ...form, welcome_dm_text: e.target.value })}
              id="campaign-welcome-dm"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
