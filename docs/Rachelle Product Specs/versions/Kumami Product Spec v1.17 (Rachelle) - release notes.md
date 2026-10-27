
## **v1.17 — 23 Oct 2026 (Rachelle’s request version)**

*Answers to v1.16’s questions and follow-ups on v1.16. Everything runs on the current CoinGlass STARTUP plan. Section titles: (Revised) = logic changes · (Adjusted) = status or wording only.*

**Answers to v1.16 “Questions for Rachelle”**

1.  **Airdrop TGE/claim dates on the Calendar:** neither Plus nor Pro. Remove the Airdrops link from the Calendar completely (Plus §5).
2.  **Flow Radar Pro 7D:** ×10 approved. Keep v1.14’s $300M cascade, $500M wave and the 3-event minimum.
3.  **Illiquid filter:** the Binance-volume fallback for coins outside netflow-list’s top \~100 is approved.
4.  **Significance engine:** definition in Pro §18.
5.  **Quiet Plus feed:** keep the floors (liquidation MED $50M/h, Dry Powder MED $100M). Add an empty state (Plus §3). Review after 2 weeks of collector data.
6.  **Open interest “flat” line:** scales with the range: 24H ±1% · 7D ±2.5% · 30D ±5% (Plus §2).
7.  **Spot Pulse buckets:** confirmed. Bullish = REAL BUYING, ACCUMULATION, REVERSAL SETUP. Bearish = DISTRIBUTION, QUIET DISTRIBUTION, COHERENT DECLINE, FORCED DECLINE. SPECULATIVE and BALANCED are neither.
8.  **Exchange Flow:** USDT and USDC only. No other Ethereum tokens; remove “other Ethereum tokens: inflow bearish, outflow bullish” from Plus §3.
9.  **Kuma knowledge draft:** please send docs/kuma/kumami-knowledge-v1.16.md. Rachelle will review it before it’s loaded.

**Also from v1.16**

  - **Refresh speed:** whale transfers and Smart Money at 2 min (instead of the 60 s asked in v1.15) are approved. The shared cache saves API calls, and 1 minute makes little difference.
  - **“What’s new” page:** Andrew’s call where it goes. Rachelle would like to see the customer text (docs/release-notes/v1.16-whats-new-draft.md) before it goes live.

**KUMAMI PLUS**

**Plus §1 Console (Revised)**

  - **One confidence rule for every coin (replaces the HYPE-only cap):** remove the HYPE 0.70 cap. Instead, for the Global Regime and every coin chip:
      
      - **0 active signals:** “Neutral · Low Signal”.
      - **1–2 active signals:** “Leaning Bullish / Bearish” at most (or “Neutral · Low Signal” if confidence is under 0.60), never the full verdict.
      - **3–4 active signals:** the normal floors apply.
      - *Why:* 2 out of 2 agreeing signals reads as 100% on thin evidence. This guards against that for any coin, not just HYPE.
  - **Coin chips show “Leaning”:** chips use the same floors as the Global Regime: ≥ 0.75 full verdict · 0.60–0.75 “Leaning Bullish / Bearish” · \< 0.60 “Neutral · Low Signal”. In v1.16, chips only show Bullish / Neutral / Bearish, so neither the cap nor the floors are visible.
  - **Fear & Greed on the Console = Kumami’s index** (Plus §4). The regime scores Kumami’s index with the same bands (0–24 +1.5 · 25–45 +1 · 46–55 0 · 56–74 −1 · 75–100 −1.5). The Console tile shows the same number, label and colour as the Fear & Greed page.

**Plus §2 On-Chain Insights (Revised)**

  - **§2.7 OI “flat” line scales with the range:** 24H ±1% · 7D ±2.5% · 30D ±5%, for both OI and price. *Why:* a 1% move over a month is noise.

**Plus §3 Flow Radar Plus (Adjusted)**

  - **Empty state:** when no HIGH/MED events fall in the selected window (1H / 4H / 24H), show “No major flows in the last {window} — market is quiet”. Don’t show an empty list.
  - **Exchange Flow:** USDT/USDC only (answer 8).

**Plus §4 Fear & Greed (Revised)**

  - **One index everywhere:** Kumami’s 5-factor index is the only Fear & Greed number in the product: Console tile, Console regime, Fear & Greed page and Daily Digest (the Digest already uses it).
  - **One set of labels and colours:**
      
      - 0–24 Extreme Fear · 25–45 Fear · 46–55 Neutral · 56–74 Greed · 75–100 Extreme Greed. Fear = red, Greed = green.
      - Remove the Console’s older cut-offs (Greed from 60, Neutral 40–59) and its reversed colours.
      - The history chart’s colour bands use the same cut-offs (Extreme Greed from 75, not 76).
  - **Own history:** starting now, save Kumami’s score once a day (scheduled job, same mechanism as the collector).
      
      - Until 30 days are saved, keep the current history chart but label it “Market index”. Don’t name the provider.
      - After 30 days, the chart shows Kumami’s own history.
  - **News Tone:** stays out of the score until the AI is on (as in v1.16).

**Plus §5 Calendar (Adjusted)**

  - **Remove the Airdrops link:** Airdrops & Whitelist TGE/claim dates no longer appear on the Calendar, for Plus or Pro (v1.16 shows them on Pro). They stay in Airdrops & Whitelist only.

**KUMAMI PRO**

**Pro intro · Pro §3 Smart Money Tracker · Pro §4 Coin / Token Tracker (Adjusted)**

  - **Cancelled — will not be built.** Correct v1.16 item 28, which still says “postponed”, and say “cancelled” in the Pro intro. The Hyperliquid whale data stays in use for Flow Radar and the Daily Digest.

**Pro §18 Flow Radar Pro (Revised)**

  - **Illiquid filter:** the Binance-volume fallback is approved (answer 3).
  - **7D window:** ×10 approved (answer 2).
  - **Significance engine — definition:**
      
      - **What:** an event is “significant” when it’s unusually large for that coin and event type.
      - **Event types:** Whale Transfer, Liquidation Spike, Smart Money. Dry Powder is excluded, because it’s market-wide, not per coin.
      - **Baseline:** the median event size for that coin and event type over the last 30 days, from saved collector data.
      - **Rule:** event size ≥ 3× the baseline.
      - **Data floor:** if the coin has fewer than 10 events of that type in 30 days, there’s no baseline yet, so no ⭐.
      - **Where it shows:** a ⭐ on the event row in Flow Radar Pro, with hover text “3.4× this coin’s usual {event type}”. Pro only.
      - **Later (optional):** a “Significance ⭐ in 72h” reason in Watchlist Pro “Also Worth Watching”, and an “Unusual activity” line in the Daily Digest.
      - **Timing:** build once the collector has 30 days of data.

**Shell (Adjusted)**

  - The v1.16 shell changes (words-only Basic / Plus / Pro toggle, no mobile bottom tab bar, menu and Kuma buttons in the top bar) are accepted.

**Still open from v1.16 (owner: Andrew)**

  - **Collector:** set CRON\_SECRET, create the Cloud Scheduler job (every 60 s) and the TTL policy. **Priority:** Watchlist Pro, the Plus delay, Fear & Greed history and the significance engine all depend on it.
  - **Gemini:** enable billing and set AI\_ENABLED=true.

**Not re-audited in this version:** everything not named above.

## **