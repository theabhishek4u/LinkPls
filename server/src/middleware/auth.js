const { supabaseAnon } = require('../config/supabase');
const { logger } = require('../utils/logger');

/**
 * Middleware: Verify Supabase JWT from Authorization header
 */
async function authGuard(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabaseAnon.auth.getUser(token);

    if (error || !user) {
      logger.warn('Auth failed', { error: error?.message });
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = user;
    next();
  } catch (err) {
    logger.error('Auth middleware error', { error: err.message });
    return res.status(500).json({ error: 'Authentication service error' });
  }
}

module.exports = { authGuard };
