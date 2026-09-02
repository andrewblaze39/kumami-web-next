# How to test — Pro › Kumami Research

Internal admin-authored tool. You test it by adding calls in the admin dashboard
and confirming they render correctly on the Pro dashboard, with drafts staying
hidden.

- **Admin authoring:** `/admin/pro-research`
- **User-facing surface:** `/world/pro?tab=research`
- **Firestore collection:** `pro_research` (covered by the `pro_*` wildcard rule)

## Prerequisites

- Signed in as an **admin or superadmin** account. One admin account is enough:
  it can author (rules require admin) and it passes the Pro tab's premium gate
  (the gate allows `isPremium` **or** admin/superadmin).
- **Environment:** the app points at **prod `kumami-6df47`** via `.env.local`, so
  anything you author writes to prod. Only *published* calls appear on the Pro
  tab; drafts stay hidden and everything is deletable from the admin page.
- **Rules:** `firestore.rules` must be deployed to the project the app uses.
  Already done for `pro_*`:
  `firebase deploy --only firestore:rules --project kumami-6df47`
- **Run it:** `npm run dev` → http://localhost:3000 (or use the live site).

## Step 1 — Open the authoring page

Go to `/admin` → **"Kumami Research (Pro)"** quick link, or left sidebar →
**Pro Dashboard** → **Kumami Research**. Direct URL: **`/admin/pro-research`**.

## Step 2 — Post 3 calls

Paste these (they're the original placeholder set, so the tab looks like the mockup):

| Analyst name | Role / title | Position | Asset | The call | What this means for you | Button |
|---|---|---|---|---|---|---|
| Mara Chen | Senior Analyst, Kumami Research | long | BTC | Spot ETF flows have been net-positive for seven straight sessions while funding stays modest — this doesn't look like a crowded long yet. I added on the dip toward $69K. | Consistent with your Watchlist — BTC is your largest holding. This call aligns with, not against, your existing exposure. | **Publish** |
| Priya Nair | On-Chain Analyst, Kumami Research | neutral | ETH | Staking-ETF news is constructive medium-term but I'm not adding here — ETH/BTC still needs to reclaim its 50-day average before I'm convinced. | ETH is a hold-and-watch here, not a signal to add or trim. | **Publish** |
| Dev Okafor | Macro Analyst, Kumami Research | short | XRP | XRP has lagged the majors' bounce and regulatory overhang keeps resurfacing. Small short into resistance near $0.63. | You don't hold XRP — informational context, not a position change. | **Save Draft** |

After each **Publish** you should see "Research call published!" and the item
appears under **Existing calls** with a green **published** badge. The Dev Okafor
one gets a yellow **draft** badge.

## Step 3 — Verify on the Pro tab

Go to **`/world/pro?tab=research`** (or `/world/pro` → sidebar → Kumami Research).

- ✅ Mara Chen and Priya Nair render as cards — position badge (`long BTC` /
  `neutral ETH`), the body text, the "What this means for you" box, and a relative
  timestamp ("just now" / "2m ago").
- ✅ **Draft hidden:** Dev Okafor (XRP) does **not** appear.

## Step 4 — Verify edit & delete (in `/admin/pro-research`)

- **Edit:** click Edit on Mara Chen, change the body, **Update & Publish** → the
  Pro tab updates (realtime via `onSnapshot`, usually without a refresh).
- **Delete:** delete the Dev Okafor draft → it disappears from the admin list.

## Pass criteria

published shows ✅ · draft hidden ✅ · edit reflects ✅ · delete works ✅ · no
`permission` errors in the browser console ✅

## If it fails

If the tab says **"No research calls yet"** after publishing: the rules probably
aren't deployed to the project your app points at, or you're signed out / not an
admin. Check the browser console for a `Missing or insufficient permissions` error.
