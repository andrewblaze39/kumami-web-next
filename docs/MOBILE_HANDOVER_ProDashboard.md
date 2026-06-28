# Mobile Handover — Pro Dashboard

**For:** Kumami mobile app developer
**Scope:** Port the Pro Dashboard UI revamp to mobile — Portfolio + AI Portfolio Scanner + (placeholder) News for Your Bag. Other tabs (Alpha Room, Market Analysis, Kuma AI Chat, Market Cap Tool) listed for context but not in scope for v1.
**Source app:** `kumami-web-next` (Next.js / React / TypeScript / Firebase). Paths below are relative to its root.
**Date:** 2026-06-27
**Companion docs:**
- `docs/MOBILE_HANDOVER_Education.md` — sister handover for the Education feature
- `docs/PRD_AI_Portfolio_Scan.md` — full design + decisions for the AI scan feature
- `docs/PORTFOLIO_SCAN_SETUP.md` — how the n8n + API route plumbing was set up

---

## 1. What the Pro Dashboard is

A signed-in, Pro-only area where users see:

1. **AI Portfolio** (in scope) — their crypto holdings as a balance card + donut chart + holdings list, plus a sticky right-rail with the new **AI Portfolio Scanner** (on-demand AI risk analysis) and **News for Your Bag** (daily portfolio-aware news, currently a placeholder).
2. **Alpha Room** (not in scope) — chat-style room for premium drops
3. **Market Analysis** (not in scope) — curated market insights
4. **Kuma AI Chat** (not in scope) — AI chat assistant — see [§7](#7-kuma-ai-chat-context-only) for the data shape if you want to port later
5. **Market Cap Tool** (not in scope) — calculator for "what if X had Y's market cap"

The mobile revamp v1 only covers the **AI Portfolio** tab including the new scanner.

---

## 2. Auth & gating

- Gated behind `isPremium === true` on the user doc — web uses `<ProOnlyRoute>` wrapper
- If user is not signed in → push to login
- If signed in but not Pro → push to upgrade screen / show paywall
- Web reads `userData.isPremium` from `users/{uid}` (subscribed via Firestore listener in `AuthContext`)

```
users/{uid}.isPremium: boolean   // controls all Pro-only access
users/{uid}.role: 'user' | 'admin' | 'superadmin'   // unrelated to Pro
```

---

## 3. Data model

### 3.1 User's portfolio — `users/{uid}.cryptoPortfolio` (array field)

Stored directly on the user document.

```ts
interface PortfolioCoin {
  name: string             // symbol — "BTC", "ETH", "HYPE"
  coinId: string | null    // CoinGecko ID — "bitcoin", "ethereum"
  value: number            // USD value at last price (live, recomputed each load)
  unitNum: number          // quantity held (e.g. 1.5)
  logo: string | null      // coin logo URL (typically from CoinGecko)
  pricePerUnit: number     // price per unit USD at last refresh
  change24h?: number       // % change last 24h
  addedAt?: number         // ms timestamp when first added
  addedValue?: number      // USD value at time of adding (for P&L)
}
```

Reads & writes:
- **Read:** subscribe to `users/{uid}` doc → `cryptoPortfolio` field
- **Write:** `updateDoc(userDocRef, { cryptoPortfolio: [...newArray] })`
- Firestore rule allows user to update their own user doc — no rules change needed

### 3.2 Latest scan — `users/{uid}.lastPortfolioScan` (object field, new)

Cached scan result so the UI shows the last analysis instantly on revisit.

```ts
interface CachedScan {
  result: ScanResult              // see §4.2 for shape
  portfolioHash: string           // sha256 of sorted (symbol, amount) pairs at scan time
  totalValueAtScan: number
}
```

Only the latest scan is stored — each new scan overwrites. No history collection.

### 3.3 Live prices — CoinGecko

Web hits `/api/coingecko/markets?per_page=100&page=1` (a Next.js route that proxies CoinGecko). Mobile can either:
- Hit CoinGecko directly: `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1`
- Or have the backend expose a public proxy (cheaper, avoids CoinGecko rate limits across users)

CoinGecko response shape (per coin):
```ts
{
  id: string                              // "bitcoin"
  symbol: string                          // "btc" (lowercase)
  current_price: number
  price_change_percentage_24h: number
  image: string                           // logo URL
  // ...lots more
}
```

Map by `symbol.toUpperCase()` to find the user's holdings.

---

## 4. AI Portfolio Scanner — the new feature

### 4.1 Architecture (already wired on backend)

```
Mobile app                    Next.js route                          n8n workflow             Gemini LLM
─────────                     ────────────────                       ──────────────           ──────────
[Scan button] ─POST /api/portfolio-scan─▶ src/app/api/portfolio-scan/route.ts
                                          │ proxies → n8n production webhook
                                          │ validates response (clamps "level" enum)
                                          ▼
                                       n8n: Webhook → AI Agent → Validate & Repair → Respond
                                                                                  ▲ Gemini call here
              ◀─────── ScanResult JSON ───
[Render gauge + dimensions + ...]
```

Mobile must call **the Next.js route**, not n8n directly. The Next.js route hides the webhook URL and clamps malformed responses. The endpoint runs synchronously and returns within 5–15s (LLM call time).

**Endpoint:** `POST {YOUR_NEXT_BASE_URL}/api/portfolio-scan`
**Body:** see §4.3
**Response:** see §4.2

### 4.2 Response schema — `ScanResult`

This drives all the visual output. **`level` is always exactly `"low" | "medium" | "high"`** — the UI color-switches on it.

```ts
type RiskLevel = 'low' | 'medium' | 'high'

interface ScanResult {
  scannedAt: string                                   // ISO-8601
  overall: {
    score: number                                     // 0–100, HIGHER = riskier
    level: RiskLevel
    label: string                                     // "High Risk" — pill text
    headline: string                                  // 1 sentence, e.g. "Almost everything rides on HYPE + BTC."
  }
  dimensions: Array<{                                 // always 4: concentration, diversification, volatility, liquidity
    key: 'concentration' | 'diversification' | 'volatility' | 'liquidity'
    level: RiskLevel
    value: string                                     // short note, e.g. "99.8% in 2 coins"
  }>
  assets: Array<{                                     // one per holding
    symbol: string                                    // "BTC"
    level: RiskLevel
    note: string                                      // e.g. "Blue-chip anchor, balances HYPE"
  }>
  actions: string[]                                   // 2–3 plain string suggestions
  commentary: string                                  // 2–4 warm sentences in Kuma's voice
}
```

**Color mapping (use these exact hex values to stay on-brand):**

| Level | Hex | Meaning |
|---|---|---|
| `low` | `#4ade80` | Green — good |
| `medium` | `#FACC15` | Amber — watch |
| `high` | `#f87171` | Red — bad |

### 4.3 Request body

```ts
interface ScanRequest {
  userId?: string                              // optional, for logs
  currency: 'USD'
  totalValue: number                           // sum of holdings.valueUsd
  holdings: Array<{
    symbol: string                             // "BTC"
    amount: number                             // 1.5
    valueUsd: number                           // 90000
    allocationPct: number                      // 0–100, % of totalValue
    change24h: number                          // % 24h price change
  }>
}
```

Build this from the live-priced `PortfolioCoin[]` array before sending.

### 4.4 Stale-portfolio detection

On each scan, compute a hash of the holdings:

```
hash = sha256(JSON.stringify(
  holdings.map(h => [h.symbol.toUpperCase(), h.amount]).sort()
))
```

Store it alongside the scan result. On next page load, recompute current portfolio's hash; if it differs from the stored hash, show a yellow banner: **"Portfolio changed since this scan — re-scan for fresh insight."**

Hash uses only `symbol` + `amount` — not price — because prices always change.

### 4.5 UI components (web reference — re-implement natively)

| Component | File | Purpose |
|---|---|---|
| Scan card (3 states: idle / loading / results / error) | `src/components/portfolio/scan/PortfolioScanCard.tsx` | Top-level orchestrator |
| Idle CTA (gradient tile + bear + "⚡ Scan my portfolio" button) | (inside PortfolioScanCard) | Entry point |
| Loading animation (pulsing rings, radar, orbits, bear, cycling status) | `src/components/portfolio/scan/ScanLoading.tsx` | While LLM is running |
| Results card (semicircle gauge + verdict pill + top findings + buttons) | `src/components/portfolio/scan/ScanResults.tsx` | Compact summary in rail |
| Full report modal (ring gauge + 2×2 breakdown + per-asset + commentary + actions) | `src/components/portfolio/scan/ScanFullReportModal.tsx` | Tapping "View full report ›" |
| Stale banner | (inside PortfolioScanCard) | When portfolioHash differs |
| Disclaimer banner | (inside ScanResults + Modal) | Amber warning: "Kuma AI can make mistakes…" |

**Mobile UX adaptation:**
- On phones, drop the sticky right rail (which is web-only). Stack the scan card below the holdings list.
- The full report modal on web is a centered overlay; on mobile, make it a full-screen sheet that slides up.
- The semicircle gauge animation is `stroke-dashoffset` based — use SVG (React Native has `react-native-svg`). Match the animation timing (~1.1s growArc, ~1.1s needle swing).
- Loading animation has 5+ stacked SVG animations — can simplify to 1-2 + cycling text without losing the feel.
- See `docs/PRD_AI_Portfolio_Scan.md` §7 for full visual spec.

### 4.6 Disclaimer — must include

Both the results card and the full report show an amber warning. Required copy (don't paraphrase):

> ⚠ Kuma AI can make mistakes. This is educational risk analysis, not financial advice — always verify with your own research before making any moves.

Compliance / legal reason — keep it visible, amber, near the result.

### 4.7 Persisting the result

After a successful scan, write to `users/{uid}.lastPortfolioScan` (§3.2). Web code reference: `src/components/portfolio/scan/PortfolioScanCard.tsx:107-117`. Fire-and-forget — don't await; show UI immediately.

On next mount of the portfolio screen, read `userData.lastPortfolioScan` and if present, render the cached result immediately (no loading flash). Then compute current hash; if mismatched, show the stale banner.

---

## 5. News for Your Bag — placeholder for now

A second card below the scan card in the rail. **Currently a stub** — web shows an empty state ("Daily picks coming soon — we'll surface market-moving stories filtered to the coins you hold").

Mobile should:
- Render the empty state placeholder
- Wire the future Firestore query when the data lands (described below)

### 5.1 Future data shape (target — confirm before building)

Backend plan: a scheduled n8n cron tags each article in the `news` Firestore collection with `relevantSymbols: string[]` and a 1-sentence `kumaTake` summary. Then mobile queries:

```
collection('news')
  .where('relevantSymbols', 'array-contains-any', userPortfolioSymbols)
  .orderBy('createdAt', 'desc')
  .limit(20)
```

Each item also gets a `sentiment: 'bullish' | 'watch' | 'bearish'` field that drives a left-border color (green/amber/red).

For v1 mobile: render the empty state. When backend lands (Phase 6 of the PRD), wire the query. See `docs/PRD_AI_Portfolio_Scan.md` §1.2, §4.3, §6.2 for the full spec.

---

## 6. Portfolio Manager — exact behavior to replicate

### 6.1 Screen layout (web)

```
┌──────────────────────────────────────────────────────────────┐
│  Hero card                                                    │
│  ┌─ Balance ($total + 24h delta) + [+ Add] [↻ Refresh]       │
│  │   Kuma daily bubble (news teaser, optional)                │
│  │   Donut chart                                              │
└──────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────┬────────────────────────┐
│  Holdings list                       │  AI Portfolio Scan card│
│  (asset, price, 24h%, value, ⋯)     │  (idle/loading/results)│
│  Sort: Value / Name / Date Added    │                        │
│                                      │  News for Your Bag card│
│                                      │  (stub for now)        │
└─────────────────────────────────────┴────────────────────────┘
```

On mobile: stack vertically. Sort tabs work as pills.

### 6.2 Add / Edit / Delete holding

- **Add Asset** — opens a modal: search CoinGecko, pick coin, enter amount, submit. On submit:
  1. Fetch price from CoinGecko (`/coins/markets?ids={coinId}`)
  2. Compute `value = amount * price`
  3. Append to `cryptoPortfolio` array (or merge with existing coin of same symbol — add the amounts together)
  4. `updateDoc(userDocRef, { cryptoPortfolio: updatedArray })`

- **Edit Coin** — tap a coin in the holdings list → modal with current amount → save → updates the matching item in the array

- **Delete Coin** — confirm prompt → filter out by `name` (symbol) → write back

See `src/components/ProDashboard.tsx:260-357` for the full handler logic.

### 6.3 Refresh prices

Manual button (`↻ Refresh`) hits CoinGecko again, recomputes `value` and `change24h` for each holding. **Don't write the recomputed values back to Firestore on every refresh** — keep prices ephemeral in memory; the only writes happen on add/edit/delete. This matches web.

### 6.4 Donut chart

Web uses Recharts. On mobile use react-native-svg or victory-native. Colors come from a `useDominantColors` hook (extracts dominant color from each coin's logo) — for v1 mobile, just use fixed colors per coin (BTC orange, ETH blue, etc.). See web `cryptoLogos` map in `src/components/ProDashboard.tsx:68-79` for known coins.

---

## 7. Kuma AI Chat (context only — not in v1 scope)

If you port this later, it currently lives at the chat endpoint `https://api-h4o777ecua-uc.a.run.app/api/chat` (Cloud Run function). Web is mid-migration to a Next.js route — see `docs/PLAN_Migrate_Chatbot_To_Next_Routes.md`. Async pattern: app → function → n8n → callback to function → Firestore → frontend listener.

Data shape:
- `users/{uid}/chatrooms/{chatRoomId}` — chat rooms
- `users/{uid}/chatrooms/{chatRoomId}/messages/{messageId}` — messages (`role`, `message`, `timestamp`)

Rules already permit read/write for self (see `firestore.rules:311-323`).

---

## 8. Visual / brand tokens

Use these in mobile design system:

| Token | Hex | Use |
|---|---|---|
| Mint (primary) | `#96EDD6` | CTAs, accents |
| Page bg | `#08090c` | App background (dark) |
| Card bg | `#0c0d12` | Cards |
| Modal bg | `#101218` | Modals |
| Kuma purple | `#A78BFA` | AI commentary blocks |
| Low / good | `#4ade80` | Green |
| Medium / watch | `#FACC15` | Amber |
| High / bad | `#f87171` | Red |
| BTC | `#f7931a` |
| ETH | `#627eea` |
| SOL / POL | `#9945FF` / `#8247E5` |
| HYPE | `#0d9488` / `#14b8a6` |

**Font:** Lato (400 / 700 / 900). **Numbers:** monospace stack (`SF Mono`, `Menlo`).
**Radius:** cards 16–20, tiles 11–14, pills full-rounded (999).

---

## 9. Step-by-step build order

### Phase A — Read-only Portfolio
1. Auth check: signed in + isPremium → enter Pro Dashboard, else paywall
2. Subscribe to `users/{uid}.cryptoPortfolio` → render holdings list (symbol, value, %)
3. Pull live prices from CoinGecko → hydrate `value` + `change24h` per coin
4. Render donut chart of allocations
5. Pull-to-refresh re-hits CoinGecko

**Acceptance:** user sees their portfolio with up-to-date values.

### Phase B — Add / Edit / Delete
6. Add Coin modal — CoinGecko search + amount → write to Firestore
7. Tap-to-edit existing coin → modal with current values → save
8. Delete with confirm

**Acceptance:** full portfolio CRUD.

### Phase C — AI Portfolio Scan
9. "Scan my portfolio" button → POST to `/api/portfolio-scan` with the §4.3 body shape
10. Show loading animation (see web reference; can simplify)
11. On response: render the results card per §4.5 + persist to `users/{uid}.lastPortfolioScan`
12. Tap "View full report" → full-screen sheet with ring gauge + dimension grid + per-asset + commentary + actions
13. On mount: read `lastPortfolioScan`, render cached result if present
14. Compute portfolio hash; show stale banner if changed
15. Re-scan button anywhere re-runs the flow

**Acceptance:** scan works end-to-end, cached result returns instantly on next visit, stale banner appears when portfolio is edited.

### Phase D — News for Your Bag (stub)
16. Render the empty-state placeholder card
17. Wait on backend for the news tagger (PRD Phase 6); wire query when data lands

### Phase E — Polish
18. Pull-to-refresh on whole dashboard
19. Skeleton loaders during initial fetch
20. Disclaimer banner placed prominently per §4.6 (legal requirement)
21. Animation timing matches web (~1.1s gauge swing, ~0.4s sheet slide-in)

---

## 10. Required env / config on mobile

| Key | Where to get it | Use |
|---|---|---|
| Firebase config | Same as web — `google-services.json` (Android) / `GoogleService-Info.plist` (iOS) from Firebase console | Auth + Firestore |
| `NEXT_BASE_URL` (or whatever you call it) | Your Next.js deploy URL (e.g. `https://kumami.world`) | For calling `/api/portfolio-scan` |

The CoinGecko proxy at `/api/coingecko/markets` is also on the Next.js deploy — you can call it via the same base URL OR hit CoinGecko directly.

---

## 11. Things NOT to port for v1

- **Alpha Room** — separate feature, will get its own handover
- **Market Analysis** — content-heavy admin-curated section, not core
- **Market Cap Tool** — utility calculator, low priority
- **Kuma AI Chat** — currently in a migration mid-flight (web side); wait until that lands before porting
- **Admin panel** — desktop-only, don't touch
- **Sticky right-rail layout** — that's a web-specific affordance; mobile stacks vertically

---

## 12. Reference files in the web repo

Read in order:

1. `src/components/ProDashboard.tsx` — full PortfolioTab logic (~900 lines, the canonical reference)
2. `src/components/portfolio/scan/types.ts` — `ScanResult`, `RiskLevel`, color maps
3. `src/components/portfolio/scan/PortfolioScanCard.tsx` — scan orchestration + Firestore caching
4. `src/components/portfolio/scan/ScanResults.tsx` — rail results card
5. `src/components/portfolio/scan/ScanFullReportModal.tsx` — full report modal
6. `src/components/portfolio/scan/ScanLoading.tsx` — loading animation reference
7. `src/components/portfolio/scan/portfolioHash.ts` — hash util (use any sha256 lib on mobile)
8. `src/components/portfolio/scan/NewsForYouCard.tsx` — placeholder stub
9. `src/app/api/portfolio-scan/route.ts` — backend route handler (Next.js), don't port — just call it
10. `docs/PRD_AI_Portfolio_Scan.md` — full design / decisions / future phases
11. `docs/PORTFOLIO_SCAN_SETUP.md` — how n8n is wired (useful if backend changes)

---

## 13. Questions to confirm before starting

- Is mobile reusing the same Firebase project? (Yes — same `users/{uid}` data)
- Is mobile calling the same `/api/portfolio-scan` endpoint? (Yes — built to be shared)
- iOS, Android, or both first?
- For the donut chart and animations: any specific library you're using (Reanimated, Skia, etc.)?
- Are we showing the desktop AI Portfolio "hero card" balance + Kuma bubble layout, or simplifying for mobile?
- For News for Your Bag — do we want the stub visible in v1, or hide until backend ships?

Confirm before building. Don't guess on data shapes — the files above are the truth.
