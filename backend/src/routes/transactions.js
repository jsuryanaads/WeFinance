const express = require('express');
const pool = require('../db');

const router = express.Router();

function normalizeTransaction(row) {
  return {
    id: row.id,
    userId: row.user_id,
    walletId: row.wallet_id,
    categoryId: row.category_id,
    type: row.type,
    amount: Number(row.amount),
    date: row.transaction_date,
    description: row.description,
    note: row.note,
    debtId: row.debt_id,
    billId: row.bill_id,
    goalId: row.goal_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const result = await pool.query(
      `SELECT id, user_id, wallet_id, category_id, type, amount, transaction_date,
              description, note, debt_id, bill_id, goal_id, created_at, updated_at
       FROM transactions
       WHERE deleted_at IS NULL
       ORDER BY transaction_date DESC, created_at DESC
       LIMIT $1`,
      [limit]
    );
    res.json({ data: result.rows.map(normalizeTransaction) });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, user_id, wallet_id, category_id, type, amount, transaction_date,
              description, note, debt_id, bill_id, goal_id, created_at, updated_at
       FROM transactions WHERE id = $1 AND deleted_at IS NULL`,
      [req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Transaction not found' });
    res.json({ data: normalizeTransaction(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  const { userId, walletId, categoryId, type, amount, date, description, note, debtId, billId, goalId } = req.body || {};
  if (!userId || !walletId || !type || !amount || !date || !description) {
    return res.status(400).json({ error: 'userId, walletId, type, amount, date, and description are required' });
  }
  if (!['income', 'expense', 'transfer'].includes(type) || Number(amount) <= 0) {
    return res.status(400).json({ error: 'Invalid transaction type or amount' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO transactions
       (user_id, wallet_id, category_id, type, amount, transaction_date, description, note, debt_id, bill_id, goal_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING id, user_id, wallet_id, category_id, type, amount, transaction_date,
                 description, note, debt_id, bill_id, goal_id, created_at, updated_at`,
      [userId, walletId, categoryId || null, type, amount, date, description, note || null, debtId || null, billId || null, goalId || null]
    );
    res.status(201).json({ data: normalizeTransaction(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
