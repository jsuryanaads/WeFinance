require('dotenv').config();

const express = require('express');
const cors = require('cors');
const pool = require('./db');
const { authRequired } = require('./auth');
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const walletRoutes = require('./routes/wallets');
const categoryRoutes = require('./routes/categories');
const migrationRoutes = require('./routes/migration');
const syncRoutes = require('./routes/sync');

const app = express();
const port = Number(process.env.PORT || 3000);
const allowedOrigins = (process.env.CORS_ORIGIN || 'https://jsuryanaads.github.io').split(',').map(v => v.trim()).filter(Boolean);

app.disable('x-powered-by');
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed by CORS'));
  }
}));
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
app.get('/api', (_req, res) => res.json({ name:'WeFinance API', version:'1.4.0', status:'ready', modules:['auth','transactions','wallets','categories'] }));

app.use('/api/auth', authRoutes);
app.use('/api/transactions', authRequired, transactionRoutes);
app.use('/api/wallets', authRequired, walletRoutes);
app.use('/api/categories', authRequired, categoryRoutes);
app.use('/api/migration', authRequired, migrationRoutes);
app.use('/api/sync', authRequired, syncRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.message === 'Origin not allowed by CORS') return res.status(403).json({ error:'Origin not allowed' });
  res.status(500).json({ error:'Internal server error' });
});
app.listen(port, () => console.log(`WeFinance API running on port ${port}`));