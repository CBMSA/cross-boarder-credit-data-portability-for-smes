// scanner.js
import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';

const app = express();
app.use(cors());

let lastDevices = [];

// GET /devices
app.get('/devices', (req, res) => {
  exec('arp -a', (err, stdout) => {
    if (err) return res.status(500).json({error: err.message});
    const devices = stdout.split('\n').map(line=>{
      const match = line.match(/([\d.]+).*?([\w:]+)/);
      return match ? { ip: match[1], mac: match[2], lastSeen: new Date().toISOString() } : null;
    }).filter(Boolean);

    // Detect new devices
    devices.forEach(d=>{
      const exists = lastDevices.find(ld => ld.mac===d.mac);
      if(!exists) console.log('New device:', d.ip, d.mac);
    });

    lastDevices = devices;
    res.json(devices);
  });
});

app.listen(3000, () => console.log('Local scanner running on http://localhost:3000'));
