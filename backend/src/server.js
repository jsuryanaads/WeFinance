require('dotenv').config();

const express = require('express');
const cors = require('cors');
const pool = require('./db');
const transactionRoutes = require('./routes/transactions');
const walletRoutes = require('./routes/wallets');
const categoryRoutes = require('./routes/categories');

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(v => v.trim()) : true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (_req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS server_time');
    res.json({ ok: true, service: 'wefinance-api', database: 'postgresql', serverTime: result.rows[0].server_time });
  } catch (error) {
    console.error(error);
    res.status(503).json({ ok: false, service: 'wefinance-api', database: 'unavailable' });
  }
});

app.get('/api', (_req, res) => {
  res.json({ name: 'WeFinance API', version: '1.3.0', status: 'ready', modules: ['transactions', 'wallets', 'categories'] });
});

app.use('/api/transactions', transactionRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api/categories', categoryRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`WeFinance API running on http://localhost:${port}`);
});
