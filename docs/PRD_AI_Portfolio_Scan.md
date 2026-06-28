# PRD — Kuma AI Portfolio Scan & Portfolio-Aware News

**Status:** v2 (reconciled with Claude Design handover) · 2026-06-27
**Owner:** Andrew
**Surface:** Pro Dashboard → Portfolio tab (`src/components/ProDashboard.tsx`, mirror to `ProDashboardV2.tsx`)
**Source of truth:** this file. Update STATUS markers as we ship each phase.
**Design reference:** `scratchpad/design/design_handoff_portfolio_ai_scan/` (HTML prototype + N8N_SETUP.md)

---

## 1. Feature summary

Two features ship together as a **sticky right rail** on the Portfolio tab:

1. **AI Portfolio Scan** — on-demand button. App posts the user's holdings to an n8n agent, gets back a structured risk analysis, renders a gauge + risk dimensions + per-asset ratings + Kuma's commentary + suggested moves. Compact view in the rail, "View full report" opens a centered modal.
2. **News for your bag** — daily, portfolio-filtered news card below the scan card. Each item shows symbol tag + sentiment + headline + a "For you:" line tied to the user's allocation.

---

## 2. Architecture (final)

```
┌──────────────┐  POST /api/portfolio-scan  ┌──────────────────┐  webhook   ┌──────────────┐
│ PortfolioTab │ ─────────────────────────▶ │ Next route       │ ─────────▶ │ n8n workflow │
│ (Scan btn)   │ ◀───────────────────────── │ src/app/api/...  │ ◀───────── │ (LLM agent)  │
└──────────────┘    structured JSON          └──────────────────┘  JSON      └──────────────┘
```

**Why this shape (and not async):** Design landed on synchronous because LLM scan time (~5–15s) is well under Next.js route handler timeouts (300s on Vercel hobby, 800s+ on Pro / self-hosted), and sync is dramatically simpler — no Firestore subcollection, no listener, no callback endpoint. n8n's "Respond to Webhook" returns synchronously to our route, which returns to the browser.

**News feed** is async by nature — scheduled n8n cron writes to Firestore daily; frontend queries on render.

---

## 3. Open decisions

| # | Decision | Status / default |
|---|---|---|
| D1 | Rate limit / pro-gate scans? | **Pro-only** (Portfolio tab already lives behind `ProOnlyRoute`). No per-user limit in v1. |
| D2 | Backend location | **Next.js route handler** — `src/app/api/portfolio-scan/route.ts` (DECIDED — per design) |
| D3 | Save scan history? | **No — cache only the latest** in `users/{uid}.lastPortfolioScan`. |
| D4 | News tagging strategy | Scheduled n8n cron writes to `daily_news/{date}` once per article; frontend filters by user symbols. |
| D5 | LLM model | **`models/gemini-2.5-flash`** (stable, fast). Was `gemini-3-flash-preview` but that model is deprecated/unavailable. |
| D6 | Score convention | **Higher = riskier always** (uniform UI rule). |
| D7 | Which ProDashboard? | Both `ProDashboard.tsx` (live) and `ProDashboardV2.tsx` get the rail. Start with `ProDashboard.tsx`. |
| D8 | n8n response auth | **None for v1** (same as chatbot). Webhook URL is server-side only. Add a secret later if budget abuse becomes a concern. |

---

## 4. Data contracts

### 4.1 Request (Next route → n8n)

```jsonc
{
  "userId":     "firebase-uid",   // optional, for logging
  "currency":   "USD",
  "totalValue": 1054534.50,
  "holdings": [
    { "symbol": "HYPE", "amount": 10000, "valueUsd": 630800,  "allocationPct": 59.8, "change24h": 2.48 },
    { "symbol": "BTC",  "amount": 7,     "valueUsd": 422107,  "allocationPct": 40.0, "change24h": 1.76 },
    { "symbol": "ETH",  "amount": 1,     "valueUsd": 1582.69, "allocationPct": 0.2,  "change24h": 3.01 }
  ]
}
```

