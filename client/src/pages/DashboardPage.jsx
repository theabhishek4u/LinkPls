import { useEffect } from 'react';
import {
  Zap,
  Users,
  TrendingUp,
  MessageCircle,
  Activity,
} from 'lucide-react';
import TopBar from '../components/Layout/TopBar';
import GlassCard from '../components/UI/GlassCard';
import { useAnalytics } from '../hooks/useAnalytics';
import { formatNumber, timeAgo, formatStatus } from '../utils/formatters';
import './DashboardPage.css';

export default function DashboardPage() {
  const { overview, loading, fetchOverview } = useAnalytics();

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const stats = [
    {
      label: 'Total Interactions',
      value: formatNumber(overview?.totalInteractions || 0),
      icon: <Zap size={18} />,
      color: 'var(--accent-primary)',
      bg: 'rgba(139, 92, 246, 0.1)',
    },
    {
      label: 'Follow Rate',
      value: `${overview?.followRate || 0}%`,
      icon: <TrendingUp size={18} />,
      color: 'var(--success)',
      bg: 'var(--success-bg)',
    },
    {
      label: 'Active Campaigns',
      value: formatNumber(overview?.activeCampaigns || 0),
      icon: <Activity size={18} />,
      color: 'var(--accent-secondary)',
      bg: 'rgba(236, 72, 153, 0.1)',
    },
    {
      label: "Today's Triggers",
      value: formatNumber(overview?.todayTriggers || 0),
      icon: <MessageCircle size={18} />,
      color: 'var(--info)',
      bg: 'var(--info-bg)',
    },
  ];

  const statusBreakdown = overview?.statusBreakdown || {};
  const total = Object.values(statusBreakdown).reduce((a, b) => a + b, 0) || 1;

  const funnelItems = [
    { label: 'Triggered', key: 'triggered', color: 'var(--info)' },
    { label: 'Replied', key: 'comment_replied', color: 'var(--accent-primary)' },
    { label: 'DM Sent', key: 'dm_sent', color: 'var(--warning)' },
    { label: 'Followed', key: 'follow_verified', color: 'var(--success)' },
    { label: 'Failed', key: 'follow_failed', color: 'var(--error)' },
  ];

  return (
    <div className="fade-in">
      <TopBar title="Dashboard" subtitle="Real-time automation overview" />

      <div className="dashboard">
        {/* Stats Grid */}
        <div className="stats-grid">
          {stats.map((s, i) => (
            <GlassCard key={i} hoverable className="stat-card slide-up" style={{ animationDelay: `${i * 0.08}s` }}>
              <div className="stat-card__header">
                <span className="stat-card__label">{s.label}</span>
                <div className="stat-card__icon" style={{ background: s.bg, color: s.color }}>
                  {s.icon}
                </div>
              </div>
              <div className="stat-card__value" style={{ color: s.color }}>{s.value}</div>
            </GlassCard>
          ))}
        </div>

        {/* Charts Row */}
        <div className="dashboard__row">
          {/* Follow Funnel */}
          <GlassCard className="funnel slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="funnel__title">📊 Follow Gate Funnel</div>
            <div className="funnel__bars">
              {funnelItems.map((item) => {
                const count = statusBreakdown[item.key] || 0;
                const pct = total > 0 ? (count / total) * 100 : 0;
                return (
                  <div className="funnel-bar" key={item.key}>
                    <span className="funnel-bar__label">{item.label}</span>
                    <div className="funnel-bar__track">
                      <div
                        className="funnel-bar__fill"
                        style={{ width: `${Math.max(pct, 3)}%`, background: item.color }}
                      >
                        {pct > 10 ? `${pct.toFixed(0)}%` : ''}
                      </div>
                    </div>
                    <span className="funnel-bar__count">{formatNumber(count)}</span>
                  </div>
                );
              })}
            </div>
          </GlassCard>

          {/* Activity Feed */}
          <GlassCard className="activity-feed slide-up" style={{ animationDelay: '0.4s' }}>
            <div className="activity-feed__title">
              <Activity size={16} style={{ color: 'var(--accent-primary)' }} />
              Recent Activity
            </div>
            <div className="activity-feed__list">
              {(overview?.recentActivity || []).length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state__icon">
                    <Users size={24} />
                  </div>
                  <p className="empty-state__text">
                    No activity yet.<br />Interactions will appear here in real-time.
                  </p>
                </div>
              ) : (
                (overview?.recentActivity || []).slice(0, 8).map((item) => (
                  <div className="activity-item" key={item.id}>
                    <div className="activity-item__avatar">
                      {(item.ig_username || '??').substring(0, 2).toUpperCase()}
                    </div>
                    <div className="activity-item__content">
                      <div className="activity-item__username">@{item.ig_username || 'unknown'}</div>
                      <div className="activity-item__action">{item.comment_text || 'Interaction'}</div>
                    </div>
                    <span className={`activity-item__status status-${item.status}`}>
                      {formatStatus(item.status)}
                    </span>
                    <span className="activity-item__time">{timeAgo(item.created_at)}</span>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
