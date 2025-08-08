// proxy-transfer.js

const express = require('express');
const bodyParser = require('body-parser');
const sql = require('mssql');
const axios = require('axios');
const WebSocket = require('ws');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

// Azure SQL Config
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};

// Connect to Azure SQL
sql.connect(dbConfig)
  .then(() => console.log('✅ Connected to Azure SQL'))
  .catch(console.error);

// Health Check
app.get('/', (req, res) => {
  res.send('🌍 SADC CBDC Node Backend Active');
});

// ===== MOVE VM P2P Transfer =====
app.post('/move/transfer', async (req, res) => {
  const { from, to, amount } = req.body;
  try {
    const result = await axios.post(`http://${process.env.MOVE_VM_ADDRESS}/submit_transaction`, {
      from,
      to,
      amount
    });
    res.json(result.data);
  } catch (err) {
    res.status(500).json({ error: 'Move transaction failed', details: err.message });
  }
});

// ===== LIVE Transfer (APIX Production Transfer API) =====
app.post('/api/live-transfer', async (req, res) => {
  const { account_id, destination_account_id, amount, narration } = req.body;

  if (!account_id || !destination_account_id || !amount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const apiUrl = `https://api.apixplatform.com/opencore-transactions/v1/deposits/${account_id}/transfer`;

    const response = await axios.post(apiUrl, {
      destination_account_id,
      amount,
      narration
    }, {
      headers: {
        'X-Authorization': `Bearer ${process.env.APIX_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    await sql.query`
      INSERT INTO Transfers (WalletAddress, Amount, BankCode, AccountNumber, Status, Timestamp)
      VALUES (${account_id}, ${amount}, ${destination_account_id}, ${destination_account_id}, 'LIVE_SENT', GETDATE())
    `;

    res.json({
      message: '✅ Live transfer completed',
      data: response.data
    });
  } catch (err) {
    console.error('❌ Live transfer failed:', err.response?.data || err.message);
    res.status(500).json({ error: 'Live transfer failed', details: err.message });
  }
});

// ===== P2P Transaction (Internal Wallet to Wallet) =====
app.post('/api/p2p-transfer', async (req, res) => {
  const { fromWallet, toWallet, amount } = req.body;
  if (!fromWallet || !toWallet || !amount)
    return res.status(400).json({ error: 'Missing fields' });

  try {
    await sql.query`
      INSERT INTO P2PTransactions (FromWallet, ToWallet, Amount, Timestamp)
      VALUES (${fromWallet}, ${toWallet}, ${amount}, GETDATE())
    `;
    res.json({
      status: 'success',
      message: `Transferred ZAR ${amount} from ${fromWallet} to ${toWallet}`
    });
  } catch (err) {
    res.status(500).json({ error: 'P2P transaction failed', details: err.message });
  }
});

// ===== Interbank Settlement Rails (SARB to Commercial Bank) =====
app.post('/interbank/settlement', async (req, res) => {
  const { centralBankAccount, commercialBankAccount, amount, bankCode } = req.body;
  if (!centralBankAccount || !commercialBankAccount || !amount || !bankCode)
    return res.status(400).json({ error: 'Missing interbank settlement fields' });

  try {
    await sql.query`
      INSERT INTO InterbankSettlements (FromAccount, ToAccount, Amount, BankCode, Status, Timestamp)
      VALUES (${centralBankAccount}, ${commercialBankAccount}, ${amount}, ${bankCode}, 'SETTLED', GETDATE())
    `;
    res.json({
      message: `Interbank settlement of ZAR ${amount} from ${centralBankAccount} to ${commercialBankAccount} successful.`
    });
  } catch (err) {
    res.status(500).json({ error: 'Interbank settlement failed', details: err.message });
  }
});

// ===== Blockchain Explorer Feed (from Move VM) =====
app.get('/blockchain-feed', async (req, res) => {
  try {
    const response = await axios.get(`http://${process.env.MOVE_VM_ADDRESS}/events`);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Unable to fetch blockchain feed' });
  }
});

// ===== WebSocket Listener for Real-Time Events =====
const wss = new WebSocket.Server({ port: 7070 });

wss.on('connection', ws => {
  console.log('📡 WebSocket Client Connected');
  ws.send(JSON.stringify({ status: 'connected' }));
});

// Poll blockchain events and broadcast every 5 seconds
setInterval(async () => {
  try {
    const { data } = await axios.get(`http://${process.env.MOVE_VM_ADDRESS}/events`);
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'event', data }));
      }
    });
  } catch (err) {
    console.error('🔁 Polling error:', err.message);
  }
}, 5000);

