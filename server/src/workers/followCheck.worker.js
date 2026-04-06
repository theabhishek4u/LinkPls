const { Worker } = require('bullmq');
const { redisConnection } = require('../config/redis');
const { followGateService } = require('../services/followGate.service');
const { antiSpamService } = require('../services/antiSpam.service');
const { logger } = require('../utils/logger');

const followCheckWorker = new Worker(
  'follow-check',
  async (job) => {
    const { igUserId, campaign, interactionId, accountId } = job.data;

    // Rate limit check
    if (await antiSpamService.isRateLimited(accountId)) {
      logger.warn('Rate limited, retrying later', { igUserId });
      throw new Error('RATE_LIMITED');
    }

    // Run the follow gate verification
    const result = await followGateService.verifyAndRespond(interactionId, igUserId, campaign);

    logger.info('✅ Follow check completed', {
      igUserId,
      isFollowing: result.isFollowing,
      interactionId,
    });

    return result;
  },
  {
    connection: redisConnection,
    concurrency: 3,
    limiter: { max: 10, duration: 60000 },
  }
);

followCheckWorker.on('failed', (job, err) => {
  logger.error('Follow check job failed', {
    jobId: job?.id,
    error: err.message,
    attempt: job?.attemptsMade,
  });
});

module.exports = { followCheckWorker };
