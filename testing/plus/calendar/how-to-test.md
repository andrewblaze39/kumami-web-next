# How to test — Calendar (shared by Plus and Pro)

One calendar for everyone at `/world/calendar`. It mixes three sources: macro
releases and token unlocks (automatic feed) and events your team adds in the
admin panel. This test checks that team events show up, drafts stay hidden,
edits and deletes come through, and the high-impact popup fires.

- **Admin:** `/admin/pro-calendar` (Content → Pro Dashboard → Calendar)
- **User page:** `/world/calendar`. Old `/world/pro?tab=calendar` links redirect here.
- **Data:** Firestore `pro_calendar` (published items only), plus the CoinGlass feed.
- **Automated version:** `npx playwright test qa/features/calendar.spec.ts --project=desktop` (QA reports: `docs/qa/2026-10-10-calendar.md`, `docs/qa/2026-10-10-plus-pro-tool-split.md`).

## Prerequisites
- `npm run dev` → http://localhost:3000. `.env.local` points at **kumami-dev**, so everything you add goes to the dev database.
- **Author:** sign in with an admin account (yours).
- **Viewer:** a normal, non-admin account in a second browser or an incognito window.

## Step 0 — Automatic feeds are OFF by default (since 10 Oct 2026)
1. As admin, open `/admin/pro-calendar`. ✅ At the top, **Automatic feeds** shows two switches, **Macro events (CoinGlass) — OFF** and **Token unlocks (CoinGlass) — OFF**, plus who changed them last.
2. As the Plus user, open `/world/calendar`. ✅ The subtitle says "Key dates and events picked by the Kumami team." and only team events (★) appear.
3. Turn **Macro events** ON (it shows "Saving…" briefly, then ON). Reload the user calendar: ✅ macro releases appear across the month.
4. Turn it back **OFF**. ✅ They disappear again, also from the Console Calendar preview and the popups.
5. **Leave both OFF** (Andrew's decision for now).

The steps below assume the Macro feed is ON (step 3) when they mention feed events.

## Step 1 — Look at the calendar as a Plus user
Open `/world/calendar`.
- ✅ A **Next up** card at the top shows the nearest upcoming event.
- ✅ The month grid shows the current month with today highlighted. Days hold up to 3 events, then "+N more".
- ✅ Upcoming days (later this month) have events. If they're empty, the macro feed is broken.
- ✅ Click **Token Unlocks**: only unlock events remain. Click **All** to reset.
- ✅ Switch off **MED** and **LOW**: only HIGH events remain (hover an event and its tooltip ends in "HIGH").
- ✅ **›** and **‹** move between months.

## Step 2 — Add events as admin (`/admin/pro-calendar`)
Use today's or tomorrow's date. Times are **UTC** (leave blank for an all-day event). For the popup test, set the first event about 2–3 hours from now in UTC.

| Title | Date | Time (UTC) | Impact | Category | Affected assets | Button |
|---|---|---|---|---|---|---|
| [QA] ETH upgrade go-live | today | now + 2h | High impact | Project | ETH | **Publish** |
| [QA] Kumami AMA | tomorrow | (blank) | Medium | Other | (blank) | **Publish** |
| [QA] Draft — should not show | tomorrow | 10:00 | Low | Other | (blank) | **Save Draft** |

- ✅ Each one appears in **Scheduled events** below the form, with its status (published or draft), "UTC" or "all day", and its assets.

## Step 3 — Check as the Plus user (reload `/world/calendar`)
- ✅ A **"High-impact event soon"** popup shows *[QA] ETH upgrade go-live*, "Affected: ETH". Click **Dismiss**; reloading must not show it again.
- ✅ On today's cell, *★ [QA] ETH upgrade go-live* is listed **first**: team events are marked ★ and float above feed events. Hover it: "(Project · Kumami, HIGH)".
- ✅ Tomorrow shows *★ [QA] Kumami AMA* with **All day**.
- ✅ *[QA] Draft — should not show* is **not** anywhere on the calendar.
- ✅ **Type filter:** "Protocol & other" shows only the team events (Project and Other categories).
- ✅ Open `/world/console` (use a fresh incognito window if you dismissed the popup): the **"Needs your attention today"** popup lists the ETH event, and the **Calendar** preview panel shows ★ events at the top of their day.

## Step 4 — Edit and delete (admin)
- Click **Edit** on *[QA] ETH upgrade go-live*, change the title to *… (edited)*, then **Update & Publish**. Reload the user calendar: the new title shows.
- Click **Delete** on each `[QA]` event and confirm. Reload: they're gone.

## Pass criteria
✅ Feed events present (including upcoming) · ✅ filters and month arrows work · ✅ published team events show with ★ and sort first · ✅ drafts hidden · ✅ edit and delete come through on reload · ✅ the popup shows the HIGH team event on Calendar and Console · ✅ no red errors in the browser console.

## If something's wrong
- **Every market page says it couldn't load / 401:** `.env.local` is missing `FIREBASE_SERVICE_ACCOUNT_JSON`.
- **Nothing upcoming in the grid:** the macro feed window isn't being applied. Check the `cg:econcal:v2` call in `src/lib/market/live/cg-endpoints.ts`.
- **A team event doesn't show:** it's a draft, the date is in another month (use the arrows), or the title/date is empty (those are skipped).
- **Unlocks only appear on today:** expected. Our CoinGlass plan only returns today's unlocks.
