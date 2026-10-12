# How to test — website polish (share image, robots, sitemap, 404, Terms, page titles, roadmap)

From the "20 things that make a site real" checklist (11 Oct 2026). Batch A = the code-only items.

- **Automated:** `npx playwright test qa/features/site-polish.spec.ts` (desktop + mobile) and the access matrix's "Alpha Room and Market Analysis are Pro-only" test.
- **Where:** any environment; the share-image check needs the deployed site (social apps can't reach localhost).

## Step 1 — Share image (link previews)
1. Open `/og-default.png`. ✅ A 1200×630 dark card: Kumami logo, "Where Web3 finally makes sense.", topic pills, KUMAMI.WORLD.
2. After deploying, paste `https://kumami.world` into WhatsApp / Telegram / X / Discord. ✅ The preview shows that card (social apps cache previews — test a page you haven't shared before, or add `?v=2`).

## Step 2 — robots.txt and sitemap
1. Open `/robots.txt`. ✅ Allows `/`, disallows `/admin`, `/api/`, `/world/`, and links `https://kumami.world/sitemap.xml`.
2. Open `/sitemap.xml`. ✅ Lists `https://kumami.world`. (Only the landing page is public today — see the roadmap item "Decide which pages are public".)

## Step 3 — 404 page
1. Open `/this-page-does-not-exist`. ✅ Branded page: "404 · Page not found", "This page wandered off the chain.", buttons **Go to Kumami World** and **Read the latest news**. The browser tab says "Page not found — Kumami World".

## Step 4 — Terms without an account
1. In a private window (logged out), open `/terms`. ✅ The Terms of Service show; you are **not** sent to the login gate.

## Step 5 — Page titles
1. Signed in, open Console, Calendar, On-Chain, Flow Radar, Fear & Greed, Watchlist, Settings. ✅ Each browser tab has its own title (e.g. "Calendar — Kumami World"), not the generic site title.

## Step 6 — App manifest
1. Open `/manifest.webmanifest`. ✅ Name "Kumami World", turquoise theme colour, two icons that load. On a phone, "Add to Home Screen" uses the Kumami icon.

## Step 7 — Admin roadmap cleanup
1. As an admin, open `/admin/roadmap`. ✅ "Website polish · launch checklist", "Kuma AI · Knowledge" and "Pro · Airdrops & Whitelist" show. ✅ The scrapped items (news-portal education section, slimmer education articles, Kuma AI analysis box, chat bubble, Market Analysis redesign, Kuma AI chatroom items) are gone — also in a browser that had saved the old roadmap. Items you added yourself stay.

## Step 8 — Alpha Room & Market Analysis are Pro-only (database rules, kumami-dev)
1. As a free user, Pro › Alpha Room / Market Analysis show the teaser (as before).
2. The database itself now refuses those two collections to non-subscribers (the automated test reads them directly: free 403, Pro 200, admin 200).

## Pass criteria
✅ Share image loads and appears in previews · ✅ robots + sitemap correct · ✅ branded 404 with status 404 · ✅ Terms public · ✅ every page titled · ✅ manifest valid · ✅ roadmap cleaned · ✅ Alpha Room / Market Analysis blocked for free users at the database.

## Not in this batch (needs Andrew)
Privacy policy text, cookie consent banner, contact email + address, and which pages to make public for Google.
