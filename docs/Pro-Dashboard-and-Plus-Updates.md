# Kumami World — Pro Dashboard & Plus Updates

**A stakeholder walkthrough of what's new in the Pro dashboard and what's been adjusted in Plus.**

_Last updated: 2 Sep 2026 · Environment: production (`kumami-6df47`)_

---

## 1. The big picture (30 seconds)

Kumami World has three tiers, switched from the sidebar mode toggle:

| Tier | Who | What it is |
|------|-----|-----------|
| **Basic** | Everyone | News, education, games, blogs — the free product |
| **Plus** | Freemium market tier | The live **market platform**: Console, On-Chain Insights, Intelligence, Watchlist |
| **Pro** | Premium subscribers | The full **Pro dashboard** — 18 tabs of curated intelligence, tools and content |

This update covers two things:

1. **Pro dashboard — built out** from a 5-tab shell into the full **18-tab** product, with an **admin authoring system** so our team can publish content directly, and every tab wired to **real data** (no placeholder/mock content anywhere).
2. **Plus — hardened** with the live CoinGlass data integration, a strict "real-data-or-honest-empty" pass, two new market panels, and guided in-app product tours.

---

## 2. Pro Dashboard — what's new

### 2.1 From 5 tabs to 18

The Pro dashboard now has 18 tabs, grouped by purpose. Each falls into one of three states:

