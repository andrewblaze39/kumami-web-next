# v1.18 — how to test (kumami-dev, a few clicks each)

Accounts: a Plus account, a Pro account, an admin. Screenshots of every step: `docs/qa/evidence/v1.18/`.

## Calendar (Andrew's points 2, 3, 4, 6 · Rachelle answer 1)
1. **Admin → Pro Dashboard → Calendar.** There is no Category field. "Who sees this event" offers *Plus and Pro* (default) or *Pro only*. Add one event of each, a day or two ahead, and publish.
2. **Plus account → Plus → Calendar.** Colour-coded month grid with a legend, no filters. The *Plus and Pro* event is there; the *Pro only* event and any airdrop are not. Click the day: the panel on the right shows the event in full.
3. **Pro account → Pro → Tools → Calendar Pro.** Same calendar plus the *Pro only* event (PRO tag) and airdrop claim days (purple).
4. **Plus → Console.** The Calendar panel is a mini month calendar with coloured dots and the next 3 events.

## Rich text (point 1)
5. **Admin → any text box** (e.g. Airdrops → Description): select a word and press B / I / U, or Ctrl+B / I / U. It shows formatted right away. Publish, then open the item on the site: same formatting.

## Alerts (point 5)
6. **Pro → Following & Alerts.** Create "BTC · Price rises above · (a little above the current price) · Once". The row says *Watching*. When BTC crosses it (within a minute), a toast appears on any Kumami page, the row says *Triggered*, and *Recent alerts* lists it. Allow browser notifications to also get a system notification.
7. A Plus account can't use alerts (the tab is Pro; the API answers 403).

## Rachelle's v1.17 asks
8. **Plus → Console.** Global Regime and the coin chips read "Leaning …" / "Neutral · Low Signal" when there are only 1–2 signals. The Fear & Greed number and label match the Fear & Greed page, in the same colour.
9. **Plus → Fear & Greed.** Legend 0–24 / 25–45 / 46–55 / 56–74 / 75–100. The history chart is titled "Market index" with "n/30 saved".
10. **Plus → On-Chain Insights → Show more metrics → Open Interest (?)**: "Flat" = ±1% (24H), ±2.5% (7D), ±5% (30D).
11. **Plus → Flow Radar Plus** on a quiet hour (1H): "No major flows in the last hour — market is quiet".
12. **Plus account → Pro page**: no Smart Money Tracker or Coin / Token Tracker cards.

Automated: `npx vitest run` · `QA_PORT=<port> npx playwright test qa/smoke.spec.ts qa/features/calendar.spec.ts qa/features/admin-content.spec.ts qa/features/access-matrix.spec.ts qa/features/v118-evidence.spec.ts --project=desktop`.
