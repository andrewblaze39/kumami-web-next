# Testing

Manual, step-by-step test tutorials for features in this repo — one file per
feature, categorized by product area. Each tells you exactly what to do (which
account, which URLs, what data to paste) and what you should see, so you can
verify a feature by hand in a couple of minutes.

These are written and kept up to date by the `kumami-qa` skill (workflow stage 5 —
see `docs/DEVELOPMENT_WORKFLOW.md`), based on what the automated QA pass actually
verified, following the `feature-test-tutorial` conventions.

## Admin

- [Subscriptions — grant / remove Pro](admin/subscriptions/how-to-test.md) — superadmin-only `/admin/subscriptions`: 1/3/12 months or no end date, remove, automatic expiry. Automated: `access-matrix.spec.ts` › Subscriptions admin tool.

## Shell / navigation

- [Sidebar: one tier per workspace](shell/sidebar-workspaces/how-to-test.md) — Basic/Plus/Pro sidebars show only their own tier; the workspace follows the page. Automated: `qa/features/sidebar-workspaces.spec.ts`.

## Plus

- [Calendar](plus/calendar/how-to-test.md) — shared Plus + Pro calendar at `/world/calendar`: feed events plus team events authored at `/admin/pro-calendar` (drafts hidden, ★ team events, high-impact popup). Automated: `qa/features/calendar.spec.ts`.

## Automated QA (Playwright)

- `npm run qa:smoke` — every Plus page, Pro tab and Pro admin page, desktop. `npm run qa` — everything, desktop + mobile. Personas: qa0 is a brand-new account every run (deleted after); qa1 free, qa2 Pro (granted by qa3) and qa3 superadmin (not subscribed) are fixed accounts. `[TEST]` content created by qa3 stays until the next run; the access/leak matrix runs every time. Details: `.claude/skills/kumami-qa/SKILL.md`. QA reports: `docs/qa/`.

## Pro dashboard

- [Admin-managed Plus & Pro content](pro/admin-content/how-to-test.md) — qa3 publishes [TEST] research, airdrops/whitelists, news, events (live Q&A), calendar events, alpha and market analysis; qa2 sees each correctly, qa1 sees the teaser. Automated: `qa/features/admin-content.spec.ts`.
- [Plus vs Pro tools + Pro access](pro/plus-vs-pro-tools/how-to-test.md) — Flow Radar Plus/Pro, Watchlist Plus/Pro, Spot Pulse tile/Pro; Pro = subscribed only (admins included); Pro granted on the admin Subscriptions page. Automated: `qa/features/access-matrix.spec.ts`, `qa/features/plus-pro-tools.spec.ts`.

- [Kumami Research](pro/kumami-research/how-to-test.md) — admin authors KOL calls at `/admin/pro-research`; they render on `/world/pro?tab=research`.
- [Airdrops & Whitelist](pro/airdrops/how-to-test.md) — admin authors drops/whitelists at `/admin/pro-airdrops`; they render on `/world/pro?tab=airdrops`.
- [Real-Time News](pro/real-time-news/how-to-test.md) — admin posts headlines at `/admin/pro-news`; they render on `/world/pro?tab=realtimenews`.
- [Events & Announcements](pro/events/how-to-test.md) — admin authors live/replay events at `/admin/pro-events`; they render on `/world/pro?tab=events` with realtime Q&A.

### User-state tabs (no admin authoring)
- **Following & Alerts** (`/world/pro?tab=followhub`) — build an alert, follow items from other tabs; both persist per-user to `users/{uid}/pro/state`. Test: add an alert, reload → still there; follow an airdrop → it shows here.
- **Daily Digest** (`/world/pro?tab=digest`) — live roll-up of the tabs above; publish content and confirm it appears in the matching digest section.
