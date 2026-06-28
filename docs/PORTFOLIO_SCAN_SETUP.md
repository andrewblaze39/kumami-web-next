# Portfolio Scan — Step-by-step setup

Do these in order. Each step depends on the one above it.

The code is already written. After this, scan works end-to-end.

---

## Step 1 — Import the workflow into n8n

1. Open your n8n instance in a browser
2. Top right → **⋯ menu** → **Import from File**
3. Pick `docs/n8n/Kuma Portfolio Analyst.json` from this repo
4. The workflow loads with 5 nodes: Webhook → AI Agent → Validate & Repair → Respond to Webhook (+ Google Gemini Chat Model wired into the AI Agent)

---

## Step 2 — Fix the Gemini credential

The workflow references your existing Gemini credential by ID, but n8n may not auto-bind it after import.

1. Click the **Google Gemini Chat Model** node (bottom-left of the canvas)
2. In the right panel, look at **Credential to connect with**
3. If it shows the right account → you're done. If it shows "Select Credential" or red text → click it and pick your existing Gemini account (the same one your `Kuma AI Agent` chatbot uses)
4. Close the node

---

## Step 3 — Save and activate

1. **Cmd/Ctrl + S** (or click **Save**)
2. Top right → toggle **Inactive** to **Active**

The webhook is now live.

---

## Step 4 — Copy the production webhook URL

1. Click the **Webhook** node
2. In the right panel you'll see two URLs: **Test URL** and **Production URL**
3. Copy the **Production URL** — looks like:
   ```
   https://<your-n8n-host>/webhook/portfolio-scan
   ```

---

## Step 5 — Add the env var

Open `.env.local` in the repo root. Add this line at the bottom:

```
N8N_PORTFOLIO_SCAN_WEBHOOK_URL=https://<your-n8n-host>/webhook/portfolio-scan
```

Paste the URL you just copied. Save the file.

---

## Step 6 — Restart the dev server

Next.js only reads env vars at startup. In your terminal:

```
# Stop the running dev server (Ctrl+C in its terminal), then:
npm run dev
```

Wait for it to print `✓ Ready in …`.

---

## Step 7 — (Optional) Test n8n directly with curl

Skip this if you trust the workflow imported cleanly. Useful for debugging if Step 8 fails.

```bash
curl -X POST https://<your-n8n-host>/webhook/portfolio-scan \
  -H "content-type: application/json" \
  -d '{
    "userId": "test",
    "currency": "USD",
    "totalValue": 100000,
    "holdings": [
      { "symbol": "BTC", "amount": 1.5, "valueUsd": 90000, "allocationPct": 90, "change24h": 1.2 },
      { "symbol": "ETH", "amount": 3,   "valueUsd": 10000, "allocationPct": 10, "change24h": 2.1 }
    ]
  }'
```

Expect a JSON response with `overall`, `dimensions`, `assets`, `actions`, `commentary`, `scannedAt`. If you get an error, check n8n's execution log for the failed node.

---

## Step 8 — Test in the browser

1. Open http://localhost:3000/pro (signed in as a Pro user with at least one coin in your portfolio)
2. On the right side of the Portfolio tab you'll see the **AI Portfolio Scan** card
3. Click **⚡ Scan my portfolio**
4. Watch the loading animation (~5–15s) — Kuma bear bobbing, pulsing rings, cycling subtext
5. Results card appears: gauge + verdict pill + top 3 findings
6. Click **View full report ›** → modal with ring gauge, 2×2 risk breakdown, per-asset risks, Kuma commentary, suggested moves
7. Refresh the page — your last scan loads instantly from cache
8. Edit your portfolio (add or remove a coin) → yellow "Portfolio changed since this scan" banner appears
9. Click **↻ Re-scan** anywhere → fresh scan runs

If anything breaks: open DevTools → **Network** tab → click the `/api/portfolio-scan` request → look at status + response body. Cross-reference with **Troubleshooting** below.

---

## Step 9 — Deploy

Once it works locally:

1. Add `N8N_PORTFOLIO_SCAN_WEBHOOK_URL` to your hosting provider's env vars (Vercel → Project Settings → Environment Variables, or wherever you host)
2. Push the code, redeploy
3. Smoke-test on production with a real Pro account

---

## Troubleshooting

**`500 — Portfolio scan not configured (missing env)`**
→ Env var not loaded. Double-check `.env.local` is in the repo root, the variable name matches exactly, and you restarted `npm run dev`.

**`502 — Scan service unreachable`**
→ Next.js can't reach n8n. Verify the URL by pasting it into a browser — should respond with something (probably an error about GET, that's fine; it proves DNS + connection work).

**`502 — Scan failed upstream`**
→ n8n returned non-2xx. Open n8n → Executions → find the failed run → click into it → see which node errored. Usually the AI Agent (model issue) or the Validate node (bad JSON from Gemini).

**Loading spins, then errors after a while**
→ Gemini wrapped its JSON in ```markdown``` fences or returned prose. The Validate node strips fences, but if Gemini ignored the "return ONLY JSON" rule, it'll throw. Open the failed execution and check the AI Agent's raw output.

**Results render but every level is "medium"**
→ The model returned `level` values outside `low|medium|high` and got clamped. Check the AI Agent's raw output in n8n executions.

**Stale banner shows immediately after a fresh scan**
→ Hash mismatch. The hash uses only `symbol` + `amount` so it shouldn't happen — if it does, log `currentHash` and `scannedHash` in `PortfolioScanCard.tsx` and check what differs.

**"This webhook is not registered" when curling**
→ Workflow isn't active. Go to n8n, toggle Active.

---

## What's left after this works

See `PRD_AI_Portfolio_Scan.md`:
- **Phase 6** — News tagger (separate n8n cron + Firestore writes)
- **Phase 7** — Mirror to `ProDashboardV2.tsx`, polish, production rollout
