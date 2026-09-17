const express = require('express');
const crypto = require('crypto');

const router = express.Router();
const TRANSACTION_SELECT = 'id,user_id,wallet_id,category_id,type,amount,transaction_date,description,note,debt_id,bill_id,goal_id,from_wallet_id,to_wallet_id,transfer_group_id,created_at,updated_at';

function normalizeTransaction(row) {
  return { id: row.id, userId: row.user_id, walletId: row.wallet_id, categoryId: row.category_id, type: row.type, amount: Number(row.amount), date: row.transaction_date, description: row.description, note: row.note, debtId: row.debt_id, billId: row.bill_id, goalId: row.goal_id, fromWalletId: row.from_wallet_id, toWalletId: row.to_wallet_id, transferGroupId: row.transfer_group_id, createdAt: row.created_at, updatedAt: row.updated_at };
}

router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const { data, error } = await req.supabase.from('transactions').select(TRANSACTION_SELECT).is('deleted_at', null).order('transaction_date', { ascending: false }).order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    res.json({ data: (data || []).map(normalizeTransaction) });
  } catch (error) { next(error); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await req.supabase.from('transactions').select(TRANSACTION_SELECT).eq('id', req.params.id).is('deleted_at', null).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Transaction not found' });
    res.json({ data: normalizeTransaction(data) });
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  const { walletId, categoryId, type, amount, date, description, note, debtId, billId, goalId, fromWalletId, toWalletId } = req.body || {};
  if (!type || amount === undefined || amount === null || !date || !description?.trim()) return res.status(400).json({ error: 'type, amount, date, and description are required' });
  if (!['income', 'expense', 'transfer'].includes(type) || !Number.isFinite(Number(amount)) || Number(amount) <= 0) return res.status(400).json({ error: 'Invalid transaction type or amount' });
  if (type !== 'transfer' && !walletId) return res.status(400).json({ error: 'walletId is required for income and expense' });
  if (type === 'transfer' && (!fromWalletId || !toWalletId || fromWalletId === toWalletId)) return res.status(400).json({ error: 'fromWalletId and toWalletId must be different for transfer' });

  try {
    if (type === 'transfer') {
      const transferGroupId = crypto.randomUUID();
      const { data, error } = await req.supabase.rpc('create_wallet_transfer', { p_from_wallet_id: fromWalletId, p_to_wallet_id: toWalletId, p_amount: Number(amount), p_transaction_date: date, p_description: description.trim(), p_note: note || null, p_transfer_group_id: transferGroupId });
      if (error) throw error;
      const first = Array.isArray(data) ? data[0] : data;
      return res.status(201).json({ data: normalizeTransaction(first), transferGroupId });
    }

    const { data, error } = await req.supabase.from('transactions').insert({ user_id: req.user.id, wallet_id: walletId, category_id: categoryId || null, type, amount: Number(amount), transaction_date: date, description: description.trim(), note: note || null, debt_id: debtId || null, bill_id: billId || null, goal_id: goalId || null, from_wallet_id: null, to_wallet_id: null, transfer_group_id: null }).select(TRANSACTION_SELECT).single();
    if (error) throw error;
    res.status(201).json({ data: normalizeTransaction(data) });
  } catch (error) { next(error); }
});

module.exports = router;
