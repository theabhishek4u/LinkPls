const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const { env } = require('./config/env');
const { logger } = require('./utils/logger');
const { apiLimiter, authLimiter } = require('./middleware/rateLimit');
const { webhookVerify } = require('./middleware/webhookVerify');

// Import routes
const authRoutes = require('./routes/auth.routes');
const campaignRoutes = require('./routes/campaign.routes');
const mediaRoutes = require('./routes/media.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const webhookRoutes = require('./routes/webhook.routes');

// Import workers (starts them)
require('./workers/commentReply.worker');
require('./workers/dmSender.worker');
require('./workers/followCheck.worker');

const app = express();

// ── Global Middleware ──
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(morgan('combined', {
  stream: { write: (msg) => logger.info(msg.trim()) },
}));

// Raw body for webhook HMAC verification
app.use('/webhook', express.json({
  verify: (req, _res, buf) => { req.rawBody = buf.toString(); },
}));

// JSON parser for all other routes
app.use(express.json());

// ── Routes ──
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/campaigns', apiLimiter, campaignRoutes);
app.use('/api/media', apiLimiter, mediaRoutes);
app.use('/api/analytics', apiLimiter, analyticsRoutes);

// Webhook — with Meta signature verification
app.get('/webhook', webhookVerify);     // Subscription verify
app.use('/webhook', webhookVerify, webhookRoutes);  // Event handling

// ── Health check ──
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Error handler ──
app.use((err, _req, res, _next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ──
const PORT = parseInt(env.PORT, 10);
app.listen(PORT, () => {
  logger.info(`🚀 InAutoDm server running on port ${PORT}`);
  logger.info(`📡 Webhook endpoint: /webhook`);
  logger.info(`🔧 Environment: ${env.NODE_ENV}`);
});

module.exports = app;
