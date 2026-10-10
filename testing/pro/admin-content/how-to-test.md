# How to test — admin-managed Plus & Pro content (qa3 authors, qa2 sees, qa1 locked)

Everything the team publishes from the admin dashboard and shows on Plus/Pro: Kumami Research, Airdrops & Whitelist, Real-Time News, Events & Announcements (live Q&A), Calendar team events, Alpha Room, Market Analysis, and the Daily Pro Digest that rolls them up.

- **Automated:** `npx playwright test qa/features/admin-content.spec.ts --project=desktop` (QA report: `docs/qa/2026-10-10-admin-content.md`)
- **Look at the last run's items:** the automated run leaves its `[TEST] …` items on kumami-dev until the next run. Sign in as qa2 (credentials `QA2_EMAIL` / `QA2_PASSWORD` in `.env.local`) and open the Pro tabs below.

## Prerequisites
- `npm run dev` → http://localhost:3000 (kumami-dev).
- Three accounts: a **superadmin** (qa3), a **Pro** account (qa2), a **free** account (qa1). The fixed QA accounts in `.env.local` work.
- Start every text you type with **[TEST]** so it's easy to find and clean up.

## Step 1 — Kumami Research (`/admin/pro-research` → Pro › Kumami Research)
1. As qa3: fill Analyst name, Role, Position **long**, Asset `ETH`, The call, What this means for you → **Publish**. ✅ "Research call published!"
2. Fill another → **Save Draft**. ✅ "Draft saved." and the list shows it as *draft*.
3. As qa2: ✅ the card shows the name, role, "1m ago", a green **LONG ETH** pill, the call text, and a "What this means for you" box. ✅ The draft is **not** shown. Newest call is on top.
4. As qa3: **Edit** → change the name → **Update & Publish** → ✅ qa2 sees the new name. **Delete** → ✅ gone for qa2.

## Step 2 — Airdrops & Whitelist (`/admin/pro-airdrops` → Pro › Airdrops & Whitelist)
1. As qa3: publish one **airdrop** (Eligibility *Eligible*, 3 checklist items, one unticked) and one **whitelist** (*Check eligibility*).
2. As qa2: ✅ **Airdrops** shows only airdrops; **Whitelists** only whitelists. Each card: coloured logo letter, eligibility badge, name, description, deadline (purple) and value.
3. Open the airdrop: ✅ eligibility badge, **Eligibility checklist** with green ✓ for ticked and red ✗ for unticked items, Deadline and Estimated value rows. **Back to list** returns.
4. Click **Follow** → ✅ it turns into **Following**. Open **Following & Alerts** → ✅ the airdrop is listed **by its name** ("… · Airdrop"), never as a code. Click **Following** there to unfollow.

## Step 3 — Real-Time News (`/admin/pro-news` → Pro › Real-Time News)
1. As qa3: publish a headline (Sentiment *bull*, source, summary, tags "Important, Regulation") and a second one with *bear*.
2. As qa2: ✅ each row has the time (HH:MM + "just now"), a coloured dot, the headline, the summary, amber tags, a **green BULLISH** / **red BEARISH** tag, and the source. Newest first; drafts hidden.

## Step 4 — Events & Announcements (`/admin/pro-events` → Pro › Events & Announcements)
1. As qa3: publish a **live** event (tick "Live now", paste a YouTube link), an upcoming one (not live), and a **past** one with a video.
2. As qa2: ✅ the live event has a red **Live now** badge, "date · host", and the YouTube player. Type a question in **Submit a question…** + Enter → ✅ it appears with **1** vote; click the arrow → **2**; clicking again doesn't add more.
3. ✅ "Live & upcoming" lists the upcoming event (no Live badge). ✅ "Past events" lists the replay; **Watch replay** opens the player, **Hide** closes it.

## Step 5 — Calendar team events (`/admin/pro-calendar` → `/world/calendar`, Plus)
1. As qa3: publish a **High** impact event 2 days out (Category Project, assets "BTC, ETH") and a **Medium** one; save a third as draft.
2. As qa2 **and** qa1 (the calendar is Plus): ✅ both events show with **★** (Kumami team event); hovering shows "Project · Kumami, HIGH" / "On-chain · Kumami, MED". ✅ The draft doesn't show. Clicking an event shows its description.

## Step 6 — Alpha Room (`/admin/alpha-room` → Pro › Alpha Room)
1. As qa3: type a message in **Message #alpha** + Enter. ✅ It appears in the admin list.
2. As qa2: ✅ it's the newest message, posted by **Kumami World**, with today's time.

## Step 7 — Market Analysis (`/admin/market-analysis` → Pro › Market Analysis)
1. As qa3: Title, Content, choose a chart image → ✅ preview shows → **Publish Market Analysis** → ✅ alert "Market analysis published successfully!"
2. As qa2: ✅ "Today's focus" shows it first (**01/0N**), with the image on the left, the title, the text, and it's first in "More analyses".

## Step 8 — Daily Pro Digest (Pro › Daily Digest)
✅ Each section shows the newest item: Alpha Room message, Real-Time News headline, "Name — long ETH" research, upcoming Calendar event, and the airdrop name. Drafts never show. **Open Calendar** goes to `/world/calendar`.

## Step 9 — Free user sees none of it
As qa1, open each Pro tab above → ✅ the Pro teaser shows and **no** `[TEST]` text appears. (The Calendar is the exception: it's Plus.)

## Pass criteria
✅ Every published item shows on its tab with every field in the right place · ✅ drafts never show · ✅ edits show, deletes disappear · ✅ newest first · ✅ follow, Q&A ask/upvote and replay work · ✅ free users see only the teaser.

## If something's wrong
- **Item doesn't appear for qa2:** check it's *published*, not *draft*, in the admin list; the tabs update live, no reload needed.
- **qa2 sees the teaser:** qa2 lost Pro — re-grant on `/admin/subscriptions` (the automated setup does this itself).
- **Logo letter shows "["**: that's the `[TEST]` prefix; real names show their first letter.
