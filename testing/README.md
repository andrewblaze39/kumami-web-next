# Testing

Manual, step-by-step test tutorials for features in this repo — one file per
feature, categorized by product area. Each tells you exactly what to do (which
account, which URLs, what data to paste) and what you should see, so you can
verify a feature by hand in a couple of minutes.

These are generated and kept up to date by the `feature-test-tutorial` skill
whenever a feature is built or changed.

## Pro dashboard

- [Kumami Research](pro/kumami-research/how-to-test.md) — admin authors KOL calls at `/admin/pro-research`; they render on `/world/pro?tab=research`.
- [Airdrops & Whitelist](pro/airdrops/how-to-test.md) — admin authors drops/whitelists at `/admin/pro-airdrops`; they render on `/world/pro?tab=airdrops`.
- [Calendar](pro/calendar/how-to-test.md) — admin authors dated events at `/admin/pro-calendar`; they render on `/world/pro?tab=calendar`.
- [Real-Time News](pro/real-time-news/how-to-test.md) — admin posts headlines at `/admin/pro-news`; they render on `/world/pro?tab=realtimenews`.
- [Events & Announcements](pro/events/how-to-test.md) — admin authors live/replay events at `/admin/pro-events`; they render on `/world/pro?tab=events` with realtime Q&A.

### User-state tabs (no admin authoring)
- **Following & Alerts** (`/world/pro?tab=followhub`) — build an alert, follow items from other tabs; both persist per-user to `users/{uid}/pro/state`. Test: add an alert, reload → still there; follow an airdrop → it shows here.
- **Watchlist** (`/world/pro?tab=watchlist`) — add tickers; persist per-user; prices show "—" until the market-data integration lands.
- **Daily Digest** (`/world/pro?tab=digest`) — live roll-up of the tabs above; publish content and confirm it appears in the matching digest section.