### 4.2 Response (n8n → Next route → frontend) — **THE schema the UI binds to**

```ts
interface ScanResult {
  scannedAt: string;       // ISO-8601
  overall: {
    score: number;         // 0–100, higher = riskier
    level: 'low' | 'medium' | 'high';
    label: string;         // e.g. "High Risk"
    headline: string;      // 1 punchy sentence
  };
  dimensions: Array<{      // 3–4 items; UI shows worst first
    key: 'concentration' | 'diversification' | 'volatility' | 'liquidity';
    level: 'low' | 'medium' | 'high';
    value: string;         // short e.g. "99.8% in 2 coins"
  }>;
  assets: Array<{          // one per holding
    symbol: string;
    level: 'low' | 'medium' | 'high';
    note: string;          // short context line
  }>;
  actions: string[];       // 2–3 concrete moves, plain strings
  commentary: string;      // 2–4 warm sentences, Kuma voice
}
```

**Hard rule:** `level` is **exactly** `"low" | "medium" | "high"`. The frontend color-switches on it (`low→#4ade80`, `medium→#FACC15`, `high→#f87171`). Validate server-side; clamp anything else to `"medium"`.

### 4.3 News doc shape — `daily_news/{date}/items/{id}` (or flat collection)

```ts
interface DailyNewsItem {
  symbol: string;               // 'BTC', 'HYPE'
  sentiment: 'bullish' | 'watch' | 'bearish';
  headline: string;
  url: string;
  publishedAt: Timestamp;
  summary: string;              // 1 short line, can be templated client-side with allocation
}
```

Frontend query: `where('symbol', 'in', userPortfolioSymbols)` (or `array-contains-any` if multi-symbol per item).

### 4.4 Optional persistence — `users/{uid}` doc

```ts
lastPortfolioScan?: {
  result: ScanResult;
  portfolioHash: string;        // sha256 of sorted (symbol, amount) pairs
  totalValueAtScan: number;
};
```

Used to render the previous result instantly on page load + drive the stale-portfolio banner.

---

## 5. Files to create / modify

### New
- `src/app/api/portfolio-scan/route.ts` — POST handler (proxies to n8n, validates, repairs `level`)
- `src/components/portfolio/scan/types.ts` — `ScanResult`, `ScanStage`, etc.
- `src/components/portfolio/scan/PortfolioScanCard.tsx` — rail card (3 states: idle/loading/results)
- `src/components/portfolio/scan/ScanLoading.tsx` — pulsing rings + radar + orbits + Kuma + cycling subtext
- `src/components/portfolio/scan/ScanResults.tsx` — semicircle gauge + verdict pill + top findings + buttons
- `src/components/portfolio/scan/ScanFullReportModal.tsx` — modal with ring gauge, 2×2 dim grid, per-asset rows, commentary, actions
- `src/components/portfolio/scan/NewsForYouCard.tsx` — daily news rail card
- `src/components/portfolio/scan/portfolioHash.ts` — browser SubtleCrypto sha256 of sorted (symbol, amount)

### Modify
- `src/components/ProDashboard.tsx` — wrap Holdings + new rail in a 2-col grid (≥1200px), single-col below
- `src/components/ProDashboardV2.tsx` — mirror change (do AFTER v1 works)
- `.env.local` / `.env.production.local` — add `N8N_PORTFOLIO_SCAN_WEBHOOK_URL` + `N8N_WEBHOOK_SECRET`