// ===== Start Server =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 CBDC Backend running on port ${PORT}`));


const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static(__dirname));

let clients = [];

io.on('connection', socket => {
  console.log('User connected:', socket.id);
  clients.push(socket);

  if (clients.length === 2) {
    clients.forEach(s => s.emit('ready'));
  }

  socket.on('offer', offer => {
    socket.broadcast.emit('offer', offer);
  });

  socket.on('answer', answer => {
    socket.broadcast.emit('answer', answer);
  });

  socket.on('candidate', candidate => {
    socket.broadcast.emit('candidate', candidate);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    clients = clients.filter(s => s !== socket);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});



// Open Banking Aggregator — CBDC‑Ready with Kora Integration (Node.js)
// Project: open-banking-aggregator
// This document is the single-file reference. Split into modules when implementing.

/*
  ADDED: KORA (Korapay) adapter for instant EFT/payments and payouts.
  FEATURES (extended):
  - Kora pay-in (Instant EFT) support for South African banks
  - Kora payout (disbursement) support for sending ZAR to bank accounts
  - Webhook handling for Kora payout callbacks
  - Audit logging for all Kora interactions

  SECURITY: use Azure Key Vault for KORA_SECRET and other secrets.
*/

// ---------------------------
// Dependencies
// ---------------------------
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const mssql = require('mssql');
require('dotenv').config();

// ---------------------------
// Environment variables (example .env)
// .env (DO NOT COMMIT)
/*
DB_USER=proxy-transfer
DB_PASSWORD=@cbdc2025
DB_SERVER=transfer-database.database.windows.net
DB_NAME=transaction-database

APIX_TOKEN=Bearer eyJ0eXAi...
MOVE_VM_ADDRESS=4.222.217.84:8080
PORT=3000
BACKEND=https://proxy-transfer-fac3dgcpf8fkehem.canadacentral-01.azurewebsites.net

ABSA_CLIENT_ID=your_absa_client_id
ABSA_CLIENT_SECRET=your_absa_client_secret
ABSA_API_BASE=https://api.absa.co.za

FNB_CLIENT_ID=your_fnb_client_id
FNB_CLIENT_SECRET=your_fnb_client_secret
FNB_API_BASE=https://api.fnb.co.za

STANDARD_CLIENT_ID=your_standard_client_id
STANDARD_CLIENT_SECRET=your_standard_client_secret
STANDARD_API_BASE=https://openapi.standardbank.co.za

# KORA (Korapay) credentials
KORA_API_BASE=https://api.korapay.com
KORA_PUBLIC_KEY=your_kora_public_key
KORA_SECRET_KEY=your_kora_secret_key
KORA_ENV=sandbox  # or production
*/

// ---------------------------
// Database helper (Azure SQL)
// ---------------------------
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: true
  }
};

async function withDb(fn) {
  const pool = await mssql.connect(dbConfig);
  try {
    return await fn(pool);
  } finally {
    await pool.close();
  }
}

async function writeAudit(eventType, payload) {
  try {
    await withDb(async (pool) => {
      const req = pool.request();
      req.input('eventType', mssql.NVarChar(100), eventType);
      req.input('payload', mssql.NVarChar(mssql.MAX), JSON.stringify(payload));
      req.input('createdAt', mssql.DateTimeOffset, new Date());
      await req.query(`INSERT INTO AuditLogs (EventType, Payload, CreatedAt) VALUES (@eventType, @payload, @createdAt)`);
    });
  } catch (e) {
    console.error('Audit write failed', e.message);
  }
}

