const express = require('express');

const router = express.Router();

function normalize(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    walletType: row.wallet_type,
    openingBalance: Number(row.opening_balance),
    isActive: row.is_active,
    balance: Number(row.balance ?? row.opening_balance),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

router.get('/', async (req, res, next) => {
  try {
    const { data: wallets, error } = await req.supabase
      .from('wallets')
      .select('id,user_id,name,wallet_type,opening_balance,is_active,created_at,updated_at')
      .order('created_at', { ascending: true });

    if (error) throw error;
    const rows = wallets || [];

    if (!rows.length) return res.json({ data: [] });

    const walletIds = rows.map(wallet => wallet.id);
    const { data: transactions, error: transactionError } = await req.supabase
      .from('transactions')
      .select('wallet_id,type,amount')
      .in('wallet_id', walletIds)
      .is('deleted_at', null);

    if (transactionError) throw transactionError;

    const movement = new Map(rows.map(wallet => [wallet.id, 0]));
    for (const transaction of transactions || []) {
      const amount = Number(transaction.amount);
      if (transaction.type === 'income') movement.set(transaction.wallet_id, (movement.get(transaction.wallet_id) || 0) + amount);
      if (transaction.type === 'expense') movement.set(transaction.wallet_id, (movement.get(transaction.wallet_id) || 0) - amount);
    }

    res.json({
      data: rows.map(row => normalize({ ...row, balance: Number(row.opening_balance) + (movement.get(row.id) || 0) }))
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  const { name, walletType = 'cash', openingBalance = 0 } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  if (Number.isNaN(Number(openingBalance)) || Number(openingBalance) < 0) {
    return res.status(400).json({ error: 'openingBalance must be a non-negative number' });
  }

  try {
    const { data, error } = await req.supabase
      .from('wallets')
      .insert({
        user_id: req.user.id,
        name: name.trim(),
        wallet_type: walletType,
        opening_balance: openingBalance
      })
      .select('id,user_id,name,wallet_type,opening_balance,is_active,created_at,updated_at')
      .single();

    if (error) throw error;
    res.status(201).json({ data: normalize(data) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
