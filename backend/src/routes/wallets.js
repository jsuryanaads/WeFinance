const express = require('express');
const pool = require('../db');

const router = express.Router();

function normalize(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    walletType: row.wallet_type,
    openingBalance: Number(row.opening_balance),
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT w.*, COALESCE(SUM(CASE WHEN t.type='income' THEN t.amount WHEN t.type='expense' THEN -t.amount ELSE 0 END),0) AS movement
      FROM wallets w
      LEFT JOIN transactions t ON t.wallet_id=w.id AND t.deleted_at IS NULL
      GROUP BY w.id ORDER BY w.created_at ASC`);
    res.json({ data: result.rows.map(r => ({ ...normalize(r), balance: Number(r.opening_balance) + Number(r.movement) })) });
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  const { userId, name, walletType = 'cash', openingBalance = 0 } = req.body || {};
  if (!userId || !name) return res.status(400).json({ error: 'userId and name are required' });
  if (Number(openingBalance) < 0) return res.status(400).json({ error: 'openingBalance cannot be negative' });
  try {
    const result = await pool.query(`INSERT INTO wallets (user_id,name,wallet_type,opening_balance) VALUES ($1,$2,$3,$4) RETURNING *`, [userId,name,walletType,openingBalance]);
    res.status(201).json({ data: normalize(result.rows[0]) });
  } catch (error) { next(error); }
});

module.exports = router;
