const { Worker } = require('bullmq');
const { redisConnection } = require('../config/redis');
const { instagramService } = require('../services/instagram.service');
const { messagingService } = require('../services/messaging.service');
const { antiSpamService } = require('../services/antiSpam.service');
const { supabase } = require('../config/supabase');
const { logger } = require('../utils/logger');

const commentReplyWorker = new Worker(
  'comment-reply',
  async (job) => {
    const { commentId, campaign, interactionId, accountId } = job.data;

    // Rate limit check
    if (await antiSpamService.isRateLimited(accountId)) {
      logger.warn('Rate limited, retrying later', { commentId });
      throw new Error('RATE_LIMITED');
    }

    // Pick random reply
    const replyText = messagingService.getCommentReply(campaign);

    // Send the comment reply
    await instagramService.replyToComment(commentId, replyText);

    // Update interaction
    await supabase
      .from('interactions')
      .update({ status: 'comment_replied' })
      .eq('id', interactionId);

    logger.info('✅ Comment reply processed', { commentId, replyText });
    return { success: true, replyText };
  },
  {
    connection: redisConnection,
    concurrency: 3,
    limiter: { max: 10, duration: 60000 }, // Max 10 jobs per minute
  }
);

commentReplyWorker.on('failed', (job, err) => {
  logger.error('Comment reply job failed', {
    jobId: job?.id,
    error: err.message,
    attempt: job?.attemptsMade,
  });
});

module.exports = { commentReplyWorker };
