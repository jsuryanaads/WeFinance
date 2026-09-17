const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase auth client is not fully configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.');
}

function createUserClient(accessToken) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    const error = new Error('Supabase auth is not configured on the server');
    error.code = 'SUPABASE_NOT_CONFIGURED';
    throw error;
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });
}

module.exports = { createUserClient };
