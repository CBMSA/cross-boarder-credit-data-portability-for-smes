// --- File: server.js (CBDC backend with Azure SQL + USSD + Biometric + QR + Offline Ready) ---
const express = require('express');
const bodyParser = require('body-parser');
const { generateKeyPairSync } = require('crypto');
const sql = require('mssql');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const config = {
  user: 'your_sql_username',
  password: 'your_sql_password',
  server: 'your_server.database.windows.net',
  database: 'SADC_CBDC_DB',
  options: {
    encrypt: true,
    enableArithAbort: true
  }
};

sql.connect(config).then(pool => {
  if (pool.connected) console.log("Connected to Azure SQL");
}).catch(err => console.error("Azure SQL connection error:", err));

app.post('/register', async (req, res) => {
  const { name, nationalId, biometricHash } = req.body;
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const walletId = 'wallet_' + Math.random().toString(36).substring(2, 9);
  try {
    await sql.query`
      INSERT INTO Wallets (WalletId, Name, NationalId, PublicKey, BiometricHash, Balance)
      VALUES (${walletId}, ${name}, ${nationalId}, ${publicKey.export({ type: 'pkcs1', format: 'pem' })}, ${biometricHash}, 0)`;
    res.json({ walletId, privateKey: privateKey.export({ type: 'pkcs1', format: 'pem' }) });
  } catch (err) {
    res.status(500).json({ error: 'Registration Error', details: err.message });
  }
});

app.post('/auth/biometric', async (req, res) => {
  const { nationalId, biometricHash } = req.body;
  try {
    const result = await sql.query`SELECT WalletId FROM Wallets WHERE NationalId = ${nationalId} AND BiometricHash = ${biometricHash}`;
    if (result.recordset.length === 0) return res.status(401).json({ error: 'Authentication failed' });
    res.json({ walletId: result.recordset[0].WalletId });
  } catch (err) {
    res.status(500).json({ error: 'Auth error', details: err.message });
  }
});

app.post('/transfer', async (req, res) => {
  const { fromWallet, toWallet, amount } = req.body;
  try {
    const result = await sql.query`SELECT Balance FROM Wallets WHERE WalletId = ${fromWallet}`;
    if (result.recordset.length === 0) return res.status(404).json({ error: 'Wallet not found' });
    if (result.recordset[0].Balance < amount) return res.status(400).json({ error: 'Insufficient balance' });
    await sql.query`BEGIN TRANSACTION;
      UPDATE Wallets SET Balance = Balance - ${amount} WHERE WalletId = ${fromWallet};
      UPDATE Wallets SET Balance = Balance + ${amount} WHERE WalletId = ${toWallet};
      INSERT INTO Ledger (FromWallet, ToWallet, Amount, Timestamp) VALUES (${fromWallet}, ${toWallet}, ${amount}, ${new Date().toISOString()});
    COMMIT;`;
    res.json({ message: 'Transfer successful' });
  } catch (err) {
    res.status(500).json({ error: 'Transfer failed', details: err.message });
  }
});

app.get('/balance/:walletId', async (req, res) => {
  try {
    const result = await sql.query`SELECT Balance FROM Wallets WHERE WalletId = ${req.params.walletId}`;
    if (result.recordset.length === 0) return res.status(404).json({ error: 'Wallet not found' });
    res.json({ balance: result.recordset[0].Balance });
  } catch (err) {
    res.status(500).json({ error: 'Balance fetch error', details: err.message });
  }
});

app.post('/ussd', async (req, res) => {
  const { text, phoneNumber } = req.body;
  const input = text.split("*");
  let response = "";
  if (text === "") {
    response = `CON Welcome to SADC CBDC\n1. Check Balance\n2. Register`;
  } else if (text === "1") {
    try {
      const result = await sql.query`SELECT Balance FROM Wallets WHERE NationalId = ${phoneNumber}`;
      response = result.recordset.length > 0
        ? `END Your balance is ZAR ${result.recordset[0].Balance}`
        : "END Wallet not found. Please register.";
    } catch {
      response = "END Error fetching balance.";
    }
  } else if (text === "2") {
    response = "END Visit nearest agent to register.";
  } else {
    response = "END Invalid option";
  }
  res.set("Content-Type", "text/plain");
  res.send(response);
});

app.listen(3000, () => console.log('CBDC Server running on port 3000'));


// --- File: azure_sql_schema.sql ---
CREATE TABLE Wallets (
  WalletId VARCHAR(50) PRIMARY KEY,
  Name NVARCHAR(100),
  NationalId VARCHAR(50) UNIQUE,
  PublicKey TEXT,
  BiometricHash TEXT,
  Balance DECIMAL(18,2)
);

CREATE TABLE Ledger (
  TransactionId INT IDENTITY(1,1) PRIMARY KEY,
  FromWallet VARCHAR(50),
  ToWallet VARCHAR(50),
  Amount DECIMAL(18,2),
  Timestamp DATETIME DEFAULT GETDATE()
);


// --- File: mobile_wallet.js (React Native App with QR and Offline Mode) ---
import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import axios from 'axios';
import * as Print from 'expo-print';
import QRCode from 'react-native-qrcode-svg';

export default function WalletApp() {
  const [nationalId, setNationalId] = useState('');
  const [walletId, setWalletId] = useState(null);
  const [balance, setBalance] = useState(null);

  const authenticate = async () => {
    const result = await LocalAuthentication.authenticateAsync();
    if (!result.success) {
      Alert.alert("Authentication failed");
      return;
    }
    const hash = "demoBiometricHash"; // Replace with real hash
    const res = await axios.post('http://localhost:3000/auth/biometric', {
      nationalId,
      biometricHash: hash
    });
    setWalletId(res.data.walletId);
  };

  const fetchBalance = async () => {
    const res = await axios.get(`http://localhost:3000/balance/${walletId}`);
    setBalance(res.data.balance);
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 18 }}>SADC CBDC Wallet</Text>
      <TextInput placeholder="National ID" value={nationalId} onChangeText={setNationalId} style={{ borderBottomWidth: 1, marginBottom: 12 }} />
      <Button title="Login with Biometrics" onPress={authenticate} />
      {walletId && (
        <>
          <Button title="Check Balance" onPress={fetchBalance} />
          {balance !== null && <Text>Balance: ZAR {balance}</Text>}
          <QRCode value={walletId} size={200} />
        </>
      )}
    </View>
  );
}

const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const cors = require('cors');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.static('public'));
app.use(express.json());

function analyzeCSV(filePath, callback) {
  const results = [];

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => {
      const region = row.region || row.Region || row["Region Name"];
      const allocated = parseFloat(row.allocated || row.Allocated || 0);
      const spent = parseFloat(row.spent || row.Spent || 0);
      const gap = allocated - spent;
      const gapInflection = (gap / allocated) * 100;

      results.push({
        region,
        allocated,
        spent,
        gap,
        gapInflection: gapInflection.toFixed(2),
      });
    })
    .on('end', () => {
      callback(results);
    });
}

app.post('/upload', upload.single('csvFile'), (req, res) => {
  const filePath = req.file.path;

  analyzeCSV(filePath, (data) => {
    fs.unlinkSync(filePath); // Clean up uploaded file
    res.json(data);
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`📊 Financial Analyzer running at http://localhost:${PORT}`);
});

 