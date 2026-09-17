const express = require('express');
const pool = require('../db');

const router = express.Router();

function normalize(row) {
  return { id: row.id, userId: row.user_id, name: row.name, type: row.type, isSystem: row.is_system, createdAt: row.created_at, updatedAt: row.updated_at };
}

router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(`SELECT * FROM categories ORDER BY is_system DESC, name ASC`);
    res.json({ data: result.rows.map(normalize) });
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  const { userId, name, type = 'expense' } = req.body || {};
  if (!userId || !name) return res.status(400).json({ error: 'userId and name are required' });
  if (!['income', 'expense'].includes(type)) return res.status(400).json({ error: 'type must be income or expense' });
  try {
    const result = await pool.query(`INSERT INTO categories (user_id,name,type) VALUES ($1,$2,$3) RETURNING *`, [userId,name.trim(),type]);
    res.status(201).json({ data: normalize(result.rows[0]) });
  } catch (error) { next(error); }
});

module.exports = router;
