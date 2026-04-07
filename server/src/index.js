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

// ── Workers (skip in DUMMY_MODE as they require Redis) ──
if (env.DUMMY_MODE !== 'true') {
  require('./workers/commentReply.worker');
  require('./workers/dmSender.worker');
  require('./workers/followCheck.worker');
  logger.info('👷 Background workers initialized');
} else {
  logger.info('💡 Skipping background workers (DUMMY_MODE)');
}

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

// --- DUMMY MODE MIDDLEWARE ---
let dummyStateConnected = false;

app.use((req, res, next) => {
  if (env.DUMMY_MODE === 'true' && req.path.startsWith('/api/')) {
    logger.info(`[DUMMY MODE] Intercepting ${req.method} ${req.path}`);
    // Auth
    if (req.path === '/api/auth/me') {
      return res.json({ 
        user: { id: 'dummy-123', email: 'test@inautodm.com' }, 
        profile: dummyStateConnected ? { ig_business_id: 'dummy-ig-678', ig_username: 'inautodm_dev' } : {} 
      });
    }
    if (req.path === '/api/auth/instagram') {
      dummyStateConnected = true;
      return res.redirect((env.CORS_ORIGIN || 'http://localhost:5173') + '/settings?oauth_success=true');
    }
    if (req.path === '/api/auth/login' || req.path === '/api/auth/signup') {
      return res.json({ session: { access_token: 'dummy-token-xyz' }, user: { id: 'dummy-123', email: req.body?.email || 'test@inautodm.com' } });
    }
    
    // Campaigns
    if (req.path === '/api/campaigns' && req.method === 'GET') {
      return res.json({ campaigns: [
        { id: 'camp-1', name: 'Waitlist Launch', trigger_keyword: 'INAUTODM', is_active: true, created_at: new Date().toISOString(), interactions: [{count: 24}], media_mappings: [{count: 1}] },
        { id: 'camp-2', name: 'E-book Giveaway', trigger_keyword: 'BOOK', is_active: false, created_at: new Date().toISOString(), interactions: [{count: 120}], media_mappings: [{count: 2}] }
      ] });
    }
    if (req.path === '/api/campaigns' && req.method === 'POST') {
      return res.status(201).json({ campaign: { id: 'camp-' + Date.now(), ...req.body, created_at: new Date().toISOString(), is_active: true } });
    }
    if (req.path.startsWith('/api/campaigns/') && req.method === 'PATCH') {
      return res.json({ campaign: { id: req.path.split('/')[3], is_active: true, ...req.body } });
    }
    if (req.path.startsWith('/api/campaigns/') && req.method === 'DELETE') {
      return res.json({ message: 'Deleted' });
    }

    // Analytics
    if (req.path === '/api/analytics/overview' && req.method === 'GET') {
      return res.json({
        totalCampaigns: 2,
        activeCampaigns: 1,
        totalComments: 144,
        totalDms: 144,
        conversionRate: 100,
        recentInteractions: [
          { id: 'int-1', ig_username: 'user123', trigger_keyword: 'INAUTODM', status: 'delivered', created_at: new Date().toISOString() }
        ]
      });
    }

    // Media
    if (req.path === '/api/media/instagram' && req.method === 'GET') {
      return res.json({ media: [
        { id: 'ig-1', media_type: 'VIDEO', media_url: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=200', caption: 'Drop INAUTODM below!', permalink: 'https://instagram.com/' },
      ] });
    }
    if (req.path === '/api/media/mappings' && req.method === 'GET') {
      return res.json({ mappings: [
        { id: 'map-1', campaign_id: 'camp-1', ig_media_id: 'ig-1', is_active: true, created_at: new Date().toISOString() }
      ] });
    }
    if (req.path === '/api/media/mappings' && req.method === 'POST') {
      return res.status(201).json({ mapping: { id: 'map-' + Date.now(), ...req.body, is_active: true } });
    }
  }
  next();
});

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

// trigger restart
