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

