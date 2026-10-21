# Kumami — knowledge for Kuma AI (v1.20, 21 Oct 2026)

> Source text for Kuma AI's company knowledge (Pro §17 "knowledge refresh"),
> written from product spec v1.20. Customer-facing: no data-provider names, no
> internal section numbers. **Draft for Rachelle and Andrew to review.** After
> approval, replace the old knowledge chunks in the n8n "Kuma AI Agent" workflow
> (delete the old chunks first, don't add duplicates) and check the answers
> against the test questions at the bottom.

## What Kumami is

Kumami (kumami.world) is a crypto and Web3 platform for learning, news and market
intelligence. Everything lives in one app, Kumami World, after you sign in. It has
three tiers:

- **Basic** (free): news, education courses, Cryptopedia, games and the Kumami
  home page.
- **Plus** (every signed-in account): the market tools: Console, On-Chain
  Insights, Flow Radar Plus, Fear & Greed, the Calendar and Watchlist Plus.
- **Pro** (paid): real-time and deeper versions of the market tools plus Pro
  content and AI tools.

Switch between the Plus and Pro workspaces with the sidebar. Beginner, Advanced
and Pro modes change how much detail is shown.

## Basic

- **News:** the daily crypto news feed: a ticker, a top story, the latest
  stories and more articles below.
- **Education:** 5 levels, 65 lessons (about 19 hours). "My Journey" tracks your
  progress by chapter and section. Achievements, Research articles and a Glossary
  are on the same page.
- **Cryptopedia:** Tokenpedia (a directory of tokens) and a plain-language
  Glossary.
- **Games:** learning games with a featured carousel.
- **AI Labs:** a preview of upcoming AI tools (nothing live there yet).

## Plus market tools

- **Console:** the 10-second daily briefing. A Global Regime (from Strongly
  Bullish to Strongly Bearish, with a confidence score) built from Fear & Greed,
  7-day ETF flows, funding and open interest vs price, plus a short AI-written
  read of it. Four macro tiles (BTC ETF flow, BTC dominance, on-chain long/short
  bias, 24h liquidations), regime chips for BTC, ETH, SOL, BNB and HYPE, and
  previews of Spot Pulse, Flow Radar, the Calendar and the Watchlist. A bar at
  the top warns when a high-impact event the Kumami team flagged starts within 6
  hours.
- **On-Chain Insights:** per-coin panels for BTC, ETH, SOL, BNB and HYPE:
  - funding rate (Overheated Long / Crowded Long / Neutral / Crowded Short /
    Extreme Short);
  - exchange netflow (opens on 7 days, because balances update daily);
  - ETF flows, long/short ratio, liquidations, open interest vs price,
    stablecoin supply.
  - **Spot Pulse:** asks "is this move real money?" by comparing spot buying,
    futures buying and price. Each coin gets a read such as Real Buying,
    Speculative, Distribution, Quiet Distribution, Accumulation, Reversal Setup
    or Coherent Decline, and the market as a whole gets a verdict.
- **Flow Radar Plus:** a feed of large market events, 15 minutes behind,
  covering the 5 core coins:
  - whale deposits to and withdrawals from exchanges;
  - "Dry Powder" (big stablecoin moves onto or off exchanges);
  - liquidation spikes (Long Flush, Short Squeeze or Two-sided);
  - smart-money positions opened or closed on Hyperliquid.
  - A verdict band sums up the window (Broad Accumulation, Distribution Wave,
    Mixed Flow, Quiet Flow, or a liquidation cascade). Coloured outlines show
    when another Kumami tool agrees.
- **Fear & Greed:** Kumami's own 0–100 index, built from five factors: price
  momentum, long/short sentiment, volatility, stablecoin supply and news tone.
  The news tone is scored by AI.
- **Calendar:** one calendar for everyone, curated by the Kumami team:
  - macro releases (CPI, FOMC…), token unlocks, exchange listings and token
    sales / TGEs;
  - high and medium impact are shown by default, and LOW shows everything;
  - airdrop claim dates appear for Pro members;
  - a popup warns about high-impact events in the next 24 hours.
- **Watchlist Plus:** BTC, ETH, SOL, BNB and HYPE with price, a Signal ("is
  money moving into this?") and a Status ("is it risky right now?", e.g.
  Overheated, Short Heavy, Crowded Long, Coiling).

## Pro

- **Price:** Monthly $19.99 or Yearly $199.99. Pay by card (renews
  automatically until cancelled) or by crypto (a prepaid 30 or 365 days that does
  not renew). Subscribe from the Subscribe page; manage or cancel under Profile →
  Subscription. A card cancellation keeps Pro until the end of the paid period.
- **Referrals:** every user has a code (Profile → Referrals). When a new user's
  first payment uses it, both get a credit: $1 for Monthly, $10 for Yearly. The
  balance is shown; withdrawals are not available yet.
- **Pro tools:**
  - **Daily Digest:** everything new in one feed: research, news, airdrops, the
    calendar, Alpha Room, the biggest smart-money positions opened in 24h, today's
    "Also Worth Watching" coins and today's Fear & Greed.
  - **Following & Alerts:** follow coins and airdrops, and set live price alerts
    for about 30 coins.
  - **Spot Pulse Pro:** 10 coins (the 5 core coins plus 5 "Also Worth Watching"
    or most-traded coins), real-time.
  - **Flow Radar Pro:** real-time, every coin, low-severity events too, a 7-day
    window, a Flow Balance panel; very thin coins are hidden.
  - **Watchlist Pro:** pin up to 15 of your own liquid coins (no stablecoins or
    wrapped tokens). "Also Worth Watching" lists coins with 3 days of real net
    buying confirmed by spot buyers, and live prices on every row.
  - **Airdrops & Whitelist:** curated opportunities with an eligibility
    checklist, deadline and estimated value.
  - **AI Portfolio:** track holdings with live prices; import a wallet.
  - **Market Cap Comparison:** "what if coin A had coin B's market cap?"
  - **Real-Time News:** curated breaking news with a sentiment tag.
  - **Alpha Room:** the team's chat-style alpha calls.
  - **Kumami Research:** research notes with a position call (long / short /
    neutral).
  - **Events & Announcements:** live-streamed events with Q&A.
  - **Market Analysis:** the team's market takes.
  - **Kuma AI Chat:** this assistant, plus a Crypto Address Tracker room that
    watches up to 20 wallets with alerts.
  - **Crypto Address Tracker:** paste any EVM wallet to see its value, holdings
    and recent activity.
- **Coming later (not live):** Security Scanner, Smart Money Tracker, volume and
  sentiment alerts, wallet profit and win rate.

## Account

- Sign up with email (verify it) or Google.
- Delete your account yourself under Profile → Profile → "Delete my account".
- Kumami gives information, not financial advice.

## Test questions (expected answer in brief)

1. How much is Pro? → $19.99/month or $199.99/year, card or crypto.
2. Is Flow Radar real-time? → Pro yes; Plus is 15 minutes behind.
3. What is Dry Powder? → large stablecoin moves onto exchanges (buying power
   arriving) or off them.
4. Which coins does Plus cover? → BTC, ETH, SOL, BNB, HYPE.
5. Can I pin USDT in my watchlist? → No: stablecoins and wrapped tokens can't be
   pinned; Pro pins need a liquid coin with a futures market.
6. How do referrals pay? → $1 (Monthly) or $10 (Yearly) to both, once per new
   user; withdrawals not yet available.
7. How do I cancel? → Profile → Subscription → Cancel (card); crypto just
   doesn't renew.
8. What does "Quiet Distribution" mean? → spot selling while price is flat.
9. Does Kumami have a Security Scanner? → Not yet, coming later.
10. (Unanswerable) What's Kumami's revenue? → Kuma should say it doesn't know.
