

// api/total_supply.js
export default async function handler(req, res) {
  try {
    const token = process.env.TOKEN_ADDRESS;
    const key = process.env.ETHERSCAN_API_KEY;

    if (!token || !key) {
      return res.status(500).json({ error: "Missing TOKEN_ADDRESS or ETHERSCAN_API_KEY" });
    }

    const url = `https://api.etherscan.io/v2/api?chain=polygon&module=stats&action=tokensupply&contractaddress=${token}&apikey=${key}`;

    const r = await fetch(url, { method: "GET" });
    const data = await r.json();

    // Etherscan V2 returns result as string of integer (in token's smallest unit)
    // Most ERC20s have 18 decimals. CoinGecko accepts raw integer as string.
    const total = data?.result ?? null;

    if (!total) {
      return res.status(500).json({ error: "No result from Etherscan", raw: data });
    }

    return res.status(200).json({ total_supply: total.toString() });
  } catch (err) {
    return res.status(500).json({ error: err.toString() });
  }
}


---

// api/circulating_supply.js
export default async function handler(req, res) {
  try {
    const token = process.env.TOKEN_ADDRESS;
    const key = process.env.ETHERSCAN_API_KEY;
    const burnedWallet = process.env.BURN_ADDRESS || "0x000000000000000000000000000000000000dEaD";
    const lockedWallets = JSON.parse(process.env.LOCKED_WALLETS || "[]");

    if (!token || !key) {
      return res.status(500).json({ error: "Missing TOKEN_ADDRESS or ETHERSCAN_API_KEY" });
    }

    // 1) Get total supply
    const totalUrl = `https://api.etherscan.io/v2/api?chain=polygon&module=stats&action=tokensupply&contractaddress=${token}&apikey=${key}`;
    const totalResp = await (await fetch(totalUrl)).json();
    const total = Number(totalResp.result ?? 0);

    // 2) Get burned balance
    const burnedUrl = `https://api.etherscan.io/v2/api?chain=polygon&module=account&action=tokenbalance&contractaddress=${token}&address=${burnedWallet}&apikey=${key}`;
    const burnedResp = await (await fetch(burnedUrl)).json();
    const burned = Number(burnedResp.result ?? 0);

    // 3) Sum locked wallets
    let lockedTotal = 0;
    if (Array.isArray(lockedWallets) && lockedWallets.length) {
      for (const addr of lockedWallets) {
        if (!addr) continue;
        const url = `https://api.etherscan.io/v2/api?chain=polygon&module=account&action=tokenbalance&contractaddress=${token}&address=${addr}&apikey=${key}`;
        const r = await (await fetch(url)).json();
        lockedTotal += Number(r.result ?? 0);
      }
    }

    // circulating = total - burned - locked
    const circulating = total - burned - lockedTotal;
    const safeCirculating = circulating < 0 ? 0 : circulating;

    return res.status(200).json({ circulating_supply: safeCirculating.toString() });
  } catch (err) {
    return res.status(500).json({ error: err.toString() });
  }
}