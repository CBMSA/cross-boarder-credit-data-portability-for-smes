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
  options: { encrypt: true, trustServerCertificate: true }
};

// Connect to Azure SQL
sql.connect(dbConfig).then(() => console.log('Connected to Azure SQL')).catch(console.error);

// Health Check
app.get('/', (req, res) => {
  res.send('SADC CBDC Node Backend Active');
});

// Move VM Transaction Submit (Mock or Real Integration)
app.post('/move/transfer', async (req, res) => {
  const { from, to, amount } = req.body;
  try {
    const result = await axios.post('http://<MOVE_VM_ADDRESS>/submit_transaction', { from, to, amount });
    res.json(result.data);
  } catch (err) {
    res.status(500).json({ error: 'Move transaction failed', details: err.message });
  }
});

// Interbank Transfer via Interswitch/APIX
app.post('/api/transfer-to-bank', async (req, res) => {
  const { amount, destinationAccount, destinationBankCode, narration, walletAddress } = req.body;
  try {
    const bankRes = await axios.post('https://api.apixplatform.com/transfer', {
      amount,
      destinationAccount,
      destinationBankCode,
      narration
    }, {
      headers: { 'Authorization': `Bearer ${process.env.APIX_TOKEN}` }
    });

    await sql.query`INSERT INTO Transfers (WalletAddress, Amount, BankCode, AccountNumber, Status, Timestamp) 
                    VALUES (${walletAddress}, ${amount}, ${destinationBankCode}, ${destinationAccount}, 'SENT', GETDATE())`;

    res.json(bankRes.data);
  } catch (err) {
    res.status(500).json({ error: 'Fiat transfer failed', details: err.message });
  }
});

// Explorer Feed Endpoint
app.get('/blockchain-feed', async (req, res) => {
  try {
    const response = await axios.get('http://<MOVE_VM_ADDRESS>/events');
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Unable to fetch blockchain feed' });
  }
});

// WebSocket Listener (Real-time)
const wss = new WebSocket.Server({ port: 7070 });

wss.on('connection', ws => {
  console.log('WebSocket Client Connected');
  ws.send(JSON.stringify({ status: 'connected' }));
});

// Poll Move VM for new events every 5s and broadcast
setInterval(async () => {
  try {
    const { data } = await axios.get('http://<MOVE_VM_ADDRESS>/events');
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'event', data }));
      }
    });
  } catch (err) {
    console.error('Polling error:', err.message);
  }
}, 5000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`CBDC Backend running on port ${PORT}`));