// ---------------------------
// Bank Adapters (ABSA, FNB, Standard) — unchanged structure
// ---------------------------
// ... (Adapters code retained — see earlier version in canvas)

// For brevity in this document we assume ABSA/FNB/Standard adapters are present as before.

// ---------------------------
// Kora (Korapay) Adapter
// ---------------------------
const KoraAdapter = {
  base: process.env.KORA_API_BASE || 'https://api.korapay.com',
  publicKey: process.env.KORA_PUBLIC_KEY,
  secretKey: process.env.KORA_SECRET_KEY,

  // Helper to build auth header (Korapay uses secret key in Bearer or x-api-key depending on product)
  authHeaders() {
    // Kora docs: typically use Authorization: Bearer <secret_key> or x-api-key
    return { Authorization: `Bearer ${this.secretKey}` };
  },

  // Create a pay-in (buyer initiates instant EFT) — example
  async createPayin({ amount, currency = 'ZAR', customerName, customerEmail, callbackUrl }) {
    const url = `${this.base}/v1/payments`; // check Kora docs for exact endpoint
    const payload = {
      amount,
      currency,
      customer: { name: customerName, email: customerEmail },
      callback_url: callbackUrl
    };
    const resp = await axios.post(url, payload, { headers: this.authHeaders() });
    await writeAudit('KORA_PAYIN_CREATE', { request: payload, response: resp.data });
    return resp.data;
  },

  // Create a payout (disbursement to bank account)
  async createPayout({ amount, currency = 'ZAR', beneficiaryName, beneficiaryAccount, beneficiaryBankCode, reference }) {
    const url = `${this.base}/v1/payouts`;
    const payload = {
      amount,
      currency,
      beneficiary: {
        name: beneficiaryName,
        account_number: beneficiaryAccount,
        bank_code: beneficiaryBankCode
      },
      reference
    };
    const resp = await axios.post(url, payload, { headers: this.authHeaders() });
    await writeAudit('KORA_PAYOUT_CREATE', { request: payload, response: resp.data });
    return resp.data;
  },

  // Fetch payout status
  async getPayoutStatus(payoutId) {
    const url = `${this.base}/v1/payouts/${payoutId}`;
    const resp = await axios.get(url, { headers: this.authHeaders() });
    await writeAudit('KORA_PAYOUT_STATUS', { payoutId, response: resp.data });
    return resp.data;
  }
};

// ---------------------------
// CBDC Service — integrate Kora for payouts
// ---------------------------
const CDBCService = {
  async convertCbdcToZar(userId, cbdcAmount) {
    const zarAmount = cbdcAmount; // placeholder peg logic
    await writeAudit('CBDC_CONVERT', { userId, cbdcAmount, zarAmount });
    return { zarAmount };
  },

  async payoutToBank(userId, bankProvider, accountDetails, amountZar) {
    // bankProvider: 'KORA' or direct 'BANK'
    if (bankProvider === 'KORA') {
      const payoutResp = await KoraAdapter.createPayout({
        amount: amountZar,
        beneficiaryName: accountDetails.name,
        beneficiaryAccount: accountDetails.accountNumber,
        beneficiaryBankCode: accountDetails.bankCode,
        reference: `CBDC-PAYOUT-${userId}-${Date.now()}`
      });

      await writeAudit('CBDC_PAYOUT_INITIATED', { userId, amountZar, provider: 'KORA', payoutResp });
      return { provider: 'KORA', payoutResp };
    }

    // Direct bank payout flow (placeholder)
    const record = { userId, bankProvider, accountDetails, amountZar, status: 'queued' };
    await writeAudit('CBDC_PAYOUT_QUEUED', record);
    return { provider: bankProvider, status: 'queued' };
  }
};

// ---------------------------
// Express Application (API)
// ---------------------------
const app = express();
app.use(bodyParser.json());

