const { Router } = require('express');
const axios = require('axios');
const { supabase, supabaseAnon } = require('../config/supabase');
const { env } = require('../config/env');
const { logger } = require('../utils/logger');

const router = Router();

/**
 * POST /api/auth/signup
 */
router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabaseAnon.auth.signUp({ email, password });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Create profile entry
    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
      });
    }

    res.status(201).json({
      message: 'Account created. Check your email for verification.',
      user: data.user,
    });
  } catch (err) {
    logger.error('Signup error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabaseAnon.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    res.json({
      user: data.user,
      session: data.session,
    });
  } catch (err) {
    logger.error('Login error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/auth/magic-link
 */
router.post('/magic-link', async (req, res) => {
  try {
    const { email } = req.body;

    const { error } = await supabaseAnon.auth.signInWithOtp({ email });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Magic link sent to your email.' });
  } catch (err) {
    logger.error('Magic link error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabaseAnon.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    res.json({ user, profile });
  } catch (err) {
    logger.error('Get user error', { error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/auth/instagram
 * Initiates the Meta OAuth flow.
 */
router.get('/instagram', (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  const scope = [
    'instagram_basic',
    'instagram_manage_messages',
    'pages_show_list',
    'pages_manage_metadata',
    'pages_read_engagement',
    'pages_messaging'
  ].join(',');

  const redirectUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth');
  redirectUrl.searchParams.append('client_id', env.META_CLIENT_ID);
  redirectUrl.searchParams.append('redirect_uri', env.META_REDIRECT_URI);
  redirectUrl.searchParams.append('scope', scope);
  redirectUrl.searchParams.append('state', userId);

  res.redirect(redirectUrl.toString());
});

/**
 * GET /api/auth/callback
 * Handles the Meta OAuth callback.
 */
router.get('/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;

  // Frontend redirect URL
  const frontendUrl = env.CORS_ORIGIN || 'http://localhost:5173';

  if (error) {
    logger.error('Meta OAuth error', { error, error_description });
    return res.redirect(`${frontendUrl}/settings?oauth_error=true`);
  }

  if (!code || !state) {
    logger.error('Missing code or state in OAuth callback');
    return res.redirect(`${frontendUrl}/settings?oauth_error=missing_params`);
  }

  const userId = state;

  try {
    // 1. Exchange code for short-lived access token
    const tokenRes = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: {
        client_id: env.META_CLIENT_ID,
        redirect_uri: env.META_REDIRECT_URI,
        client_secret: env.META_APP_SECRET, // using APP_SECRET since it acts as our app secret here
        code,
      }
    });

    const shortLivedToken = tokenRes.data.access_token;

    // 2. Exchange for long-lived access token
    const longLivedRes = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: env.META_CLIENT_ID,
        client_secret: env.META_APP_SECRET,
        fb_exchange_token: shortLivedToken,
      }
    });

    const longLivedToken = longLivedRes.data.access_token;

    // 3. Get Facebook Pages and linked Instagram Business Account
    const pagesRes = await axios.get('https://graph.facebook.com/v19.0/me/accounts', {
      params: {
        fields: 'id,name,instagram_business_account',
        access_token: longLivedToken,
      }
    });

    const pages = pagesRes.data.data;
    const connectedPage = pages.find(p => p.instagram_business_account);

    if (!connectedPage) {
      logger.error('No Instagram Business Account found linked to Facebook pages');
      return res.redirect(`${frontendUrl}/settings?oauth_error=no_ig_business`);
    }

    const { id: pageId, instagram_business_account: { id: igBusinessId } } = connectedPage;

    // Optional: Fetch Instagram Username
    let igUsername = null;
    try {
      const igRes = await axios.get(`https://graph.facebook.com/v19.0/${igBusinessId}`, {
        params: {
          fields: 'username',
          access_token: longLivedToken,
        }
      });
      igUsername = igRes.data.username;
    } catch (e) {
      logger.warn('Failed to fetch IG username details', { err: e.message });
    }

    // 4. Update the user profile in Supabase
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        ig_business_id: igBusinessId,
        ig_access_token: longLivedToken,
        ig_page_id: pageId,
        ig_username: igUsername || null
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    // Redirect to frontend with success param
    res.redirect(`${frontendUrl}/settings?oauth_success=true`);
  } catch (err) {
    logger.error('OAuth processing error', { error: err.response?.data || err.message });
    res.redirect(`${frontendUrl}/settings?oauth_error=processing_failed`);
  }
});

module.exports = router;
