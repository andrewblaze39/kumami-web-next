# How to test — Pro › Calendar

Admin-authored dated events. Add events in the dashboard, confirm they land on
the right day of the calendar grid and in the Upcoming list, with drafts hidden.

- **Admin:** `/admin/pro-calendar` · **Surface:** `/world/pro?tab=calendar`
- **Collection:** `pro_calendar` (covered by `pro_*` wildcard — no rules deploy)

## Prerequisites
- Signed in as **admin/superadmin**. App points at **prod `kumami-6df47`**.
- `npm run dev` → http://localhost:3000 (or live site).

## Step 1 — Add events at `/admin/pro-calendar`
Use real dates near today so they show on the current month.

| Title | Date | Time | Impact | Category | Button |
|---|---|---|---|---|---|
| US CPI (MoM) | (today's date) | 8:30 AM UTC | High impact | Macro | **Publish** |
| ARB token unlock | (today + ~4 days) | — | Medium | On-chain | **Publish** |
| FOMC Rate Decision | (today + ~10 days) | — | High impact | Macro | **Save Draft** |

## Step 2 — Verify on `/world/pro?tab=calendar`
- ✅ CPI appears as a chip on today's cell; ARB unlock on its day (~4 days out).
- ✅ Both show in the **Upcoming** list, sorted by date; clicking one fills the
  **Selected event** detail (impact, category, date, description).
- ✅ **Draft hidden:** FOMC Rate Decision does not appear.
- ✅ Month arrows move between months; today's number is highlighted.

## Step 3 — Edit & delete (admin)
- Edit CPI's time → **Update & Publish** → tab updates (realtime).
- Delete the FOMC draft → gone from the admin list.

## Pass criteria
events land on correct days ✅ · upcoming sorted ✅ · detail renders ✅ · draft
hidden ✅ · edit/delete work ✅ · no console permission errors ✅

## If it fails
Empty grid after publishing → check you're admin/signed in and look for
`Missing or insufficient permissions` (the `pro_*` rule is already deployed).
