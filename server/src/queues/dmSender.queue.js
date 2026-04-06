const { Queue } = require('bullmq');
const { redisConnection } = require('../config/redis');

const dmSenderQueue = new Queue('dm-sender', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 200 },
  },
});

module.exports = { dmSenderQueue };
