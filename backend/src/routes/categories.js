const express = require('express');

const router = express.Router();

const CATEGORY_SELECT = 'id,user_id,name,type,created_at,updated_at';

function normalize(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    type: row.type,
    isSystem: row.user_id === null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await req.supabase
      .from('categories')
      .select(CATEGORY_SELECT)
      .or(`user_id.eq.${req.user.id},user_id.is.null`)
      .order('user_id', { ascending: true, nullsFirst: true })
      .order('name', { ascending: true });
    if (error) throw error;
    res.json({ data: (data || []).map(normalize) });
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  const { name, type = 'expense' } = req.body || {};
  const cleanName = String(name || '').trim();
  if (!cleanName) return res.status(400).json({ error: 'name is required' });
  if (!['income', 'expense'].includes(type)) return res.status(400).json({ error: 'type must be income or expense' });

  try {
    const { data, error } = await req.supabase
      .from('categories')
      .insert({ user_id: req.user.id, name: cleanName, type })
      .select(CATEGORY_SELECT)
      .single();
    if (error) throw error;
    res.status(201).json({ data: normalize(data) });
  } catch (error) { next(error); }
});

router.put('/:id', async (req, res, next) => {
  const { name, type } = req.body || {};
  const cleanName = String(name || '').trim();
  if (!cleanName) return res.status(400).json({ error: 'name is required' });
  if (type !== undefined && !['income', 'expense'].includes(type)) return res.status(400).json({ error: 'type must be income or expense' });

  try {
    const { data: existing, error: existingError } = await req.supabase
      .from('categories').select(CATEGORY_SELECT).eq('id', req.params.id).maybeSingle();
    if (existingError) throw existingError;
    if (!existing) return res.status(404).json({ error: 'Category not found' });
    if (existing.user_id !== req.user.id) return res.status(403).json({ error: 'System categories cannot be edited' });

    const updates = { name: cleanName };
    if (type !== undefined) updates.type = type;
    const { data, error } = await req.supabase.from('categories').update(updates).eq('id', req.params.id).eq('user_id', req.user.id).select(CATEGORY_SELECT).single();
    if (error) throw error;
    res.json({ data: normalize(data) });
  } catch (error) { next(error); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { data: existing, error: existingError } = await req.supabase
      .from('categories').select(CATEGORY_SELECT).eq('id', req.params.id).maybeSingle();
    if (existingError) throw existingError;
    if (!existing) return res.status(404).json({ error: 'Category not found' });
    if (existing.user_id !== req.user.id) return res.status(403).json({ error: 'System categories cannot be deleted' });

    const { count, error: countError } = await req.supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('category_id', req.params.id).is('deleted_at', null);
    if (countError) throw countError;
    if (count > 0) return res.status(409).json({ error: `Category is used by ${count} transaction(s)` });

    const { error } = await req.supabase.from('categories').delete().eq('id', req.params.id).eq('user_id', req.user.id);
    if (error) throw error;
    res.status(204).send();
  } catch (error) { next(error); }
});

module.exports = router;
