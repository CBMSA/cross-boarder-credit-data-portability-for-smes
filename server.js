
const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const USD_ZAR_API = 'https://open.er-api.com/v6/latest/USD'; // FX rates for USD/ZAR
const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,matic-network&vs_currencies=usd';
const DEXSCREENER_API = 'https://api.dexscreener.com/latest/dex/tokens/0x3e6dB8977261B30Ea3Cc0408867912E8B6CeDC96';
const EODHD_API_KEY = process.env.EODHD_API_KEY;  // API Key for EODHD
const EODHD_API = 'https://eodhd.com/api/real-time/';

// ---- Fetch Live Rates for FX, Crypto, SDC, ETFs ----

app.get("/rates", async (req, res) => {
  try {
    // Fetch FX rates from the Open API (USD/ZAR, BWP/ZAR, MZN/ZAR)
    const forexRes = await axios.get(USD_ZAR_API);
    const fxData = forexRes.data;

    // Fetch Crypto Rates from CoinGecko API
    const cryptoRes = await axios.get(COINGECKO_API);
    const cryptoData = cryptoRes.data;

    // Fetch SDC Rates from DexScreener API
    const sdcRes = await axios.get(DEXSCREENER_API);
    const sdcData = sdcRes.data;

    // Fetch ETFs data from EODHD API
    const etfs = [
      { name: "SPY", symbol: "SPY.US" },
      { name: "QQQ", symbol: "QQQ.US" },
      { name: "GLD", symbol: "GLD.US" },
      { name: "IWM", symbol: "IWM.US" },
    ];

    const etfRates = [];
    for (let etf of etfs) {
      const etfRes = await axios.get(`${EODHD_API}${etf.symbol}?api_token=${EODHD_API_KEY}&fmt=json`);
      etfRates.push(etfRes.data);
    }

    res.status(200).json({
      fxRates: fxData.rates,
      cryptoRates: {
        bitcoin: cryptoData.bitcoin.usd,
        ethereum: cryptoData.ethereum.usd,
        matic: cryptoData['matic-network'].usd,
      },
      sdcRates: sdcData.pairs ? sdcData.pairs[0] : null,
      etfRates: etfRates,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