app.get('/health', (req, res) => res.json({ status: 'ok', now: new Date() }));

app.get('/api/config', (req, res) => {
  res.json({
    backend: process.env.BACKEND || null,
    moveVm: process.env.MOVE_VM_ADDRESS || null,
    apiProvider: 'OpenBankingAggregator',
    region: 'SADC'
  });
});

// Kora: create payin (for customer to fund via Instant EFT)
app.post('/kora/payin', async (req, res) => {
  try {
    const { amount, customerName, customerEmail, callbackUrl } = req.body;
    if (!amount || !customerName || !customerEmail) return res.status(400).json({ error: 'missing fields' });
    const resp = await KoraAdapter.createPayin({ amount, customerName, customerEmail, callbackUrl });
    res.json(resp);
  } catch (e) {
    await writeAudit('KORA_PAYIN_ERROR', { error: e.message, body: req.body });
    res.status(500).json({ error: e.message });
  }
});

// Kora: create payout
app.post('/kora/payout', async (req, res) => {
  try {
    const { userId, amount, beneficiaryName, beneficiaryAccount, beneficiaryBankCode } = req.body;
    if (!userId || !amount || !beneficiaryName || !beneficiaryAccount || !beneficiaryBankCode) return res.status(400).json({ error: 'missing fields' });

    // Convert CBDC to ZAR first if needed (omitted if amount already ZAR)
    // For simplicity, assume amount is ZAR passed in
    const payout = await CDBCService.payoutToBank(userId, 'KORA', { name: beneficiaryName, accountNumber: beneficiaryAccount, bankCode: beneficiaryBankCode }, amount);
    res.json(payout);
  } catch (e) {
    await writeAudit('KORA_PAYOUT_ERROR', { error: e.message, body: req.body });
    res.status(500).json({ error: e.message });
  }
});

// Kora webhook endpoint — Kora will POST payout updates here
app.post('/webhook/kora', async (req, res) => {
  // Validate signature per Kora docs (omitted here).
  const payload = req.body;
  await writeAudit('KORA_WEBHOOK', payload);

  // Example: update payout status in DB (implement mapping)
  // If payload contains payout_id and status, update record

  res.json({ received: true });
});

