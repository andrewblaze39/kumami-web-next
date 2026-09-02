# Kumami World — Release Notes (Plus & Pro)

_For leadership · 2 Sep 2026 · deployed to the **dev** branch/environment_

**Headline:** The **Pro dashboard** has grown from a 5-tab shell into the full **18-tab** product, with a self-serve **admin publishing system** so our team maintains all content with zero engineering help. **Plus** (the market platform) has been hardened into a live, trustworthy product. Real user data throughout — no mock/placeholder content.

---

## ✅ Ready now — Plus (market platform)

The freemium market tier — Console, On-Chain Insights, Intelligence, Watchlist:

- **Live market data** via the CoinGlass integration (replaced the old mock data).
- **Trust pass:** removed all placeholder/mock numbers — every metric is either real or shows an honest "—". Panels wait for real data instead of flashing fake values.
- **New panels:** Spot Pulse and a Whale Position Tracker with a signal diagnostic.
- **Guided product tours** (spotlight walkthroughs) on Console, On-Chain, Intelligence and Watchlist so new users learn each screen.
- **Basic / Plus / Pro** tier naming and a cleaner collapsible sidebar rolled out.

_Status: live and stable._

---

## ✅ Ready now — Pro dashboard (premium)

**18 tabs**, of which the following are **fully working with real data today:**

**Team-authored content** (published from the Admin panel, live to users instantly):
- **Kumami Research** — analyst calls with a stated position + "what this means for you"
- **Airdrops & Whitelist** — curated drops with eligibility checklists, deadlines, follow
- **Calendar** — economic & on-chain events on a real month grid
- **Real-Time News** — headlines with sentiment, newest first
- **Events & Announcements** — live-streamed sessions (YouTube) with a Live-now badge, audience Q&A, and replays

**Personal, real-time features:**
- **Following & Alerts** — build a price alert and it **fires live**: it arms at the current price (streamed from Binance) and triggers the instant the market moves past your threshold. Saved to the user's account.
- **Watchlist** — add tickers, saved to the account across devices.
- **Daily Digest** — a live roll-up of everything above.

**Also included:** AI Portfolio, Market Cap Comparison, Alpha Room, Market Analysis, Kuma AI Chat (existing tools, re-slotted).

**Admin publishing system:** a new "Pro Dashboard" section in the Admin panel with a page per content type (create / edit / delete, publish or save-as-draft). Drafts never show to users; edits appear in real time.

**Security:** content is public-read/admin-write; personal data is private to each user; the whole thing is enforced by deployed database rules.

---

## 🚧 Not ready yet (in progress or dependency-blocked)

**Needs an external market/analytics data provider** (designed, in the nav, labelled "coming soon"):
- Smart Money Tracker · Coin/Token Tracker · Liquidation Heatmap · Security Scanner · Fear & Greed
- Live prices on the Watchlist, and the smart-money/sentiment lines in the Daily Digest

**In active development (this sprint):**
- Real-Time News **visual redesign** (compact feed with a prominent timestamp)
- **"Take a tour"** guided walkthroughs on the Pro tabs (matching the Plus tours)
- **Guided tours on every Admin page** so the team learns how to operate each tool
- **Q&A safety** on live events (profanity filter, spam/rate limits) before it's opened publicly

---

## How this is verified

- Core flows tested end-to-end in the browser on production (publish → appears to users; drafts hidden; alerts persist).
- The remaining content tabs share the same verified mechanism and pass an automated production build.
- Step-by-step test scripts for each tab live with the code for QA to re-run.

_Bottom line: Plus is live; the Pro dashboard is real and self-serviceable today for the content and personal-alert features, with the market-analytics tabs waiting only on a data-provider connection._
