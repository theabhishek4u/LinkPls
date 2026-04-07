const Redis = require('ioredis');
const { env } = require('./env');

let redis = null;
const redisConnection = {
  host: env.REDIS_HOST,
  port: parseInt(env.REDIS_PORT, 10),
  maxRetriesPerRequest: null,
  retryStrategy: (times) => Math.min(times * 200, 5000),
};

if (env.DUMMY_MODE !== 'true') {
  redis = new Redis(redisConnection);
  redis.on('error', (err) => console.error('❌ Redis connection error:', err.message));
  redis.on('connect', () => console.log('✅ Redis connected'));
} else {
  console.log('💡 Redis client disabled (DUMMY_MODE)');
  // Partial mock for typing
  redis = { on: () => {} };
}

module.exports = { redis, redisConnection };
