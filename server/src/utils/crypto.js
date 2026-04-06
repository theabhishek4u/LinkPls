const crypto = require('crypto');
const { env } = require('../config/env');

/**
 * Verify Meta webhook signature (X-Hub-Signature-256)
 */
function verifyMetaSignature(rawBody, signature) {
  if (!signature) return false;
  const expectedSig = 'sha256=' + crypto
    .createHmac('sha256', env.META_APP_SECRET)
    .update(rawBody)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSig)
  );
}

module.exports = { verifyMetaSignature };
