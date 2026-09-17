const pool = require('../db');

const tools = [
  {
    type: 'function',
    function: {
      name: 'get_financial_summary',
      description: 'Read a compact financial summary for one WeFinance user. Use this before answering questions about current balance, income, expenses, wallets, or recent spending.',
      parameters: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: 'WeFinance user ID' }
        },
        required: ['userId'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_recent_transactions',
      description: 'Read recent transactions for one WeFinance user. Never invent transaction data.',
      parameters: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: 'WeFinance user ID' },
          limit: { type: 'integer', minimum: 1, maximum: 20, description: 'Number of recent transactions' }
        },
        required: ['userId'],
        additionalProperties: false
      }
    }
  }
];

async function getFinancialSummary(userId) {
  const [movement, wallets] = await Promise.all([
    pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) AS income,
        COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) AS expense,
        COUNT(*) AS transaction_count
      FROM transactions
      WHERE user_id=$1 AND deleted_at IS NULL`, [userId]),
    pool.query(`
      SELECT w.id, w.name, w.wallet_type, w.opening_balance,
        COALESCE(SUM(CASE WHEN t.type='income' THEN t.amount WHEN t.type='expense' THEN -t.amount ELSE 0 END),0) AS movement
      FROM wallets w
      LEFT JOIN transactions t ON t.wallet_id=w.id AND t.deleted_at IS NULL
      WHERE w.user_id=$1
      GROUP BY w.id
      ORDER BY w.created_at ASC`, [userId])
  ]);

  const row = movement.rows[0];
  const income = Number(row.income);
  const expense = Number(row.expense);
  return {
    income,
    expense,
    net: income - expense,
    transactionCount: Number(row.transaction_count),
    wallets: wallets.rows.map(w => ({
      id: w.id,
      name: w.name,
      walletType: w.wallet_type,
      balance: Number(w.opening_balance) + Number(w.movement)
    }))
  };
}

async function getRecentTransactions(userId, limit = 10) {
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 20);
  const result = await pool.query(`
    SELECT id, type, amount, transaction_date, description, note
    FROM transactions
    WHERE user_id=$1 AND deleted_at IS NULL
    ORDER BY transaction_date DESC, created_at DESC
    LIMIT $2`, [userId, safeLimit]);
  return result.rows.map(row => ({
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    date: row.transaction_date,
    description: row.description,
    note: row.note
  }));
}

async function executeTool(name, args, requestedUserId) {
  if (args?.userId !== requestedUserId) throw new Error('AI tool userId mismatch');
  if (name === 'get_financial_summary') return getFinancialSummary(requestedUserId);
  if (name === 'get_recent_transactions') return getRecentTransactions(requestedUserId, args.limit);
  throw new Error(`Unknown AI tool: ${name}`);
}

module.exports = { tools, executeTool };
