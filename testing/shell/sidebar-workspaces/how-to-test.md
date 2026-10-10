# How to test — Sidebar: one tier per workspace

Each workspace's sidebar shows only its own tier: **Basic → Basic items**, **Plus → Plus tools**, **Pro → Pro tabs**. **Home** is at the top in all three. The workspace follows the page you open, and the Basic / Plus / Pro toggle takes you to that workspace's home page.

- **Automated version:** `npx playwright test qa/features/sidebar-workspaces.spec.ts` (QA report: `docs/qa/2026-10-10-sidebar-workspaces.md`)

## Prerequisites
- `npm run dev` → http://localhost:3000 (kumami-dev).
- A free account for the Plus steps, and a subscribed account for the Pro steps (use Profile → Subscription → **Grant Pro** on your own account; testing-only button).

## Step 1 — Plus account
1. Open `/world/console`.
   - ✅ The badge next to the logo says **PLUS**.
   - ✅ The sidebar shows Home, then **Console, On-Chain Insights, Flow Radar Plus, Fear & Greed, Calendar, Watchlist Plus, Settings**, and nothing else (no News Portal, Education, AI Labs or Games).
2. Click **Calendar**, then **Flow Radar Plus**, **Fear & Greed**, **Settings** in turn.
   - ✅ The badge stays **PLUS** on every one (Calendar used to switch to Basic).
3. Click **Basic** in the top-right toggle.
   - ✅ You land on **My Journey**, the badge says **BASIC**, and the sidebar shows only News Portal, My Journey, My Courses, Cryptopedia, AI Labs and Games.
4. Click **Plus** in the toggle → ✅ you land on **Console**.
5. Click **Home** → ✅ the Home page opens and the workspace stays **PLUS**.

## Step 2 — Pro account
1. Open `/world/pro?tab=digest`.
   - ✅ Badge **PRO**. The sidebar shows only Pro tabs: Daily Digest, Following & Alerts, News & Signals, Tools (Flow Radar Pro, Watchlist Pro, Spot Pulse Pro, …), AI Tools, Events & Announcements. No Console, Calendar or News Portal.
2. In the Daily Digest, click **Open Calendar** (or go to `/world/pro?tab=calendar`).
   - ✅ You land on `/world/calendar` and the workspace switches to **PLUS**.
3. Click **Watchlist Plus** (in the Plus sidebar).
   - ✅ You see the **Plus** version (5 coins, no adding): Plus pages are Plus for every account since v1.7. Your pins live in **Watchlist Pro** (Pro → Tools).
4. Click **Flow Radar Plus** → ✅ the Plus version (Delayed 15m, no LOW). The full version is **Flow Radar Pro** (Pro → Tools).

## Pass criteria
✅ Each workspace lists only its own tier · ✅ every page shows the right workspace badge · ✅ the toggle goes to each workspace's home page · ✅ Plus pages show the Plus versions for every account; the Pro versions are under Pro → Tools · ✅ no red errors in the console.

## If something's wrong
- **A Plus page shows BASIC or PRO:** the route is missing from `ADVANCED_ROUTES` in `src/contexts/WorldModeContext.tsx`.
- **Pro sections show on the Plus Watchlist:** the Plus page must render `WatchlistView variant="plus"` (`src/app/world/(app)/watchlist/page.tsx`).
