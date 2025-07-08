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

// ===== Interbank Transfer via APIX =====
app.post('/api/transfer-to-bank', async (req, res) => {
  const { amount, destinationAccount, destinationBankCode, narration, walletAddress } = req.body;
  try {
    const bankRes = await axios.post('https://api.apixplatform.com/transfer', {
      amount,
      destinationAccount,
      destinationBankCode,
      narration
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.APIX_TOKEN}`
      }
    });

    await sql.query`
      INSERT INTO Transfers (WalletAddress, Amount, BankCode, AccountNumber, Status, Timestamp)
      VALUES (${walletAddress}, ${amount}, ${destinationBankCode}, ${destinationAccount}, 'SENT', GETDATE())
    `;

    res.json(bankRes.data);
  } catch (err) {
    res.status(500).json({ error: 'Fiat transfer failed', details: err.message });
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


