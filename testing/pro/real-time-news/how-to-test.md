# How to test — Pro › Real-Time News

Admin-authored headlines with sentiment + tags. Post in the dashboard, confirm
they render newest-first with a relative timestamp; drafts hidden.

- **Admin:** `/admin/pro-news` · **Surface:** `/world/pro?tab=realtimenews`
- **Collection:** `pro_news` (covered by `pro_*` wildcard — no rules deploy)
- **External piece (not built):** an automated news-API feed (Messari/CryptoQuant
  etc.) can later write into the same `pro_news` collection. Manual posting is
  fully working now.

## Prerequisites
- Signed in as **admin/superadmin**. App points at **prod `kumami-6df47`**.
- `npm run dev` → http://localhost:3000 (or live site).

## Step 1 — Post headlines at `/admin/pro-news`

| Headline | Sentiment | Tags | Button |
|---|---|---|---|
| Bitcoin ETF inflows hit $1.2B in a week as price reclaims $70K | Bullish | (blank) | **Publish** |
| Major exchange pauses withdrawals after contract anomaly | Bearish | Important | **Publish** |
| Fed minutes show two members favor holding rates through Q3 | Neutral | Macro | **Save Draft** |

## Step 2 — Verify on `/world/pro?tab=realtimenews`
- ✅ The two published headlines render newest-first, each with a relative time
  ("just now"), a sentiment tag (Bullish=green, Bearish=red), and any extra tags
  (e.g. "Important").
- ✅ **Draft hidden:** the Fed-minutes item does not appear.

## Step 3 — Edit & delete (admin)
- Edit a headline's sentiment → **Update & Publish** → tag color changes on the tab.
- Delete the draft → gone.

## Pass criteria
published newest-first ✅ · sentiment + tags render ✅ · draft hidden ✅ ·
edit/delete work ✅ · no console permission errors ✅
