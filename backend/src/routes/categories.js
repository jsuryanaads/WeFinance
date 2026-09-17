const express = require('express');

const router = express.Router();

function normalize(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    type: row.type,
    isSystem: row.is_system,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await req.supabase
      .from('categories')
      .select('id,user_id,name,type,is_system,created_at,updated_at')
      .or(`user_id.eq.${req.user.id},user_id.is.null`)
      .order('is_system', { ascending: false })
      .order('name', { ascending: true });

    if (error) throw error;
    res.json({ data: (data || []).map(normalize) });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  const { name, type = 'expense' } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  if (!['income', 'expense'].includes(type)) return res.status(400).json({ error: 'type must be income or expense' });

  try {
    const { data, error } = await req.supabase
      .from('categories')
      .insert({ user_id: req.user.id, name: name.trim(), type })
      .select('id,user_id,name,type,is_system,created_at,updated_at')
      .single();

    if (error) throw error;
    res.status(201).json({ data: normalize(data) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
