const { verifyMetaSignature } = require('../utils/crypto');
const { env } = require('../config/env');
const { logger } = require('../utils/logger');

/**
 * Middleware: Verify incoming Meta webhook requests
 * - GET: Verify webhook subscription (hub.challenge)
 * - POST: Verify HMAC signature on payload
 */
function webhookVerify(req, res, next) {
  // GET = subscription verification
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === env.WEBHOOK_VERIFY_TOKEN) {
      logger.info('✅ Webhook verified');
      return res.status(200).send(challenge);
    }

    logger.warn('❌ Webhook verification failed', { mode, token });
    return res.status(403).send('Forbidden');
  }

  // POST = payload delivery — verify signature
  if (req.method === 'POST') {
    const signature = req.headers['x-hub-signature-256'];
    const rawBody = req.rawBody;

    if (!rawBody) {
      logger.error('Missing raw body for webhook verification');
      return res.status(400).json({ error: 'Missing body' });
    }

    if (!verifyMetaSignature(rawBody, signature)) {
      logger.warn('❌ Invalid webhook signature');
      return res.status(403).json({ error: 'Invalid signature' });
    }

    next();
  }
}

module.exports = { webhookVerify };
