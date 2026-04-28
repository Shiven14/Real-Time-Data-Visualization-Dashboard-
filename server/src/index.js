const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
const wss = new WebSocket.Server({ server });

let latestData = null;

function fetchCrypto() {
  return new Promise((resolve, reject) => {
    const req = https.get(
      'https://api.coingecko.com/api/v3/simple/price' +
      '?ids=bitcoin,ethereum,litecoin&vs_currencies=usd&include_24hr_change=true',
      { headers: { Accept: 'application/json', 'User-Agent': 'rt-dashboard/1.0' } },
      res => {
        let body = '';
        res.on('data', c => (body += c));
        res.on('end', () => {
          try { resolve(JSON.parse(body)); }
          catch (e) { reject(e); }
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  });
}

async function updateAndBroadcast() {
  try {
    const prices = await fetchCrypto();
    latestData = {
      bitcoin:    prices.bitcoin?.usd          ?? null,
      ethereum:   prices.ethereum?.usd         ?? null,
      litecoin:   prices.litecoin?.usd         ?? null,
      btc_change: prices.bitcoin?.usd_24h_change  != null ? +prices.bitcoin.usd_24h_change.toFixed(2)  : null,
      eth_change: prices.ethereum?.usd_24h_change != null ? +prices.ethereum.usd_24h_change.toFixed(2) : null,
      ltc_change: prices.litecoin?.usd_24h_change != null ? +prices.litecoin.usd_24h_change.toFixed(2) : null,
      timestamp:  new Date().toLocaleTimeString(),
    };
    broadcast(latestData);
    console.log(`[${latestData.timestamp}] BTC $${latestData.bitcoin} | ETH $${latestData.ethereum} | LTC $${latestData.litecoin}`);
  } catch (err) {
    console.error('CoinGecko fetch error:', err.message);
  }
}

// Fetch immediately, then every 15 s (well within CoinGecko free-tier 30 req/min limit)
updateAndBroadcast();
setInterval(updateAndBroadcast, 15000);

wss.on('connection', ws => {
  console.log('Client connected');
  if (latestData) ws.send(JSON.stringify(latestData)); // send cached data immediately
  ws.on('close', () => console.log('Client disconnected'));
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
