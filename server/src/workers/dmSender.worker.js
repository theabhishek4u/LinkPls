const { Worker } = require('bullmq');
const { redisConnection } = require('../config/redis');
const { instagramService } = require('../services/instagram.service');
const { messagingService } = require('../services/messaging.service');
const { antiSpamService } = require('../services/antiSpam.service');
const { supabase } = require('../config/supabase');
const { logger } = require('../utils/logger');
const { typingDelay } = require('../utils/humanize');

const dmSenderWorker = new Worker(
  'dm-sender',
  async (job) => {
    const { igUserId, campaign, interactionId, accountId } = job.data;

    // Rate limit check
    if (await antiSpamService.isRateLimited(accountId)) {
      logger.warn('Rate limited, retrying later', { igUserId });
      throw new Error('RATE_LIMITED');
    }

    // Build the welcome DM
    const { text, quickReplies } = messagingService.buildWelcomeDM(campaign);

    // Send typing indicator first (human-like)
    await instagramService.sendTypingOn(igUserId);
    await new Promise((r) => setTimeout(r, typingDelay(text.length)));

    // Send the DM with quick reply buttons
    await instagramService.sendDM(igUserId, text, quickReplies);

    // Track messaging window
    await antiSpamService.openMessageWindow(igUserId);

    // Update interaction
    await supabase
      .from('interactions')
      .update({ status: 'dm_sent' })
      .eq('id', interactionId);

    logger.info('✅ Welcome DM sent', { igUserId, interactionId });
    return { success: true };
  },
  {
    connection: redisConnection,
    concurrency: 3,
    limiter: { max: 10, duration: 60000 },
  }
);

dmSenderWorker.on('failed', (job, err) => {
  logger.error('DM sender job failed', {
    jobId: job?.id,
    error: err.message,
    attempt: job?.attemptsMade,
  });
});

module.exports = { dmSenderWorker };
