# QA — Tier-only sidebar + workspace-follows-page · 10 Oct 2026 · dev (this commit)

**Scope:** the sidebar in all three workspaces, the Basic / Plus / Pro toggle, page → workspace switching, Watchlist Pro sections, and the old `/world/pro?tab=calendar` redirect. Regression: smoke suite and Calendar suite.
**Accounts:** QA Plus and QA Pro (kumami-dev). **Viewports:** desktop 1440×900 and mobile Pixel 7.
**Spec:** Andrew's spec v1.5 (Plus intro, Pro intro, Pro §19). Not in Rachelle's doc; product decision by Andrew.

## Result: ✅ clean

| Check | Result | Evidence |
|---|---|---|
| Plus workspace lists only the 7 Plus tools (+ Home), no Basic/Pro items | ✅ | `sidebar-workspaces.spec.ts`, `desktop-sidebar-plus.png` |
| Basic pages switch to Basic and list only Basic items | ✅ | `desktop-sidebar-basic.png` |
| Pro workspace lists only Pro tabs | ✅ | `desktop-sidebar-pro.png` |
| Calendar, Flow Radar, Fear & Greed, Settings, Watchlist all show the **PLUS** workspace | ✅ | fixes the earlier finding "Plus account sees Basic on Calendar" |
| Toggle: Basic → My Journey, Plus → Console | ✅ (desktop; on mobile the toggle is icon-only, so this is covered on desktop) | |
| Home keeps the current workspace | ✅ (desktop) | |
| `/world/pro?tab=calendar` → `/world/calendar`, workspace becomes Plus | ✅ | |
| Pro account on Watchlist (Plus workspace) still sees "Your Watchlist"; the Plus upsell is hidden | ✅ | `watchlist-pro-in-plus.png` |
| Regression: smoke (22 desktop) + Calendar (5) | ✅ 27/27 | |
| vitest 663 · tsc · eslint (no new errors) · build | ✅ | |

## Changes made during QA
- Watchlist Pro sections now follow the **account** (previously account **and** Pro workspace). Without this, Pro users would have lost their pins and "Also Worth Watching", because Watchlist is no longer in the Pro sidebar.
- `ADVANCED_ROUTES` now includes `/world/flow-radar`, `/fear-greed`, `/calendar` and `/settings` (plus the retired `/intel` and `/spot-pulse`).
- Harness: `openPage` now skips first-visit tours and dismisses popups, which block clicks for fresh accounts.

## Observations (not fixed)
- **Two overlays at once:** on a first Console visit, the guided tour and the "Needs your attention today" popup open together, stacked on each other. Suggest showing the popup only after the tour is closed or skipped.
- **Mobile Calendar is cramped:** day cells truncate titles to 1–2 letters ("M…", "To…"). Suggest a list/agenda view on small screens (Rachelle §7.2 also asks for a list toggle).
- **Empty Flow Radar for Plus:** the Console's Flow Radar panel showed "No flow events available" for the Plus account, probably because of the 30-minute delay. Worth checking whether the delay leaves Plus with nothing for long periods.
- The Pro toggle's home page is AI Portfolio, while the Pro spec calls Daily Digest the landing tab. Consider changing `defaultPageForMode('pro')` to `?tab=digest`.

## How to re-run
```bash
npx playwright test qa/features/sidebar-workspaces.spec.ts      # desktop + mobile
npx playwright test qa/smoke.spec.ts qa/features/calendar.spec.ts --project=desktop
```
Manual version: `testing/shell/sidebar-workspaces/how-to-test.md`.
