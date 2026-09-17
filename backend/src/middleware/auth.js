const { createUserClient } = require('../supabase');

async function requireAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = match[1].trim();
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    const supabase = createUserClient(token);
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({ error: 'Invalid or expired authentication token' });
    }

    req.user = data.user;
    req.supabase = supabase;
    next();
  } catch (error) {
    if (error.code === 'SUPABASE_NOT_CONFIGURED') {
      return res.status(503).json({ error: 'Supabase auth is not configured on the server' });
    }
    next(error);
  }
}

module.exports = { requireAuth };
