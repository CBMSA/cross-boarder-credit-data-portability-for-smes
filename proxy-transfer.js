
// Load environment variables
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const sql = require('mssql');
const axios = require('axios');
const WebSocket = require('ws');

const app = express();
app.use(bodyParser.json());

// Get environment variables
const {
  DB_USER,
  DB_PASSWORD,
  DB_SERVER,
  DB_NAME,
  JWT_SECRET
} = process.env;

// Warn for missing values instead of exiting
let missingVars = [];
if (!DB_USER) missingVars.push('DB_USER');
if (!DB_PASSWORD) missingVars.push('DB_PASSWORD');
if (!DB_SERVER) missingVars.push('DB_SERVER');
if (!DB_NAME) missingVars.push('DB_NAME');
if (!JWT_SECRET) missingVars.push('JWT_SECRET');

if (missingVars.length > 0) {
  console.warn(`⚠️ Warning: Missing environment variables: ${missingVars.join(', ')}`);
  console.warn('Your app may not work properly until you set these in your .env file or hosting environment.');
}

// Database config
const dbConfig = {
  user: DB_USER || 'placeholder_user',
  password: DB_PASSWORD || 'placeholder_password',
  server: DB_SERVER || 'localhost',
  database: DB_NAME || 'placeholder_db',
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};

// Example connection test
(async () => {
  try {
    if (DB_USER && DB_PASSWORD && DB_SERVER && DB_NAME) {
      await sql.connect(dbConfig);
      console.log('✅ Database connected');
    } else {
      console.log('⏭️ Skipping DB connection (missing credentials)');
    }
  } catch (err) {
    console.error('❌ Database connection error:', err.message);
  }
})();

app.get('/', (req, res) => {
  res.send('Proxy Transfer Service is running');
});

app.listen(3000, () => {
  console.log('🚀 Server listening on port 3000');
});




// server.js  — SADC CBDC Backend (Production-Ready)
// Node >= 18 (fetch available); if Node 16, install `node-fetch` and swap to axios where needed.

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sql = require('mssql');
const http = require('http');
const { Server: SocketIOServer } = require('socket.io');

// ---------- Config & Constants ----------
const {
  PORT = 3000,
  NODE_ENV = 'production',
  DB_USER,
  DB_PASSWORD,
  DB_SERVER,
  DB_NAME,
  MOVE_VM_ADDRESS,               // e.g. 4.222.217.84:8080
  APIX_TOKEN,                    // Bearer <token string> (just the token, NOT prefixed with "Bearer ")
  JWT_SECRET,                    // set strong secret
  BACKEND,                       // public URL of this server (optional)
  KORA_API_BASE = 'https://api.korapay.com',
  KORA_SECRET_KEY,               // secret key from Kora
} = process.env;

if (!DB_USER || !DB_PASSWORD || !DB_SERVER || !DB_NAME) {
  console.error('❌ Missing DB_* env vars');
  process.exit(1);
}
if (!JWT_SECRET) {
  console.error('❌ Missing JWT_SECRET env var');
  process.exit(1);
}

// Azure SQL config
const dbConfig = {
  user: DB_USER,
  password: DB_PASSWORD,
  server: DB_SERVER,
  database: DB_NAME,
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  options: { encrypt: true, trustServerCertificate: false },
};

// Use one shared pool
let sqlPool;
async function ensurePool() {
  if (sqlPool && sqlPool.connected) return sqlPool;
  sqlPool = await sql.connect(dbConfig);
  return sqlPool;
}

