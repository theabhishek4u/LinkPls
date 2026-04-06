const { Router } = require('express');
const { supabase } = require('../config/supabase');
const { authGuard } = require('../middleware/auth');
const { logger } = require('../utils/logger');

const router = Router();

/**
 * GET /api/analytics/overview — Dashboard stats
 */
router.get('/overview', authGuard, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all campaign IDs for this user
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('id')
      .eq('user_id', userId);

    const campaignIds = (campaigns || []).map((c) => c.id);

    if (campaignIds.length === 0) {
      return res.json({
        totalInteractions: 0,
        followRate: 0,
        activeCampaigns: 0,
        todayTriggers: 0,
        statusBreakdown: {},
        recentActivity: [],
      });
    }

    // Total interactions
    const { count: totalInteractions } = await supabase
      .from('interactions')
      .select('*', { count: 'exact', head: true })
      .in('campaign_id', campaignIds);

    // Follow verified count
    const { count: followVerified } = await supabase
      .from('interactions')
      .select('*', { count: 'exact', head: true })
      .in('campaign_id', campaignIds)
      .eq('status', 'follow_verified');

    // DMs that triggered a follow check
    const { count: dmsSent } = await supabase
      .from('interactions')
      .select('*', { count: 'exact', head: true })
      .in('campaign_id', campaignIds)
      .in('status', ['dm_sent', 'follow_verified', 'follow_failed']);

    // Active campaigns
    const { count: activeCampaigns } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true);

    // Today's triggers
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: todayTriggers } = await supabase
      .from('interactions')
      .select('*', { count: 'exact', head: true })
      .in('campaign_id', campaignIds)
      .gte('created_at', todayStart.toISOString());

    // Status breakdown
    const { data: statusData } = await supabase
      .from('interactions')
      .select('status')
      .in('campaign_id', campaignIds);

    const statusBreakdown = {};
    (statusData || []).forEach((i) => {
      statusBreakdown[i.status] = (statusBreakdown[i.status] || 0) + 1;
    });

    // Recent activity (last 20)
    const { data: recentActivity } = await supabase
      .from('interactions')
      .select('id, ig_username, status, comment_text, created_at')
      .in('campaign_id', campaignIds)
      .order('created_at', { ascending: false })
      .limit(20);

    const followRate = dmsSent > 0 ? ((followVerified / dmsSent) * 100).toFixed(1) : 0;

    res.json({
      totalInteractions: totalInteractions || 0,
      followRate: parseFloat(followRate),
      activeCampaigns: activeCampaigns || 0,
      todayTriggers: todayTriggers || 0,
      statusBreakdown,
      recentActivity: recentActivity || [],
    });
  } catch (err) {
    logger.error('Analytics overview error', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/**
 * GET /api/analytics/interactions — Paginated interaction list
 */
router.get('/interactions', authGuard, async (req, res) => {
  try {
    const { campaign_id, status, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase
      .from('interactions')
      .select('*, campaigns!inner(user_id)', { count: 'exact' })
      .eq('campaigns.user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (campaign_id) query = query.eq('campaign_id', campaign_id);
    if (status) query = query.eq('status', status);

    const { data, count, error } = await query;
    if (error) throw error;

    res.json({
      interactions: data,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / parseInt(limit)),
    });
  } catch (err) {
    logger.error('List interactions error', { error: err.message });
    res.status(500).json({ error: 'Failed to list interactions' });
  }
});

module.exports = router;
