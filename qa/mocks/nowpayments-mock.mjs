// Local stand-in for the NOWPayments API + hosted invoice page (sandbox-shaped).
// POST /v1/invoice  -> { id, invoice_url }   (checks x-api-key)
// GET  /invoice/:id -> page with Pay / Pay part / Pay wrong amount / Cancel
// Paying sends the real IPN sequence (waiting, confirming, confirmed, sending, finished)
// signed with NOWPAYMENTS_IPN_SECRET to ipn_callback_url, then redirects to success_url.
import http from 'node:http';
import { createHmac } from 'node:crypto';
const PORT = 4010, KEY = 'mock-np-key', SECRET = process.env.NOWPAYMENTS_IPN_SECRET;
const invoices = new Map(); const log = [];
let seq = 5_000_000_000 + (Date.now() % 1_000_000);
const sortDeep = (v) => Array.isArray(v) ? v.map(sortDeep) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortDeep(v[k])])) : v;
async function ipn(inv, status, priceAmount, paymentId) {
  const body = { payment_id: paymentId, invoice_id: Number(inv.id), order_id: inv.order_id, order_description: inv.order_description,
    payment_status: status, price_amount: priceAmount, price_currency: inv.price_currency, pay_amount: 21.35, actually_paid: status === 'finished' ? 21.35 : 0,
    pay_currency: 'usdttrc20', purchase_id: String(paymentId + 7), outcome_amount: priceAmount * 0.99, outcome_currency: 'usdttrc20',
    fee: { currency: 'usdttrc20', depositFee: 0.1, withdrawalFee: 0, serviceFee: 0.05 }, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  const sig = createHmac('sha512', SECRET).update(JSON.stringify(sortDeep(body))).digest('hex');
  const r = await fetch(inv.ipn_callback_url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-nowpayments-sig': sig }, body: JSON.stringify(body) });
  const res = await r.text(); log.push({ status, http: r.status, res }); return { status, http: r.status, res };
}
http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let raw = ''; for await (const c of req) raw += c;
  if (req.method === 'POST' && url.pathname === '/v1/invoice') {
    if (req.headers['x-api-key'] !== KEY) { res.writeHead(403, { 'content-type': 'application/json' }); return res.end('{"message":"Invalid api key"}'); }
    const b = JSON.parse(raw); const id = String(++seq);
    invoices.set(id, { ...b, id }); log.push({ created: id, body: b });
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ id, order_id: b.order_id, price_amount: String(b.price_amount), price_currency: b.price_currency, invoice_url: `http://localhost:${PORT}/invoice/${id}`, created_at: new Date().toISOString() }));
  }
  const m = url.pathname.match(/^\/invoice\/(\d+)(?:\/(pay|part|wrong|cancel))?$/);
  if (m && invoices.has(m[1])) {
    const inv = invoices.get(m[1]);
    if (!m[2]) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(`<!doctype html><meta charset="utf-8"><title>NOWPayments (mock)</title><h1>Mock NOWPayments invoice ${inv.id}</h1><p data-testid="np-desc">${inv.order_description} — $${inv.price_amount} ${inv.price_currency}</p>
<a id="np-pay" href="/invoice/${inv.id}/pay">Pay</a> · <a id="np-part" href="/invoice/${inv.id}/part">Pay only part</a> · <a id="np-wrong" href="/invoice/${inv.id}/wrong">Pay wrong amount</a> · <a id="np-cancel" href="/invoice/${inv.id}/cancel">Cancel</a>`);
    }
    if (m[2] === 'cancel') { res.writeHead(302, { location: inv.cancel_url }); return res.end(); }
    const pid = ++seq;
    const steps = m[2] === 'pay' ? ['waiting', 'confirming', 'confirmed', 'sending', 'finished'] : m[2] === 'part' ? ['waiting', 'partially_paid'] : ['waiting', 'finished'];
    const price = m[2] === 'wrong' ? 1.99 : inv.price_amount;
    const out = []; for (const s of steps) out.push(await ipn(inv, s, price, pid));
    inv.lastPaymentId = pid;
    res.writeHead(302, { location: inv.success_url }); return res.end();
  }
  if (url.pathname.startsWith('/refund/')) { // test hook: send a 'refunded' IPN for the invoice's last payment
    const inv = invoices.get(url.pathname.split('/')[2]);
    const out = await ipn(inv, 'refunded', inv.price_amount, inv.lastPaymentId);
    res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify(out));
  }
  if (url.pathname === '/log') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify(log, null, 1)); }
  if (url.pathname === '/invoices') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify([...invoices.values()])); }
  res.writeHead(404); res.end('not found');
}).listen(PORT, () => console.log('np mock on', PORT));
