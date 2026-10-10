# QA — admin-managed Plus & Pro content + new QA personas · 10 Oct 2026 · dev

**Scope (Andrew):**
- qa3 creates believable items with "[TEST]" at the start of every text; qa2 checks they show correctly ("nothing out of place"); qa1 must not see Pro content.
- Covered: Kumami Research, Airdrops & Whitelist, Real-Time News, Events & Announcements (incl. Q&A), Calendar team events (+ feed switches), Subscriptions, Alpha Room, Market Analysis. Plus the Daily Pro Digest roll-up and Following & Alerts.
- `[TEST]` content is **kept until the next run**; the next run deletes it first.

**Personas (new):**
- **qa0:** brand-new account every run, deleted after. Runs everything that changes an account: Grant / expiry / Remove Pro, Firestore-rules probes, the sign-up name.
- **qa1:** fixed free user.
- **qa2:** fixed Pro user (qa3 grants it on `/admin/subscriptions`, no end date, whenever it isn't Pro).
- **qa3:** fixed superadmin, not subscribed.

Fixed credentials were generated into `.env.local` (`QA1_EMAIL` … `QA3_PASSWORD`). Each run re-checks the fixed accounts' state.

## Result: ✅ clean, after 2 app fixes

| Suite | Desktop | Mobile |
|---|---|---|
| **admin-content (new, 22)** | ✅ 22/22 | — (authoring is desktop-only) |
| access-matrix: UI (58) | ✅ 58/58 | — |
| access-matrix: API, cross-check, Firestore rules (qa0), Subscriptions (qa0) | ✅ 15/15 | — |
| plus-pro-tools + calendar + sidebar + smoke | ✅ 46/46 | ✅ 38 passed, 2 desktop-only skipped |
| Unit tests / tsc / lint | ✅ 680 passed / clean / clean | |

### What qa2 verified per type
- **Kumami Research:** name, role, "Nm ago", green LONG ETH pill, call text, "What this means for you" box; newest first; draft hidden; edit shows; delete removes.
- **Airdrops & Whitelist:** each sub-tab shows only its category. Cards show the logo letter, eligibility badge, description, deadline and value. The detail page has the checklist (✓ green / ✗ red per item), Deadline and Estimated value. Follow → Following, then listed in Following & Alerts.
- **Real-Time News:** HH:MM + "just now", headline, summary, tags, green BULLISH / red BEARISH, source; newest first; draft hidden.
- **Events:**
  - Live event: Live now badge, "date · host" and the YouTube embed. qa2 asks a question, which appears with 1 vote. One upvote takes it to 2, and a second click doesn't count. A new session still sees 2.
  - Upcoming (not live) and Past sections; Watch replay / Hide.
  - Draft hidden, spare edited then deleted.
- **Calendar:** both team events show with ★ for qa2 **and** qa1 (Calendar is Plus), with the HIGH and MED tooltips and the description on click; draft hidden. The feed switches are covered by `calendar.spec.ts` (still OFF by default).
- **Alpha Room:** the message is newest, posted as "Kumami World".
- **Market Analysis:** image uploaded through the admin form; shown first (01/0N) with the image loaded, the title and the text.
- **Daily Digest:** the newest Alpha, News, Research ("Name — long ETH"), Calendar and Airdrop items; drafts never show; the Calendar link opens `/world/calendar`.
- **qa1:** every Pro tab shows the teaser and no `[TEST]` text.

## Bugs found and fixed
1. **Following & Alerts listed a followed airdrop by its database ID** ("hBpbdVQwBOFayga28qPc (airdrop)"). → It now shows "<airdrop name> · Airdrop". An airdrop that was deleted or unpublished shows "An airdrop that is no longer listed", and can still be unfollowed. (`FollowingAlerts.tsx`)
2. **The Daily Digest wasn't "newest first"** as its header says. It took the first 3 items in database order, so with more content the latest posts could be missing. → It now sorts by publish time before taking 3. (`DailyDigest.tsx`)

## Noticed, not changed (your call)
- **The airdrop logo letter is "["** for `[TEST]` items. That's only the prefix; real names show their first letter. The admin list does the same.
- **Daily Digest → Calendar shows raw dates** ("2026-10-12") where other places say "Oct 12".
- **Same-second publishes:** the Pro tabs sort by publish time to the second, so two items published within the same second can swap places. Real admins won't hit this; the test waits 1s between publishes.
- **kumami-dev Alpha Room has old empty messages** (blank bubbles from Nov 15). That's existing data; delete them at `/admin/alpha-room` if you like.
- **Market Analysis renders its content as HTML** (`dangerouslySetInnerHTML`). Only admins can write it, so the risk is low, but a hacked admin account could inject script. Worth sanitising before main.
- **Firestore rules holes** are unchanged and still need the rules deploy (`docs/security/2026-10-10-firestore-rules-pro-leaks.md`). These are separate from the admin UI: a signed-in user can still write to their own `users` doc from the browser.

## Where the [TEST] items are now (kumami-dev)
The last run was admin-content, so its items are live on kumami-dev:
- 1 research call + 1 draft
- an airdrop + a whitelist + 1 draft
- 1 headline + 1 draft
- live, upcoming and past events (with the Q&A question) + 1 draft
- 2 calendar events + 1 draft
- 1 alpha message
- 1 market analysis

Sign in as qa2 (`.env.local`) to see them. The next QA run deletes them.

## How to re-run
```bash
npx playwright test qa/features/access-matrix.spec.ts --project=desktop -g "UI —"
npx playwright test qa/features/access-matrix.spec.ts --project=desktop -g "API —|Cross-check|Firestore rules|Subscriptions admin tool"
npx playwright test qa/features/plus-pro-tools.spec.ts qa/features/calendar.spec.ts qa/features/sidebar-workspaces.spec.ts qa/smoke.spec.ts --project=desktop
npx playwright test qa/smoke.spec.ts qa/features/sidebar-workspaces.spec.ts qa/features/plus-pro-tools.spec.ts --project=mobile
npx playwright test qa/features/admin-content.spec.ts --project=desktop   # last, so its [TEST] items stay for review
```

## Addendum — Firestore rules fix deployed to kumami-dev (10 Oct 2026, Andrew's go)
- `firestore.rules` deployed to **kumami-dev** with `npx tsx scripts/deploy-firestore-rules.ts`. **Not on production**, and the deployed dev website uses production Firebase (`kumami-6df47`), so it still has the holes until Andrew deploys to prod. Details: `docs/security/2026-10-10-firestore-rules-pro-leaks.md`.
- **Access-matrix rules section: ✅ 19/19.** All four holes are now blocked (the `test.fail` markers are removed). New probes check that:
  - logged-out reads are blocked;
  - an owner can't write grant fields;
  - profile-name edits and unsubscribe still work;
  - Pro users and admins still read Pro content.
- **Full regression re-run under the new rules:** ✅ UI matrix 58/58, ✅ desktop specs + smoke 46/46, ✅ mobile 38/38 (2 skipped), ✅ admin-content 22/22 (Pro reads, Q&A ask/upvote and admin writes all work). The [TEST] items from this last run are live on kumami-dev.