### Already exists, reuse
- `src/components/portfolio/KumaBear.tsx` — bear SVG (don't redraw, design says reuse)
- `src/components/portfolio/KumaInline.tsx` — inline bubble
- `src/components/portfolio/kuma-phases.ts` — phase metadata

---

## 6. n8n workflows

### 6.1 New workflow: `Kuma Portfolio Analyst`

**Nodes in order:**

1. **Webhook** (trigger)
   - HTTP method: POST
   - Path: `portfolio-scan` (note the auto-generated webhook URL)
   - Response Mode: **"Using Respond to Webhook node"** (critical — must be sync)

2. **IF node** (auth)
   - Check `{{ $json.headers['x-webhook-secret'] }}` === your secret
   - If false → branch to Respond node with 401

3. *(optional, v2)* **HTTP Request** → CoinGecko `/coins/markets?ids=…` per symbol to enrich with market cap / sector. Skip in v1.

4. **AI Agent** (Gemini)
   - Model: `gemini-3-flash-preview` (same as chat)
   - System prompt: see §6.3 below
   - User message: `Holdings: {{ JSON.stringify($json.body.holdings) }}\nTotal USD: {{ $json.body.totalValue }}`
   - Output parser: structured JSON (paste schema from §4.2) OR rely on the prompt's "ONLY JSON" rule + repair in step 5

5. **Code node** (validation safety net)
   ```js
   const LEVELS = ['low','medium','high'];
   const out = $input.first().json;
   const clamp = v => LEVELS.includes(v) ? v : 'medium';
   out.overall = out.overall || {};
   out.overall.level = clamp(out.overall.level);
   out.overall.score = Math.max(0, Math.min(100, +out.overall.score || 50));
   out.dimensions = (out.dimensions || []).map(d => ({ ...d, level: clamp(d.level) }));
   out.assets     = (out.assets     || []).map(a => ({ ...a, level: clamp(a.level) }));
   out.actions    = (out.actions    || []).slice(0, 4);
   out.scannedAt  = out.scannedAt || new Date().toISOString();
   return [{ json: out }];
   ```

6. **Respond to Webhook** — returns the JSON object (Response Body: `{{ $json }}`, Content Type: `application/json`)

### 6.2 New workflow: `Kuma News Tagger` (Phase 5)

**Trigger:** Schedule, every 8h (or daily 8AM)
**Steps:** Pull news (CryptoPanic / your `news` collection) → for each: LLM tags `symbol` + `sentiment` + writes a 1-line summary → write to `daily_news/{yyyy-mm-dd}/items/{id}`.

### 6.3 Agent system prompt (paste verbatim into the AI Agent node)

```
You are Kuma, a friendly but sharp crypto risk analyst inside the Kumami app.

You receive a user's crypto portfolio: each holding has a symbol, amount, USD value, % allocation,
and 24h change. Analyze the portfolio's RISK and respond with ONLY valid JSON (no markdown, no prose
outside the JSON) matching this schema:

{
  "scannedAt": ISO-8601 string,
  "overall": {
    "score": integer 0-100 where HIGHER = RISKIER,
    "level": "low" | "medium" | "high",
    "label": short pill text e.g. "High Risk",
    "headline": one punchy sentence
  },
  "dimensions": [
    { "key": "concentration"|"diversification"|"volatility"|"liquidity",
      "level": "low"|"medium"|"high",
      "value": short string e.g. "99.8% in 2 coins" }
  ],
  "assets": [
    { "symbol": string, "level": "low"|"medium"|"high", "note": short string }
  ],
  "actions": [ 2-3 short, concrete suggested moves as plain strings ],
  "commentary": 2-4 warm sentences in Kuma's voice (a friendly bear; may end with 🐾)
}

Rules:
- "level" must be EXACTLY one of "low", "medium", "high". Never invent other values.
- Always include all 4 dimensions: concentration, diversification, volatility, liquidity.
- Judge concentration (over-weight in one asset), diversification (sectors/# of meaningful holdings),
  volatility (beta / meme / newer-token exposure), and liquidity (how easily positions can be exited).
- Be specific to THIS user's real numbers and coins (quote their allocations).
- Score reflects overall RISK, not performance. A hyper-concentrated bag is high even if it's up.
- "commentary", "note", and "actions" are where you're conversational and specific; everything else
  stays strictly structured.
- Never give buy/sell or price-target advice. Frame moves as risk awareness ("consider", "spread into").
- This is educational, not financial advice.
- If holdings is empty, return overall.level "low", one action: "Add your first asset to get a real scan.",
  and a friendly welcome commentary.
```

---

## 7. Visual / interaction spec (from the HTML prototype)

Read `scratchpad/design/design_handoff_portfolio_ai_scan/Portfolio AI Scan v2.dc.html` for the canonical mockup.

**Layout (≥1200px):** `grid-template-columns: minmax(0,1fr) 408px`. Right rail is `position: sticky; top: 20px`.
**Below 1200px:** single column, rail stacks under holdings, `position: static`.

**Idle card:** mint+purple gradient tile with sheen sweep, centered Kuma bear (56px), title "Let Kuma scan your bag", subtext "Risk score · concentration · what to do next — about 5 seconds.", full-width mint button "⚡ Scan my portfolio". Footer: "Last scanned: {time | never}".

**Loading card:** centered concentric pulsing rings (mint + purple, 0.9s stagger), conic radar sweep (1.7s), dashed slow-spin ring (8s), two orbiting coin dots (HYPE 2.7s, BTC 3.5s reverse), Kuma bear (64px) bobbing (2.6s). Below: "Kuma is reading your bag" + cycling subtext every 720ms through:
- "Reading N holdings…"
- "Checking concentration…"
- "Pulling 24h market data…"
- "Scoring volatility…"
- "Asking Kuma to summarize…"

Then 3 shimmer skeleton bars (100%, 78%, 60% widths).

**Results card:** semicircle SVG gauge (green→amber→red gradient arc, growArc 1.1s, needle swing 1.1s), score number colored by level. Verdict pill + headline. Up to 3 top finding rows (colored dot + label + value). "View full report ›" mint button. Footer: "Scanned 9:14 AM" + "↻ Re-scan" text button.

**Full report modal:** centered 560px card, max 92vh scroll, overlay `rgba(5,6,9,0.78) + backdrop-blur(3px)`. Header: Kuma bear 34px + "Portfolio Risk Report" + subline `{N} assets · ${total} · {time}` + ✕. Hero block: circular ring gauge (140px) + verdict pill + headline + 1 sentence context. "Risk breakdown" 2×2 grid of 4 dimension cards. "Per-asset risk" list (logo + symbol + note + level pill). Purple-tinted commentary block with Kuma bear. "Suggested moves" numbered list. Footer: "Got it" + "↻ Re-scan" + disclaimer "Kuma AI · educational, not financial advice".

**Animations (critical):**
- Entrance: **transform-only fadeUp** (translateY 12px→0, 0.5s). **Never animate opacity to 0 in entrance** — paused tabs can pin it invisible (real bug fixed in prototype).
- Modal: transform-only modalIn (translateY 18px + scale .98→1, 0.42s cubic-bezier(.34,1.2,.5,1))
- Gauge: stroke-dashoffset + rotation, forwards fill, 1.1–1.2s
- Loading: pulseRing/spinSlow/orbit/radarSweep/shimmer/kpBob — all looping

**Colors:** mint `#96EDD6`, low `#4ade80`, medium `#FACC15`, high `#f87171`, kuma purple `#A78BFA`, page `#08090c`, card `#0c0d12`, modal `#101218`.

**Empty portfolio:** hide the scan CTA, show "Add assets to scan".
**API error:** friendly retry card "Kuma couldn't finish the scan — try again". Keep last successful result if present.
**Stale portfolio:** if `currentHash !== lastScan.portfolioHash` → banner: "You changed your portfolio since this scan — re-scan for fresh insight."

---

## 8. Implementation phases

### Phase 0 — Setup (USER actions, no code) · STATUS: [ ]

User does these once; then we wire env vars.

- [ ] **0.1** Open n8n, decide where the new workflow lives (same instance as `Kuma AI Agent`)
- [ ] **0.2** Confirm n8n base URL and that it's reachable from your deployed Next.js host
- [ ] **0.3** Generate a long random secret for `N8N_WEBHOOK_SECRET` (e.g. `openssl rand -hex 32` or any password generator)
- [ ] **0.4** Confirm Gemini API credentials in n8n are working (they already are — chat uses them)

**Acceptance:** secret string in hand, n8n login confirmed.

### Phase 1 — n8n workflow · STATUS: [ ]

- [ ] **1.1** In n8n, create new workflow "Kuma Portfolio Analyst"
- [ ] **1.2** Add Webhook node (POST, path `portfolio-scan`, Response Mode: "Using Respond to Webhook node")
- [ ] **1.3** Copy the webhook URL — looks like `https://<n8n-host>/webhook/<id>` (we need this for env)
- [ ] **1.4** Add IF node checking `{{ $json.headers['x-webhook-secret'] }}` equals your secret
- [ ] **1.5** Add AI Agent node (Gemini, system prompt from §6.3), connect Gemini credentials
- [ ] **1.6** Add Code node with validation snippet from §6.1 step 5
- [ ] **1.7** Add Respond to Webhook node returning `{{ $json }}` as JSON
- [ ] **1.8** Activate the workflow
- [ ] **1.9** Test from n8n UI with a hand-crafted payload (sample below). Verify response matches §4.2 schema

Test payload:
```json
{
  "userId": "test-uid",
  "currency": "USD",
  "totalValue": 100000,
  "holdings": [
    { "symbol": "BTC", "amount": 1.5, "valueUsd": 90000, "allocationPct": 90, "change24h": 1.2 },
    { "symbol": "ETH", "amount": 3,   "valueUsd": 10000, "allocationPct": 10, "change24h": 2.1 }
  ]
}
```

**Acceptance:** posting that payload returns valid JSON matching §4.2 with all 4 dimensions present and all `level`s ∈ {low, medium, high}.

### Phase 2 — Env wiring (USER + me) · STATUS: [ ]

- [ ] **2.1** Add to `.env.local`:
  ```
  N8N_PORTFOLIO_SCAN_WEBHOOK_URL=https://<your-n8n-host>/webhook/<id>
  N8N_WEBHOOK_SECRET=<the long secret from 0.3>
  ```
- [ ] **2.2** Restart dev server (`npm run dev`) to pick env vars

**Acceptance:** `console.log(process.env.N8N_PORTFOLIO_SCAN_WEBHOOK_URL)` from a server file prints the URL.

### Phase 3 — Next.js API route · STATUS: [x] code written, needs env (Phase 2) to test

- [x] **3.1** Created `src/app/api/portfolio-scan/route.ts` — proxies to n8n, validates, clamps `level`, max duration 60s
- [ ] **3.2** Test via curl/Postman after Phase 2 env is set: `POST /api/portfolio-scan` with body from §4.1 → expect §4.2 response
- [ ] **3.3** Verify defensive `level` clamping by deliberately corrupting the n8n response (temporarily)

**Acceptance:** `curl -X POST localhost:3000/api/portfolio-scan -H 'content-type: application/json' -d @sample.json` returns valid `ScanResult` in <30s.

### Phase 4 — Frontend rail + scan flow · STATUS: [x] code written, needs Phases 0–2 to function

- [x] **4.1** `src/components/portfolio/scan/types.ts` — `ScanResult`, `RiskLevel`, colour maps
- [x] **4.2** `src/components/portfolio/scan/portfolioHash.ts` — sha256 via SubtleCrypto
- [x] **4.3** `ScanLoading.tsx`, `ScanResults.tsx`, `ScanFullReportModal.tsx`, `PortfolioScanCard.tsx`
- [x] **4.4** `NewsForYouCard.tsx` (stub with empty state — wire data in Phase 6)
- [x] **4.5** Edited `ProDashboard.tsx` PortfolioTab: 2-col grid (`min-[1200px]` arbitrary breakpoint) with sticky rail
- [ ] **4.6** Verify in dev (after Phases 0–2): click "Scan my portfolio" → loading → results → "View full report" → modal

**Acceptance:** end-to-end click → loading → result render in browser, with real n8n response data. Modal opens/closes. No console errors.

### Phase 5 — Persistence + stale banner · STATUS: [x] code written

- [x] **5.1** On successful scan: writes `users/{uid}.lastPortfolioScan = { result, portfolioHash, totalValueAtScan }`
- [x] **5.2** On mount: reads `lastPortfolioScan` from `userData`, shows prior result immediately
- [x] **5.3** Computes current portfolio hash; shows stale banner above scan card on mismatch
- [x] **5.4** Re-scan from anywhere (rail button, banner, modal) triggers fresh scan

**Acceptance:** refresh the page after a scan and the prior result is visible immediately. Edit the portfolio → banner appears.

### Phase 6 — News tagger (n8n) + News card data · STATUS: [ ]

- [ ] **6.1** Build `Kuma News Tagger` workflow (§6.2) on a cron
- [ ] **6.2** Backfill last 7 days of news
- [ ] **6.3** Wire `NewsForYouCard` to query `daily_news` filtered by user symbols
- [ ] **6.4** Empty state if no relevant news in 24h

**Acceptance:** holders of BTC see BTC-tagged news; click → opens source URL in new tab.

### Phase 7 — Mirror to ProDashboardV2 + polish · STATUS: [ ]

- [ ] **7.1** Mirror Phase 4 changes into `ProDashboardV2.tsx` PortfolioTab
- [ ] **7.2** Error / empty / loading state polish
- [ ] **7.3** Mobile responsive verification
- [ ] **7.4** A11y: focus states on Scan/Re-scan/modal, contrast on level colors
- [ ] **7.5** Production env vars set
- [ ] **7.6** Smoke test on production with a real Pro account

**Acceptance:** feature is live on `/pro` for Pro users with no console errors.

---

## 9. Testing

- **Unit**: portfolio hash determinism, `level` clamping, payload shape
- **Integration**: route handler → n8n round trip (mock n8n with msw or hit real)
- **Manual**:
  - Empty portfolio → CTA replaced with "Add assets to scan"
  - 1-asset portfolio → extreme concentration → high overall score
  - 10+ assets → balanced → low/medium score
  - Slow network (Chrome throttling) → loading state holds
  - Double-click Scan → coalesced (button disabled during loading)
  - n8n down → friendly error card; last scan still visible
  - iOS Safari + Android Chrome at <1200px → rail stacks correctly

## 10. Risks

| Risk | Mitigation |
|---|---|
| n8n returns malformed JSON | Code node in n8n + route clamps `level` and provides defaults |
| LLM says "buy X / sell Y" | System prompt forbids; optional post-hoc regex flag in route |
| Scan timeout (>30s) | Loading state shows "Taking longer than usual…" at 25s |
| Webhook URL leak | URL is server-side only; never exposed to browser |
| Secret rotation | Update env var in both Next + n8n IF node |

## 11. Reference

- HTML prototype: `scratchpad/design/design_handoff_portfolio_ai_scan/Portfolio AI Scan v2.dc.html`
- Design notes: `scratchpad/design/design_handoff_portfolio_ai_scan/README.md`
- n8n setup: `scratchpad/design/design_handoff_portfolio_ai_scan/N8N_SETUP.md`
- Existing chat pattern: `src/components/KumaAIChatTab.tsx` (~L781)
- Existing n8n workflow: `C:\Users\Andrew\Downloads\Kuma AI Agent.json`
- Live PortfolioTab: `src/components/ProDashboard.tsx` (~L159)

## 12. How to resume

1. Open this file
2. Find lowest-numbered phase with `STATUS: [ ]`
3. Work the checklist top to bottom
4. Update STATUS to `[x]` when acceptance criteria pass
5. Commit doc changes alongside code