// ---------- App & Server ----------
const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// ---------- Middleware ----------
app.use(helmet());
app.use(cors({ origin: '*', credentials: false }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('combined'));

// Basic rate limit for public endpoints
const publicLimiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(publicLimiter);

// ---------- Helpers ----------
function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

async function writeAudit(eventType, payload) {
  try {
    const pool = await ensurePool();
    await pool
      .request()
      .input('EventType', sql.NVarChar(100), eventType)
      .input('Payload', sql.NVarChar(sql.MAX), JSON.stringify(payload))
      .input('CreatedAt', sql.DateTimeOffset, new Date())
      .query(
        `IF NOT EXISTS (SELECT * FROM sys.objects WHERE name='AuditLogs' AND type='U')
           CREATE TABLE AuditLogs (
             Id INT IDENTITY PRIMARY KEY,
             EventType NVARCHAR(100),
             Payload NVARCHAR(MAX),
             CreatedAt DATETIMEOFFSET
           );
         INSERT INTO AuditLogs (EventType, Payload, CreatedAt) VALUES (@EventType, @Payload, @CreatedAt);`
      );
  } catch (e) {
    console.error('Audit write failed:', e.message);
  }
}

// Initialize necessary tables
async function migrate() {
  const pool = await ensurePool();
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.objects WHERE name='Users' AND type='U')
    CREATE TABLE Users (
      Id INT IDENTITY PRIMARY KEY,
      FullName NVARCHAR(255),
      Email NVARCHAR(255) UNIQUE,
      Phone NVARCHAR(50),
      PasswordHash NVARCHAR(255),
      BalanceSadi DECIMAL(38,18) DEFAULT(0),
      CreatedAt DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
    );

    IF NOT EXISTS (SELECT * FROM sys.objects WHERE name='Transfers' AND type='U')
    CREATE TABLE Transfers (
      Id INT IDENTITY PRIMARY KEY,
      WalletAddress NVARCHAR(200),
      Amount DECIMAL(38,18),
      BankCode NVARCHAR(50),
      AccountNumber NVARCHAR(100),
      Status NVARCHAR(50),
      Timestamp DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
    );

    IF NOT EXISTS (SELECT * FROM sys.objects WHERE name='P2PTransactions' AND type='U')
    CREATE TABLE P2PTransactions (
      Id INT IDENTITY PRIMARY KEY,
      FromWallet NVARCHAR(200),
      ToWallet NVARCHAR(200),
      Amount DECIMAL(38,18),
      Timestamp DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
    );

    IF NOT EXISTS (SELECT * FROM sys.objects WHERE name='InterbankSettlements' AND type='U')
    CREATE TABLE InterbankSettlements (
      Id INT IDENTITY PRIMARY KEY,
      FromAccount NVARCHAR(200),
      ToAccount NVARCHAR(200),
      Amount DECIMAL(38,18),
      BankCode NVARCHAR(50),
      Status NVARCHAR(50),
      Timestamp DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
    );
  `);
}

// ---------- Health ----------
app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'SADC CBDC Node Backend', env: NODE_ENV, time: new Date() });
});

app.get('/health', (_req, res) => res.json({ status: 'ok', now: new Date() }));

app.get('/api/config', (_req, res) => {
  res.json({
    backend: BACKEND || null,
    moveVm: MOVE_VM_ADDRESS || null,
    region: 'SADC',
  });
});

// ---------- Auth ----------
app.post('/api/auth/register', async (req, res) => {
  const { fullName, email, phone, password } = req.body || {};
  if (!fullName || !email || !password) return res.status(400).json({ error: 'Missing fields' });

  try {
    const pool = await ensurePool();
    const hash = await bcrypt.hash(password, 12);

    // airdrop 100 SADI on signup
    await pool
      .request()
      .input('FullName', sql.NVarChar(255), fullName)
      .input('Email', sql.NVarChar(255), email.toLowerCase())
      .input('Phone', sql.NVarChar(50), phone || null)
      .input('PasswordHash', sql.NVarChar(255), hash)
      .input('BalanceSadi', sql.Decimal(38, 18), '100')
      .query(
        `INSERT INTO Users (FullName, Email, Phone, PasswordHash, BalanceSadi)
         VALUES (@FullName, @Email, @Phone, @PasswordHash, @BalanceSadi)`
      );

    const userRow = await pool
      .request()
      .input('Email', sql.NVarChar(255), email.toLowerCase())
      .query(`SELECT TOP(1) Id, Email FROM Users WHERE Email=@Email`);
    const user = userRow.recordset[0];
    const token = jwt.sign({ id: user.Id, email: user.Email }, JWT_SECRET, { expiresIn: '12h' });

    await writeAudit('USER_REGISTER', { email });

    res.json({ token });
  } catch (e) {
    if (e.originalError && e.originalError.info && e.originalError.info.number === 2627) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    console.error(e);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });
  try {
    const pool = await ensurePool();
    const rs = await pool
      .request()
      .input('Email', sql.NVarChar(255), email.toLowerCase())
      .query(`SELECT TOP(1) Id, Email, PasswordHash FROM Users WHERE Email=@Email`);
    if (rs.recordset.length === 0) return res.status(401).json({ error: 'Invalid login' });

    const user = rs.recordset[0];
    const ok = await bcrypt.compare(password, user.PasswordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid login' });

    const token = jwt.sign({ id: user.Id, email: user.Email }, JWT_SECRET, { expiresIn: '12h' });
    await writeAudit('USER_LOGIN', { email });
    res.json({ token });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ---------- Wallet ----------
app.get('/api/wallet', auth, async (req, res) => {
  try {
    const pool = await ensurePool();
    const rs = await pool
      .request()
      .input('Id', sql.Int, req.user.id)
      .query(`SELECT TOP(1) Email, BalanceSadi FROM Users WHERE Id=@Id`);
    if (!rs.recordset.length) return res.status(404).json({ error: 'User not found' });

    // In this simple design, wallet "address" is the email (replace with EVM address if needed)
    res.json({
      address: rs.recordset[0].Email,
      balance: rs.recordset[0].BalanceSadi?.toString(),
      decimals: 18,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Wallet fetch failed' });
  }
});

app.post('/api/wallet/transfer', auth, async (req, res) => {
  // Internal wallet-to-wallet transfer (off-chain ledger)
  const { to, amount } = req.body || {};
  if (!to || !amount || Number(amount) <= 0) return res.status(400).json({ error: 'Invalid input' });

  const amt = Number(amount);
  try {
    const pool = await ensurePool();
    const tx = new sql.Transaction(pool);
    await tx.begin();
    const r1 = new sql.Request(tx);
    r1.input('FromId', sql.Int, req.user.id);
    const me = await r1.query(`SELECT BalanceSadi, Email FROM Users WHERE Id=@FromId`);
    if (!me.recordset.length) {
      await tx.rollback();
      return res.status(404).json({ error: 'Sender not found' });
    }
    if (Number(me.recordset[0].BalanceSadi) < amt) {
      await tx.rollback();
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const r2 = new sql.Request(tx);
    r2.input('ToEmail', sql.NVarChar(255), to.toLowerCase());
    const target = await r2.query(`SELECT Id FROM Users WHERE Email=@ToEmail`);
    if (!target.recordset.length) {
      await tx.rollback();
      return res.status(404).json({ error: 'Recipient not found' });
    }

    const r3 = new sql.Request(tx);
    r3
      .input('FromId', sql.Int, req.user.id)
      .input('Amt', sql.Decimal(38, 18), amt.toString());
    await r3.query(`UPDATE Users SET BalanceSadi = BalanceSadi - @Amt WHERE Id=@FromId`);

    const r4 = new sql.Request(tx);
    r4
      .input('ToId', sql.Int, target.recordset[0].Id)
      .input('Amt', sql.Decimal(38, 18), amt.toString());
    await r4.query(`UPDATE Users SET BalanceSadi = BalanceSadi + @Amt WHERE Id=@ToId`);

    const r5 = new sql.Request(tx);
    r5
      .input('FromWallet', sql.NVarChar(200), me.recordset[0].Email)
      .input('ToWallet', sql.NVarChar(200), to.toLowerCase())
      .input('Amount', sql.Decimal(38, 18), amt.toString());
    await r5.query(
      `INSERT INTO P2PTransactions (FromWallet, ToWallet, Amount) VALUES (@FromWallet, @ToWallet, @Amount)`
    );

    await tx.commit();
    await writeAudit('WALLET_TRANSFER', { from: me.recordset[0].Email, to, amount: amt });

    // notify via websocket
    io.emit('wallet:transfer', { from: me.recordset[0].Email, to, amount: amt });

    res.json({ status: 'ok' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Transfer failed' });
  }
});

// ---------- Conversion (SADI -> USD/ZAR via simple oracle placeholder) ----------
app.post('/api/convert', auth, async (req, res) => {
  const { amountSadi, target } = {
    amountSadi: req.body?.amountSadi ?? req.body?.amount_sadi,
    target: (req.body?.target ?? req.body?.target_currency ?? '').toUpperCase(),
  };
  if (!amountSadi || Number(amountSadi) <= 0) return res.status(400).json({ error: 'Invalid amount' });
  if (!['USD', 'ZAR'].includes(target)) return res.status(400).json({ error: 'Target must be USD or ZAR' });

  // In production, call your rate oracle. For now, sample: 1 SADI = 0.07 USD; 1 USD = 14 ZAR (example)
  const SADI_USD = 0.07;
  const USD_ZAR = 14;

  try {
    const pool = await ensurePool();
    // deduct SADI
    await pool
      .request()
      .input('Id', sql.Int, req.user.id)
      .input('Amt', sql.Decimal(38, 18), amountSadi.toString())
      .query(`UPDATE Users SET BalanceSadi = BalanceSadi - @Amt WHERE Id=@Id`);

    let converted;
    if (target === 'USD') converted = Number(amountSadi) * SADI_USD;
    else converted = Number(amountSadi) * SADI_USD * USD_ZAR;

    await writeAudit('CONVERT', { userId: req.user.id, amountSadi, target, converted });

    res.json({ convertedAmount: converted, target });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Conversion failed' });
  }
});

// ---------- Disburse to bank (Korapay) ----------
app.post('/api/payouts/disburse', auth, async (req, res) => {
  const { accountNo, bankCode, amount, currency = 'ZAR', provider = 'korapay' } = req.body || {};
  if (!accountNo || !bankCode || !amount || Number(amount) <= 0)
    return res.status(400).json({ error: 'Missing fields' });
  if (provider.toLowerCase() !== 'korapay') return res.status(400).json({ error: 'Only Korapay wired' });
  if (!KORA_SECRET_KEY) return res.status(500).json({ error: 'Kora secret not configured' });

  try {
    const reference = `CBDC-PAYOUT-${req.user.id}-${Date.now()}`;
    const payload = {
      reference,
      destination: {
        type: 'bank_account',
        amount: Number(amount),
        currency: currency.toUpperCase(),
        narration: 'CBDC Withdrawal',
        bank_account: { bank: bankCode, account: accountNo },
      },
    };

    const resp = await axios.post(`${KORA_API_BASE}/merchant/disburse`, payload, {
      headers: {
        Authorization: `Bearer ${KORA_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 15_000,
    });

    await writeAudit('KORA_PAYOUT_CREATE', { userId: req.user.id, payload, response: resp.data });
    io.emit('payout:created', { userId: req.user.id, reference, status: resp.data?.status || 'submitted' });

    res.json({ ref: reference, status: resp.data?.status || 'submitted', provider: 'korapay', raw: resp.data });
  } catch (e) {
    console.error('Korapay error:', e.response?.data || e.message);
    await writeAudit('KORA_PAYOUT_ERROR', { userId: req.user.id, error: e.response?.data || e.message });
    res.status(502).json({ error: 'Korapay disburse failed', details: e.response?.data || e.message });
  }
});

