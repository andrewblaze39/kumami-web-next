# How to test — Pro › Airdrops & Whitelist

Internal admin-authored tool. You test it by adding entries in the admin
dashboard and confirming they render on the Pro tab under the right category,
with the detail view (checklist, deadline, value) and the Follow toggle working,
and drafts staying hidden.

- **Admin authoring:** `/admin/pro-airdrops`
- **User-facing surface:** `/world/pro?tab=airdrops`
- **Firestore collection:** `pro_airdrops` (covered by the `pro_*` wildcard rule —
  no rules deploy needed)

## Prerequisites

- Signed in as an **admin or superadmin** (authors content and passes the Pro
  premium gate).
- **Environment:** app points at **prod `kumami-6df47`** — entries write to prod.
  Only *published* entries appear on the tab; drafts stay hidden; all deletable.
- **Rules:** already covered by the deployed `pro_*` wildcard rule — nothing to
  deploy for this tab.
- **Run it:** `npm run dev` → http://localhost:3000 (or the live site).

## Step 1 — Open the authoring page

`/admin` → **"Airdrops & Whitelist (Pro)"** quick link, or sidebar → **Pro
Dashboard** → **Airdrops & Whitelist**. Direct URL: **`/admin/pro-airdrops`**.

## Step 2 — Add 3 entries

Paste these (the original placeholder set — covers both categories, eligibility
states, and a draft). For the checklist, click **+ Add checklist item** and tick
the box for met items.

| Name | Category | Description | Deadline | Est. value | Eligibility | Checklist (✓ = ticked) | Button |
|---|---|---|---|---|---|---|---|
| ZetaLayer | airdrop | Cross-chain messaging protocol — snapshot-based, no task requirement. | 2d 4h | $180–420 est. | Eligible | ✓ Wallet holds a qualifying balance · ✓ Completed required on-chain interaction · ☐ Followed project on X / joined Discord | **Publish** |
| DriftX Mint | whitelist | Generative art collection — 3,333 supply, WL guarantees mint price. | 1d 2h | Mint 0.08 ETH | Eligible | ✓ Completed quest · ☐ Snapshot taken | **Publish** |
| Kaon Labs | airdrop | L2 sequencer network — testnet participants get priority weighting. | Not live | TBD | Not live | (none) | **Save Draft** |

After each **Publish** you'll see "Airdrop published!" and the item appears in
**Existing entries** with its category, eligibility, and a green **published**
badge. Kaon Labs gets a yellow **draft** badge.

## Step 3 — Verify on the Pro tab

Go to **`/world/pro?tab=airdrops`**.

- ✅ The **Airdrops** toggle shows ZetaLayer (an `Eligible` card with its accent
  color + first-letter logo). The **Whitelists** toggle shows DriftX Mint.
- ✅ **Draft hidden:** Kaon Labs does **not** appear under either toggle.
- ✅ **Detail view:** click ZetaLayer → eligibility checklist renders (green check
  / red x per item), plus Deadline and Estimated value rows.

## Step 4 — Verify the Follow toggle

- In the ZetaLayer detail view, click **Follow** → it flips to **Following**.
- Reload the page → still **Following** (persists locally via ProState). It will
  also show up later under the **Following & Alerts** tab once that's built.

## Step 5 — Verify edit & delete (in `/admin/pro-airdrops`)

- **Edit:** click Edit on DriftX Mint, change the deadline, **Update & Publish** →
  the Pro tab updates (realtime).
- **Delete:** delete the Kaon Labs draft → it disappears from the admin list.

## Pass criteria

published shows under correct category ✅ · draft hidden ✅ · checklist + deadline +
value render in detail ✅ · Follow persists ✅ · edit reflects ✅ · delete works ✅ ·
no `permission` errors in the console ✅

## If it fails

If a card doesn't appear after publishing: confirm you're an admin and signed in,
and check the browser console for `Missing or insufficient permissions` (would
mean the `pro_*` rule isn't live on the project the app points at — it was
deployed to both dev and prod already).
