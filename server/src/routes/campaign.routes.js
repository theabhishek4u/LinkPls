const { Router } = require('express');
const { supabase } = require('../config/supabase');
const { authGuard } = require('../middleware/auth');
const { logger } = require('../utils/logger');
const { z } = require('zod');

const router = Router();

// Validation schemas
const createCampaignSchema = z.object({
  name: z.string().min(1).max(100),
  trigger_keyword: z.string().min(1).max(50).toUpperCase(),
  comment_replies: z.array(z.string()).min(1).max(10).optional(),
  welcome_dm_text: z.string().max(1000).optional(),
  welcome_dm_buttons: z.array(z.object({
    content_type: z.string(),
    title: z.string().max(20),
    payload: z.string(),
  })).optional(),
  resource_template: z.object({
    text: z.string().max(1000),
    buttons: z.array(z.any()).optional(),
  }).optional(),
  error_template: z.object({
    text: z.string().max(1000),
    buttons: z.array(z.any()).optional(),
  }).optional(),
});

/**
 * GET /api/campaigns — List all campaigns for current user
 */
router.get('/', authGuard, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        media_mappings(count),
        interactions(count)
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ campaigns: data });
  } catch (err) {
    logger.error('List campaigns error', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

/**
 * GET /api/campaigns/:id — Get single campaign
 */
router.get('/:id', authGuard, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        media_mappings(*),
        interactions(id, ig_username, status, created_at)
      `)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json({ campaign: data });
  } catch (err) {
    logger.error('Get campaign error', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

/**
 * POST /api/campaigns — Create new campaign
 */
router.post('/', authGuard, async (req, res) => {
  try {
    const parsed = createCampaignSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    }

    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        ...parsed.data,
        user_id: req.user.id,
      })
      .select()
      .single();

    if (error) throw error;

    logger.info('Campaign created', { campaignId: data.id, userId: req.user.id });
    res.status(201).json({ campaign: data });
  } catch (err) {
    logger.error('Create campaign error', { error: err.message });
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

/**
 * PATCH /api/campaigns/:id — Update campaign
 */
router.patch('/:id', authGuard, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .update(req.body)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Campaign not found' });

    res.json({ campaign: data });
  } catch (err) {
    logger.error('Update campaign error', { error: err.message });
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

/**
 * DELETE /api/campaigns/:id — Delete campaign
 */
router.delete('/:id', authGuard, async (req, res) => {
  try {
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;

    res.json({ message: 'Campaign deleted' });
  } catch (err) {
    logger.error('Delete campaign error', { error: err.message });
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

/**
 * PATCH /api/campaigns/:id/toggle — Toggle active/inactive
 */
router.patch('/:id/toggle', authGuard, async (req, res) => {
  try {
    // First get current state
    const { data: current } = await supabase
      .from('campaigns')
      .select('is_active')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (!current) return res.status(404).json({ error: 'Campaign not found' });

    const { data, error } = await supabase
      .from('campaigns')
      .update({ is_active: !current.is_active })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ campaign: data });
  } catch (err) {
    logger.error('Toggle campaign error', { error: err.message });
    res.status(500).json({ error: 'Failed to toggle campaign' });
  }
});

module.exports = router;