- 🟢 **Live** — fully working with real data today.
- 👤 **Personal** — real, per-user data (saved to the user's account, syncs across devices).
- 🟡 **Needs market-data feed** — designed and in the nav, shows a clear "coming soon" panel until we connect the external market/analytics provider.

| # | Tab | State | What it does |
|---|-----|-------|--------------|
| 1 | **Daily Digest** | 🟢 Live | The landing tab — a live roll-up of the newest items across the other tabs (research, news, calendar, airdrops, alpha), each linking through. |
| 2 | **Following & Alerts** | 👤 Personal | The user's followed items + custom price/volume/sentiment alerts, built from a simple form. Saved to their account. |
| 3 | **Smart Money Tracker** | 🟡 Feed | Wallet-level flow of top-PnL addresses. Needs the on-chain analytics provider. |
| 4 | **Coin/Token Tracker** | 🟡 Feed | Deep per-token analytics + custom metric alerts. Needs the market-data provider. |
| 5 | **Liquidation Heatmap** | 🟡 Feed | Where leverage is stacked and likely cascade levels. Needs CoinGlass. |
| 6 | **Watchlist** | 👤 Personal | The tickers a user chooses to track, saved to their account. Live prices arrive with the market-data feed. |
| 7 | **Security Scanner** | 🟡 Feed | Contract/wallet risk scoring. Needs the security-data provider. |
| 8 | **Airdrops & Whitelist** | 🟢 Live | Curated drops & whitelist access, each with an eligibility checklist, deadline and a Follow button. Team-authored. |
| 9 | **AI Portfolio** | 🟢 Live | The existing portfolio manager (unchanged). |
| 10 | **Market Cap Comparison** | 🟢 Live | The existing market-cap tool (unchanged). |
| 11 | **Real-Time News** | 🟢 Live | Headlines with timestamp + sentiment, newest first. Team-authored now; an automated news feed can write into the same place later. |
| 12 | **Alpha Room** | 🟢 Live | Real-time curated alpha as a chat feed (restyled). Reads the live `alphaRoom` data. |
| 13 | **Fear & Greed** | 🟡 Feed | Multi-factor sentiment composite. Needs CoinGlass. |
| 14 | **Kumami Research** | 🟢 Live | KOL-led calls, each with a stated position, asset and a "what this means for you" note. Team-authored. |
| 15 | **Calendar** | 🟢 Live | Economic & on-chain events (macro prints, unlocks, upgrades) on a real month grid. Team-authored. |
| 16 | **Events & Announcements** | 🟢 Live | Live-streamed sessions (YouTube embed) with a Live-now badge, realtime audience Q&A, and replays. Team-authored. |
| 17 | **Market Analysis** | 🟢 Live | The existing market-analysis reader (unchanged). |
| 18 | **Kuma AI Chat** | 🟢 Live | The existing AI assistant tab (unchanged). |

**Bottom line:** 13 of 18 tabs are working with real data today. The remaining 5 are the ones that genuinely depend on an external market/analytics data provider — they're designed, navigable, and clearly labelled until that feed is connected.

### 2.2 The admin authoring system (how our team publishes)

The five team-authored tabs (Research, Airdrops, Calendar, Real-Time News, Events) each have a **matching page in the Admin panel** (`/admin`), under a new **"Pro Dashboard"** section:

| Admin page | Publishes to tab |
|------------|------------------|
| `/admin/pro-research` | Kumami Research |
| `/admin/pro-airdrops` | Airdrops & Whitelist |
| `/admin/pro-calendar` | Calendar |
| `/admin/pro-news` | Real-Time News |
| `/admin/pro-events` | Events & Announcements |

Every page works the same way, so there's **one thing to learn**:

- Fill the form → **Publish** (goes live immediately) or **Save Draft** (stays hidden from users).
- A list of existing items sits below the form, each with **Edit** and **Delete**.
- **Drafts never appear on the Pro tab** — only published items do.
- Changes appear on the user-facing tab in **real time** (no refresh needed).

This means non-technical team members maintain all Pro content themselves, with no engineering involvement.

### 2.3 How it works (plain-English architecture)

- **Storage:** Each content type is a collection in Firebase (`pro_research`, `pro_airdrops`, `pro_calendar`, `pro_news`, `pro_events`). Personal data (follows, alerts, watchlist) is saved under the user's own account.
- **Security:** A single rule covers all Pro content — **anyone can read published content, only admins can write it.** Personal data is readable/writable **only by its owner.** Event Q&A can be posted/upvoted by any signed-in user.
- **Live updates:** Tabs subscribe to their data, so a publish/edit/delete shows up instantly for users who have the tab open.
- **No placeholders:** The old sample/mock data was removed entirely. Empty tabs show an honest "No … yet" message rather than fake content.

---

## 3. Plus — what's been adjusted

Plus is the freemium **market platform** (Console, On-Chain Insights, Intelligence, Watchlist). Recent work focused on trust and depth:

- **Basic / Plus / Pro rebrand** — the tier names and collapsible sidebar were rolled out across the app.
- **Live CoinGlass integration** — Plus market products are wired to a real data provider (replacing the earlier mock provider seam).
- **"Real data or honest empty" pass** — the mock/placeholder data provider was **removed entirely**. Where a metric has no data, the UI now shows a clear "—" instead of a misleading `$0 / 0%`, and panels load until real data is ready rather than flashing fake numbers.
- **New market panels** — a **Spot Pulse** panel (built to the product spec) and a **Whale Position Tracker** with a signal diagnostic.
- **Data transparency** — help tooltips explain how each metric is derived; the underlying provider name is hidden from the public sources line.
- **Guided in-app product tours** — spotlight walkthroughs were added to the **Console, On-Chain, Intelligence and Watchlist** so first-time Plus users get a guided tour of each surface.

_Net effect: Plus went from a mock-data prototype to a live, trustworthy market platform with a guided first-run experience._

---

## 4. How a tester validates all this

The core test for every Pro content tab is the same round trip: **add it in the admin dashboard → confirm it appears correctly on the Pro tab → confirm drafts stay hidden.** Detailed, copy-paste test scripts live in the repo under **`testing/pro/<tab>/how-to-test.md`** (indexed in `testing/README.md`).

### 4.1 Prerequisites
- Sign in with an **admin / superadmin** account (it can both author content and view the Pro dashboard).
- Run the app locally (`npm run dev` → `http://localhost:3000`) or use the deployed site.

### 4.2 Guided test tour (Kumami Research — the template for all content tabs)
1. Go to **`/admin/pro-research`**.
2. Fill the form — analyst name, role, position (long/short/neutral), asset, the call, "what this means for you" — and click **Publish**.
3. Add a second one and click **Save Draft** instead.
4. Open **`/world/pro?tab=research`**.
   - ✅ The **published** call appears as a card (position badge, timestamp, "what this means" box).
   - ✅ The **draft does not appear**.
5. Back in admin, **Edit** the published one → it updates on the tab in real time. **Delete** the draft → it's gone.

The same five steps apply to **Airdrops, Calendar, Real-Time News and Events** — just different fields (Events additionally has a YouTube embed, a Live-now toggle, and audience Q&A where any signed-in user can submit and upvote questions).

### 4.3 Personal tabs
- **Following & Alerts:** build an alert, reload the page → it's still there (saved to the account). Follow an item from another tab → it shows here.
- **Watchlist:** add a ticker, reload → still there. (Prices show "—" until the market-data feed lands.)

---

## 5. QA status (verified live on production)

| Flow | Status | Notes |
|------|--------|-------|
| Kumami Research — admin publish → Pro tab, draft hidden | ✅ Verified live (browser) | Full round trip confirmed in-browser on prod |
| Following & Alerts — build alert → persists across reload | ✅ Verified live (browser) | Per-user save confirmed on prod |
| Airdrops / Calendar / Real-Time News — data + rendering path | ✅ Data verified + content seeded | Real content written & read back on prod; tabs now populated; UI is the identical proven pattern |
| Events & Announcements (+ Q&A subcollection) | ✅ Data verified + content seeded | Live event + 3 Q&A questions seeded & read back; admin-side proven pattern |
| Event Q&A — submit/upvote by a normal (non-admin) user | ⏳ Pending live click | The one rule path not yet exercised live (deployed + compiled); needs a browser session |
| All 18 tabs render; production build | ✅ Compiles clean | Typecheck + lint + build all pass |

_"Verified live (browser)" = clicked through end-to-end in the browser on prod. "Data verified + content seeded" = real documents written to prod via the Admin SDK and read back with correct field shapes, and the tab's rendering path is byte-identical to a flow already verified live. The only path still needing a live browser click is a **non-admin** user posting/upvoting an event question._

**Seeded starter content (prod):** the Pro tabs are populated with real, presentable content so the dashboard demos well immediately. Everything is editable/deletable by the team in `/admin/pro-*`.

---

## 6. What's left (needs an external data provider)

These are the only pieces not buildable in-house — they require connecting a market/on-chain analytics provider:

- **Smart Money Tracker** (wallet-level flow)
- **Coin/Token Tracker** (per-token analytics)
- **Liquidation Heatmap** (CoinGlass)
- **Security Scanner** (contract/wallet risk)
- **Fear & Greed** (CoinGlass)
- **Watchlist live prices** and the **Daily Digest** smart-money/sentiment line

All are already placed in the product, clearly labelled, and will light up once the feed is connected — no further UI work needed to switch them on.
