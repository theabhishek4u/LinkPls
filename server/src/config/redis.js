const Redis = require('ioredis');
const { env } = require('./env');

const redisConnection = {
  host: env.REDIS_HOST,
  port: parseInt(env.REDIS_PORT, 10),
  maxRetriesPerRequest: null, // Required by BullMQ
  retryStrategy: (times) => Math.min(times * 200, 5000),
};

const redis = new Redis(redisConnection);

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err.message);
});

redis.on('connect', () => {
  console.log('✅ Redis connected');
});

module.exports = { redis, redisConnection };
