const { Router } = require('express');
const { supabase, supabaseAnon } = require('../config/supabase');
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

module.exports = router;
