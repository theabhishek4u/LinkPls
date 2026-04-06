const { createClient } = require('@supabase/supabase-js');
const { env } = require('./env');

// Service-role client for backend operations (bypasses RLS)
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Anon client for operations that should respect RLS
const supabaseAnon = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

module.exports = { supabase, supabaseAnon };
