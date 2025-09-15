/**
 * Cloudflare Worker (edge) that creates a MoonPay URL.
 *
 * Setup:
 * - Deploy on Cloudflare Workers.
 * - In the worker's environment add a secret variable MOONPAY_SECRET_KEY = sk_live_...
 * - Optionally add MOONPAY_PUBLISHABLE_KEY for reference.
 *
 * This endpoint accepts POST JSON { address, baseCurrencyAmount } and returns { url }.
 * Implementation details below are illustrative — adapt to MoonPay API docs.
 */

addEventListener('fetch', event => {
  event.respondWith(handle(event.request));
});

async function handle(request) {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const env = MOONPAY_SECRET_KEY; // In Cloudflare, bind secret as env var using Wrangler or dashboard
  // In Worker you access secrets through global binding; adapt to your deploy method
  // Here we assume MOONPAY_SECRET_KEY is available globally (set via dashboard)

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response('Bad JSON', { status: 400 });
  }
  const { address, baseCurrencyAmount } = body;
  if (!address || !baseCurrencyAmount) return new Response('Missing params', { status: 400 });

  // Example call to MoonPay (illustrative)
  // MoonPay docs show using API POST /v4/transactions?... or similar. Use their official SDK or REST API.
  // Important: include your secret key in server-to-server request headers only.

  const moonpayResp = await fetch('https://api.moonpay.io/v3/transactions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MOONPAY_SECRET_KEY}` // server-side only
    },
    body: JSON.stringify({
      baseCurrencyAmount,
      baseCurrency: 'usd',
      currency: 'ethereum',
      walletAddress: address,
      // other required MoonPay params (customer info, redirect URLs)...
    })
  });

  if (!moonpayResp.ok) {
    const txt = await moonpayResp.text();
    return new Response('MoonPay error: ' + txt, { status: 502 });
  }

  const data = await moonpayResp.json();
  // MoonPay will return a URL or transaction object containing URL to redirect the user.
  return new Response(JSON.stringify({ url: data.url || data.checkoutUrl || data.transactionUrl || data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