// Korapay webhook (configure in Kora dashboard)
app.post('/webhook/kora', express.json(), async (req, res) => {
  // TODO: validate HMAC signature per Kora docs (header + shared secret)
  await writeAudit('KORA_WEBHOOK', req.body);
  io.emit('payout:update', req.body);
  res.json({ received: true });
});

// ---------- Move VM proxied actions ----------
app.post('/move/transfer', async (req, res) => {
  const { from, to, amount } = req.body || {};
  if (!from || !to || !amount) return res.status(400).json({ error: 'Missing fields' });
  if (!MOVE_VM_ADDRESS) return res.status(500).json({ error: 'MOVE_VM_ADDRESS not set' });
  try {
    const resp = await axios.post(`http://${MOVE_VM_ADDRESS}/submit_transaction`, { from, to, amount }, { timeout: 10_000 });
    await writeAudit('MOVE_TRANSFER', { from, to, amount, response: resp.data });
    io.emit('move:tx', { from, to, amount, tx: resp.data });
    res.json(resp.data);
  } catch (e) {
    console.error('Move VM tx error:', e.message);
    res.status(502).json({ error: 'Move transaction failed', details: e.message });
  }
});

// Move VM events -> feed
app.get('/blockchain-feed', async (_req, res) => {
  if (!MOVE_VM_ADDRESS) return res.status(500).json({ error: 'MOVE_VM_ADDRESS not set' });
  try {
    const { data } = await axios.get(`http://${MOVE_VM_ADDRESS}/events`, { timeout: 10_000 });
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: 'Unable to fetch blockchain feed' });
  }
});

