const { Router } = require('express');
const { supabase } = require('../config/supabase');
const { instagramService } = require('../services/instagram.service');
const { authGuard } = require('../middleware/auth');
const { logger } = require('../utils/logger');
const { z } = require('zod');

const router = Router();

const createMappingSchema = z.object({
  campaign_id: z.string().uuid(),
  ig_media_id: z.string().min(1),
  resource_url: z.string().url(),
  resource_label: z.string().max(100).optional(),
});

/**
 * GET /api/media/instagram — Fetch recent media from connected IG account
 */
router.get('/instagram', authGuard, async (req, res) => {
  try {
    const media = await instagramService.listMedia(25);
    res.json({ media });
  } catch (err) {
    logger.error('Fetch IG media error', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch Instagram media' });
  }
});

/**
 * GET /api/media/mappings?campaign_id= — List mappings for a campaign
 */
router.get('/mappings', authGuard, async (req, res) => {
  try {
    const { campaign_id } = req.query;
    let query = supabase.from('media_mappings').select('*');

    if (campaign_id) {
      query = query.eq('campaign_id', campaign_id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    res.json({ mappings: data });
  } catch (err) {
    logger.error('List mappings error', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch mappings' });
  }
});

/**
 * POST /api/media/mappings — Create a new media → link mapping
 */
router.post('/mappings', authGuard, async (req, res) => {
  try {
    const parsed = createMappingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    }

    // Verify campaign belongs to user
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', parsed.data.campaign_id)
      .eq('user_id', req.user.id)
      .single();

    if (!campaign) {
      return res.status(403).json({ error: 'Campaign not found or unauthorized' });
    }

    // Fetch media details from Instagram
    let mediaDetails = {};
    try {
      mediaDetails = await instagramService.getMedia(parsed.data.ig_media_id);
    } catch {
      // Non-critical — we can still create the mapping
    }

    const { data, error } = await supabase
      .from('media_mappings')
      .insert({
        ...parsed.data,
        media_type: mediaDetails.media_type || 'POST',
        media_url: mediaDetails.media_url || mediaDetails.permalink || '',
        media_thumbnail: mediaDetails.thumbnail_url || '',
        media_caption: mediaDetails.caption || '',
      })
      .select()
      .single();

    if (error) throw error;

    logger.info('Media mapping created', { mappingId: data.id });
    res.status(201).json({ mapping: data });
  } catch (err) {
    logger.error('Create mapping error', { error: err.message });
    res.status(500).json({ error: 'Failed to create mapping' });
  }
});

/**
 * PATCH /api/media/mappings/:id/toggle — Toggle mapping active state
 */
router.patch('/mappings/:id/toggle', authGuard, async (req, res) => {
  try {
    const { data: current } = await supabase
      .from('media_mappings')
      .select('is_active')
      .eq('id', req.params.id)
      .single();

    if (!current) return res.status(404).json({ error: 'Mapping not found' });

    const { data, error } = await supabase
      .from('media_mappings')
      .update({ is_active: !current.is_active })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ mapping: data });
  } catch (err) {
    logger.error('Toggle mapping error', { error: err.message });
    res.status(500).json({ error: 'Failed to toggle mapping' });
  }
});

/**
 * DELETE /api/media/mappings/:id — Delete a mapping
 */
router.delete('/mappings/:id', authGuard, async (req, res) => {
  try {
    const { error } = await supabase
      .from('media_mappings')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Mapping deleted' });
  } catch (err) {
    logger.error('Delete mapping error', { error: err.message });
    res.status(500).json({ error: 'Failed to delete mapping' });
  }
});

module.exports = router;