// Existing aggregator endpoints (accounts/transactions) — assume adapters are present
app.get('/aggregate/accounts', async (req, res) => {
  try {
    // adapters omitted for brevity
    res.json({ ABSA: [], FNB: [], Standard: [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/aggregate/transactions', async (req, res) => {
  res.json({ ABSA: [], FNB: [], Standard: [] });
});

// CBDC payout endpoint (now supports Kora)
app.post('/cbdc/payout', async (req, res) => {
  try {
    const { userId, cbdcAmount, bankProvider, beneficiary } = req.body; // beneficiary: { name, accountNumber, bankCode }
    if (!userId || !cbdcAmount || !bankProvider || !beneficiary) return res.status(400).json({ error: 'missing fields' });

    const conversion = await CDBCService.convertCbdcToZar(userId, cbdcAmount);
    const payoutResult = await CDBCService.payoutToBank(userId, bankProvider, beneficiary, conversion.zarAmount);

    await writeAudit('CBDC_PAYOUT', { userId, cbdcAmount, conversion, payoutResult });
    res.json({ conversion, payoutResult });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin audit view (protect in prod)
app.get('/admin/audit', async (req, res) => {
  try {
    const rows = await withDb(async (pool) => {
      const r = await pool.request().query(`SELECT TOP (50) EventType, Payload, CreatedAt FROM AuditLogs ORDER BY CreatedAt DESC`);
      return r.recordset;
    });
    res.json({ rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Open Banking Aggregator (with Kora) listening on ${PORT}`));


CITIZENS WALLET 



// server.js
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import jwt from "jsonwebtoken";
import mssql from "mssql";

const app = express();
app.use(cors());
app.use(express.json());

// ====== CONFIG ======
const JWT_SECRET = "change_this_secret";
const KORAPAY_SECRET_KEY = "sk_test_xxxxx"; // replace with real
const SADI_TO_USD_BASE = 1.5; // 100 SADI ≈ $1.5 example
const sqlConfig = {
  user: "YOUR_AZURE_SQL_USER",
  password: "YOUR_AZURE_SQL_PASSWORD",
  database: "YOUR_DB_NAME",
  server: "YOUR_SERVER_NAME.database.windows.net",
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  options: { encrypt: true, trustServerCertificate: false }
};

// ====== DB INIT ======
async function initDB() {
  const pool = await mssql.connect(sqlConfig);
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
    CREATE TABLE Users (
      id INT IDENTITY PRIMARY KEY,
      full_name NVARCHAR(255),
      email NVARCHAR(255) UNIQUE,
      phone NVARCHAR(50),
      password NVARCHAR(255),
      balance_sadi FLOAT DEFAULT 0
    )
  `);
}
initDB().catch(console.error);

// ====== MIDDLEWARE ======
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token" });
  const token = header.split(" ")[1];
  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// ====== ROUTES ======

// Register
app.post("/api/register", async (req, res) => {
  const { full_name, email, phone, password } = req.body;
  try {
    const pool = await mssql.connect(sqlConfig);
    await pool
      .request()
      .input("full_name", full_name)
      .input("email", email)
      .input("phone", phone)
      .input("password", password) // NOTE: hash in production
      .input("balance_sadi", 100)
      .query(
        "INSERT INTO Users (full_name,email,phone,password,balance_sadi) VALUES (@full_name,@email,@phone,@password,@balance_sadi)"
      );
    res.json({ success: true, credited: 100 });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const pool = await mssql.connect(sqlConfig);
  const result = await pool
    .request()
    .input("email", email)
    .input("password", password)
    .query(
      "SELECT id, email FROM Users WHERE email=@email AND password=@password"
    );
  if (result.recordset.length) {
    const token = jwt.sign(
      { id: result.recordset[0].id, email },
      JWT_SECRET
    );
    res.json({ token });
  } else res.status(401).json({ error: "Invalid login" });
});

// Wallet info
app.get("/api/wallet/me", auth, async (req, res) => {
  const pool = await mssql.connect(sqlConfig);
  const result = await pool
    .request()
    .input("id", req.user.id)
    .query("SELECT full_name,email,balance_sadi FROM Users WHERE id=@id");
  res.json(result.recordset[0]);
});

// Convert SADI → Fiat
app.post("/api/convert", auth, async (req, res) => {
  const { amount_sadi, target_currency } = req.body;
  // fetch real exchange rate for USD → target
  const fxRes = await fetch(
    `https://api.exchangerate.host/latest?base=USD&symbols=${target_currency}`
  );
  const fx = await fxRes.json();
  const usdValue = (amount_sadi / 100) * SADI_TO_USD_BASE;
  const fiatValue = usdValue * (fx.rates[target_currency] || 1);

  // deduct from wallet
  const pool = await mssql.connect(sqlConfig);
  await pool
    .request()
    .input("id", req.user.id)
    .input("amt", amount_sadi)
    .query("UPDATE Users SET balance_sadi = balance_sadi - @amt WHERE id=@id");

  res.json({
    amount_sadi,
    usdValue,
    fiatValue,
    currency: target_currency,
    rate: fx.rates[target_currency]
  });
});

// Disburse via Korapay
app.post("/api/disburse", auth, async (req, res) => {
  const { account_number, bank_code, amount, currency } = req.body;
  try {
    const koraRes = await fetch("https://api.korapay.com/merchant/disburse", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KORAPAY_SECRET_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        reference: "txn_" + Date.now(),
        destination: {
          type: "bank_account",
          amount,
          currency,
          narration: "CBDC Withdrawal",
          bank_account: {
            bank: bank_code,
            account: account_number
          }
        }
      })
    });
    const j = await koraRes.json();
    res.json(j);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====== START ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));