// Poll Move VM events and broadcast (every 5s)
setInterval(async () => {
  try {
    if (!MOVE_VM_ADDRESS) return;
    const { data } = await axios.get(`http://${MOVE_VM_ADDRESS}/events`, { timeout: 8000 });
    io.emit('move:events', data);
  } catch (e) {
    // silent poll error
  }
}, 5000);

// ---------- APIX: Live Transfer ----------
app.post('/api/live-transfer', async (req, res) => {
  const { account_id, destination_account_id, amount, narration } = req.body || {};
  if (!account_id || !destination_account_id || !amount)
    return res.status(400).json({ error: 'Missing required fields' });
  if (!APIX_TOKEN) return res.status(500).json({ error: 'APIX_TOKEN not set' });

  try {
    const apiUrl = `https://api.apixplatform.com/opencore-transactions/v1/deposits/${encodeURIComponent(
      account_id
    )}/transfer`;
    const response = await axios.post(
      apiUrl,
      { destination_account_id, amount, narration },
      {
        headers: {
          'X-Authorization': `Bearer ${APIX_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 20_000,
      }
    );

    const pool = await ensurePool();
    await pool
      .request()
      .input('WalletAddress', sql.NVarChar(200), String(account_id))
      .input('Amount', sql.Decimal(38, 18), String(amount))
      .input('BankCode', sql.NVarChar(50), String(destination_account_id))
      .input('AccountNumber', sql.NVarChar(100), String(destination_account_id))
      .input('Status', sql.NVarChar(50), 'LIVE_SENT')
      .query(
        `INSERT INTO Transfers (WalletAddress, Amount, BankCode, AccountNumber, Status)
         VALUES (@WalletAddress, @Amount, @BankCode, @AccountNumber, @Status)`
      );

    await writeAudit('APIX_LIVE_TRANSFER', { req: { account_id, destination_account_id, amount }, resp: response.data });
    io.emit('apix:transfer', { account_id, destination_account_id, amount });

    res.json({ message: 'Live transfer completed', data: response.data });
  } catch (e) {
    console.error('APIX transfer failed:', e.response?.data || e.message);
    await writeAudit('APIX_LIVE_TRANSFER_ERROR', { error: e.response?.data || e.message });
    res.status(502).json({ error: 'Live transfer failed', details: e.response?.data || e.message });
  }
});

// ---------- Interbank settlement (record) ----------
app.post('/interbank/settlement', async (req, res) => {
  const { centralBankAccount, commercialBankAccount, amount, bankCode } = req.body || {};
  if (!centralBankAccount || !commercialBankAccount || !amount || !bankCode)
    return res.status(400).json({ error: 'Missing fields' });

  try {
    const pool = await ensurePool();
    await pool
      .request()
      .input('FromAccount', sql.NVarChar(200), centralBankAccount)
      .input('ToAccount', sql.NVarChar(200), commercialBankAccount)
      .input('Amount', sql.Decimal(38, 18), String(amount))
      .input('BankCode', sql.NVarChar(50), bankCode)
      .input('Status', sql.NVarChar(50), 'SETTLED')
      .query(
        `INSERT INTO InterbankSettlements (FromAccount, ToAccount, Amount, BankCode, Status)
         VALUES (@FromAccount, @ToAccount, @Amount, @BankCode, @Status)`
      );

    await writeAudit('INTERBANK_SETTLEMENT', { centralBankAccount, commercialBankAccount, amount, bankCode });
    io.emit('interbank:settlement', { centralBankAccount, commercialBankAccount, amount });
    res.json({ message: 'Interbank settlement recorded' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Interbank settlement failed' });
  }
});

// ---------- Admin (restrict behind auth in real prod) ----------
app.get('/admin/audit', async (_req, res) => {
  try {
    const pool = await ensurePool();
    const r = await pool.request().query(
      `SELECT TOP (100) EventType, Payload, CreatedAt
       FROM AuditLogs ORDER BY CreatedAt DESC`
    );
    res.json({ rows: r.recordset });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------- WebSockets ----------
io.on('connection', (socket) => {
  console.log('📡 WebSocket client connected:', socket.id);
  socket.emit('connected', { ok: true });
  socket.on('disconnect', () => {
    // noop
  });
});

// ---------- Start ----------
(async () => {
  try {
    await ensurePool();
    await migrate();
    server.listen(PORT, () => console.log(`🚀 CBDC backend running on :${PORT}`));
  } catch (e) {
    console.error('Startup error:', e);
    process.exit(1);
  }
})();
