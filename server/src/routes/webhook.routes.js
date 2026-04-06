const { Router } = require('express');
const { supabase } = require('../config/supabase');
const { commentReplyQueue } = require('../queues/commentReply.queue');
const { dmSenderQueue } = require('../queues/dmSender.queue');
const { followCheckQueue } = require('../queues/followCheck.queue');
const { antiSpamService } = require('../services/antiSpam.service');
const { humanDelay } = require('../utils/humanize');
const { logger } = require('../utils/logger');
const { env } = require('../config/env');

const router = Router();

/**
 * POST /webhook — Instagram Webhook endpoint
 * Handles: comments, messaging (quick replies)
 */
router.post('/', async (req, res) => {
  // Always respond 200 immediately (Meta requires <20s response)
  res.status(200).send('EVENT_RECEIVED');

  const body = req.body;

  try {
    if (body.object !== 'instagram') return;

    for (const entry of body.entry || []) {
      // ─── Handle Comments ───
      if (entry.changes) {
        for (const change of entry.changes) {
          if (change.field === 'comments') {
            await handleComment(change.value);
          }
        }
      }

      // ─── Handle Messaging (quick reply taps) ───
      if (entry.messaging) {
        for (const event of entry.messaging) {
          if (event.message?.quick_reply) {
            await handleQuickReply(event);
          }
        }
      }
    }
  } catch (err) {
    logger.error('Webhook processing error', { error: err.message, body: JSON.stringify(body) });
  }
});

/**
 * Handle incoming comment events
 */
async function handleComment(commentData) {
  const { id: commentId, text: commentText, from, media } = commentData;
  const igUserId = from?.id;
  const igUsername = from?.username;
  const igMediaId = media?.id;

  if (!igUserId || !commentText || !igMediaId) {
    logger.debug('Incomplete comment data, skipping');
    return;
  }

  logger.info('📩 Comment received', { commentId, igUsername, commentText, igMediaId });

  // Check for duplicate (anti-spam)
  if (await antiSpamService.isDuplicate(igUserId, igMediaId)) {
    logger.info('Duplicate comment, skipping', { igUserId, igMediaId });
    return;
  }

  // Find matching campaign + media mapping
  const { data: mappings } = await supabase
    .from('media_mappings')
    .select(`
      *,
      campaigns!inner(*)
    `)
    .eq('ig_media_id', igMediaId)
    .eq('is_active', true)
    .eq('campaigns.is_active', true);

  if (!mappings || mappings.length === 0) {
    logger.debug('No active mapping for this media', { igMediaId });
    return;
  }

  // Check keyword match
  const upperComment = commentText.toUpperCase().trim();

  for (const mapping of mappings) {
    const campaign = mapping.campaigns;
    const keyword = campaign.trigger_keyword.toUpperCase();

    if (!upperComment.includes(keyword)) continue;

    logger.info('🎯 Keyword matched!', { keyword, igUsername, campaignId: campaign.id });

    // Mark as processed (24h cooldown)
    await antiSpamService.markProcessed(igUserId, igMediaId);

    // Create interaction record
    const { data: interaction, error } = await supabase
      .from('interactions')
      .insert({
        campaign_id: campaign.id,
        media_mapping_id: mapping.id,
        ig_user_id: igUserId,
        ig_username: igUsername,
        comment_id: commentId,
        comment_text: commentText,
        status: 'triggered',
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create interaction', { error: error.message });
      continue;
    }

    // Enqueue comment reply (with small random delay)
    await commentReplyQueue.add(
      'reply',
      {
        commentId,
        campaign,
        interactionId: interaction.id,
        accountId: env.IG_BUSINESS_ACCOUNT_ID,
      },
      { delay: humanDelay(1000, 4000) }
    );

    // Enqueue welcome DM (with longer delay to feel natural)
    await dmSenderQueue.add(
      'welcome',
      {
        igUserId,
        campaign,
        interactionId: interaction.id,
        accountId: env.IG_BUSINESS_ACCOUNT_ID,
      },
      { delay: humanDelay(3000, 8000) }
    );

    logger.info('Jobs enqueued', { interactionId: interaction.id, campaignId: campaign.id });
    break; // Only process first matching campaign per comment
  }
}

/**
 * Handle quick reply taps (follow check buttons)
 */
async function handleQuickReply(event) {
  const igUserId = event.sender?.id;
  const payload = event.message?.quick_reply?.payload;

  if (!igUserId || payload !== 'FOLLOW_CHECK') return;

  logger.info('🔘 Quick reply tapped: FOLLOW_CHECK', { igUserId });

  // Find the most recent interaction for this user
  const { data: interaction } = await supabase
    .from('interactions')
    .select('*, campaigns(*)')
    .eq('ig_user_id', igUserId)
    .in('status', ['dm_sent', 'follow_failed'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!interaction) {
    logger.debug('No pending interaction for quick reply', { igUserId });
    return;
  }

  // Enqueue follow check
  await followCheckQueue.add(
    'verify',
    {
      igUserId,
      campaign: interaction.campaigns,
      interactionId: interaction.id,
      accountId: env.IG_BUSINESS_ACCOUNT_ID,
    },
    { delay: humanDelay(1000, 3000) }
  );

  logger.info('Follow check enqueued', { interactionId: interaction.id });
}

module.exports = router;
