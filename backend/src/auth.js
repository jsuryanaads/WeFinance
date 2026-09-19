const SUPABASE_URL = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || '';

function assertConfig() {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be configured');
}
async function verifySupabaseToken(token) {
  assertConfig();
  if (!token) return null;
  const response = await fetch(SUPABASE_URL + '/auth/v1/user', { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + token } });
  if (!response.ok) return null;
  const user = await response.json();
  return user?.id ? user : null;
}
async function authRequired(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  try {
    const user = await verifySupabaseToken(token);
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    req.user = { id: user.id, email: user.email || null, name: user.user_metadata?.name || null };
    next();
  } catch (error) { next(error); }
}
module.exports = { authRequired, verifySupabaseToken };