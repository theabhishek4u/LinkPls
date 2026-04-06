const { redis } = require('../config/redis');
const { logger } = require('../utils/logger');

/**
 * Anti-spam protection layer
 * Prevents duplicate processing and enforces rate limits
 */
class AntiSpamService {
  /**
   * Check if this user+media combo was already processed (24h cooldown)
   * Returns true if the interaction should be BLOCKED
   */
  async isDuplicate(igUserId, igMediaId) {
    const key = `cooldown:${igUserId}:${igMediaId}`;
    const exists = await redis.exists(key);
    return exists === 1;
  }

  /**
   * Mark a user+media interaction as processed (24h TTL)
   */
  async markProcessed(igUserId, igMediaId) {
    const key = `cooldown:${igUserId}:${igMediaId}`;
    await redis.setex(key, 86400, '1'); // 24 hours
  }

  /**
   * Track the 24-hour messaging window for a user
   */
  async openMessageWindow(igUserId) {
    const key = `msgwindow:${igUserId}`;
    await redis.setex(key, 86400, Date.now().toString());
  }

  /**
   * Check if we're within the 24-hour messaging window
   */
  async isMessageWindowOpen(igUserId) {
    const key = `msgwindow:${igUserId}`;
    return (await redis.exists(key)) === 1;
  }

  /**
   * Sliding window rate limiter for API calls per account
   * Returns true if the request should be BLOCKED
   */
  async isRateLimited(accountId, maxPerMinute = 30) {
    const key = `ratelimit:${accountId}`;
    const now = Date.now();
    const windowMs = 60000;

    // Remove entries outside the window
    await redis.zremrangebyscore(key, 0, now - windowMs);

    // Count current entries
    const count = await redis.zcard(key);

    if (count >= maxPerMinute) {
      logger.warn('Rate limit hit', { accountId, count, max: maxPerMinute });
      return true;
    }

    // Add current request
    await redis.zadd(key, now, `${now}:${Math.random()}`);
    await redis.expire(key, 120); // cleanup after 2 minutes

    return false;
  }
}

module.exports = { antiSpamService: new AntiSpamService() };
