# Firestore rules: Pro/admin leaks found by QA (10 Oct 2026)

**Status (10 Oct 2026): ✅ deployed to kumami-dev · ⏳ NOT on production (`kumami-6df47`).**

- `firestore.rules` in the repo now contains the fix. It was deployed to **kumami-dev** with Andrew's go, using `npx tsx scripts/deploy-firestore-rules.ts` (dev-only; `--rollback` restores the previous ruleset).
- Rules belong to a Firebase *project*, not to an app or branch. **The deployed dev website (`kumami-web-next--kumami-dev…hosted.app`) uses the production project `kumami-6df47`** (its bundle initialises Firebase with `projectId: "kumami-6df47"`; checked 10 Oct). So the dev website — and kumami.world — still have the holes until the rules are deployed to production.
- **Production deploy (Andrew):** `firebase deploy --only firestore:rules --project kumami-6df47`, after the checks under "What could break" below. Do it before (or with) the next dev → main release.

Additional fixes beyond the original proposal, included in the deploy:
- Pro reads also respect a time-limited grant's end date (`proUntil`), same as `src/lib/pro.ts`.
- The owner can't write the server-only grant fields either (`proUntil`, `proSource`, `proGrantedBy`, `proGrantedAt`, `subscriptionId`, referral counters).
- Event Q&A: reading, asking and upvoting are for Pro subscribers (reading also for admins).

Not changed (needs your decision): `alphaRoom` is readable by any signed-in user and `marketAnalysis` is public. Both are shown as Pro content but may be used by older public pages, so they were left as-is.

The access-matrix QA (`qa/features/access-matrix.spec.ts`, section 4) probes each hole with a real free account (now qa0, a brand-new account each run) on kumami-dev, through the Firestore REST API, which enforces the same rules as the browser SDK. Since the deploy, all four are blocked (403) and the `test.fail()` markers are removed. Extra probes check that logged-out reads are blocked, that profile-name edits and unsubscribe still work, and that Pro users and admins can still read Pro content.

## The holes

| # | What a signed-in free user can do today | Why | Impact |
|---|---|---|---|
| 1 | Set `isPremium: true` on their own `users/{uid}` doc | `allow update: if request.auth.uid == userId` (any field) | Free Pro for anyone with a browser console |
| 2 | Set `role: 'superadmin'` on their own doc | same rule | **Full admin access** (admin dashboard, writes to all admin-only collections) |
| 3 | Create a `subscriptions` doc with `status: 'active'` for themselves | `allow create` only checks `userId == auth.uid` | Fake active subscription |
| 4 | Read every `pro_*` collection (research calls, airdrops, news, events, calendar, settings) | `allow read: if proCollection.matches('pro_.*')` (no auth check at all) | Pro content readable without paying, even logged out |

## Proposed rules (diff against current `firestore.rules`)

```diff
     match /users/{userId} {
       allow read: if request.auth != null && (request.auth.uid == userId || isSuperAdmin());
-      allow create: if request.auth != null && request.auth.uid == userId;
+      // New accounts start as plain, unsubscribed users.
+      allow create: if request.auth != null && request.auth.uid == userId
+        && request.resource.data.get('role', 'user') == 'user'
+        && request.resource.data.get('isPremium', false) == false
+        && request.resource.data.get('isAdmin', false) == false;
       allow update: if request.auth != null && (
-        request.auth.uid == userId ||
+        (request.auth.uid == userId
+          // Owners may edit their profile, but never grant themselves privileges.
+          && !request.resource.data.diff(resource.data).affectedKeys()
+               .hasAny(['role', 'isAdmin', 'referralRewards', 'referralCount', 'subscriptionId'])
+          // isPremium may only be switched OFF by the owner (unsubscribe), never on.
+          && (!request.resource.data.diff(resource.data).affectedKeys().hasAny(['isPremium'])
+              || request.resource.data.isPremium == false)
+          // subscriptionStatus may only move to a cancelled state.
+          && (!request.resource.data.diff(resource.data).affectedKeys().hasAny(['subscriptionStatus'])
+              || request.resource.data.subscriptionStatus in ['cancelled', 'cancelled-immediate'])) ||
         (isSuperAdmin() && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['role']))
       );

     match /subscriptions/{subscriptionId} {
-      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
+      // Active subscriptions are created server-side (payment webhook / Admin SDK) only.
+      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid
+        && request.resource.data.status == 'pending';

     match /{proCollection}/{docId} {
-      allow read: if proCollection.matches('pro_.*');
+      // Pro content: subscribers and admins only.
+      allow read: if proCollection.matches('pro_.*') && (isPremiumUser() || isAdmin());

+    function isPremiumUser() {
+      return request.auth != null
+        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.get('isPremium', false) == true;
+    }
```

(Event Q&A under `pro_events/{id}/questions` keeps its own rules, but its reads should also require `isPremiumUser() || isAdmin()`.)

## What could break (check before deploying to prod)

- **The legacy subscribe flow.** If the current production subscribe page creates `subscriptions` docs with `status: 'active'` from the browser, rule #3 blocks it. Andrew is revamping that endpoint; the new one should set `active` server-side (webhook or Admin SDK) and `isPremium` via the Admin SDK.
- **Unsubscribe (Profile).** It still works: it writes `subscriptionStatus: cancelled*` and `isPremium: false`, both of which stay allowed. It also updates `subscriptions/{id}`, which only admins may update today, so that part already fails silently. Separate issue.
- **Pro content reads cost one extra document read** (`isPremiumUser()` does a `get()`), on each Pro-content query.
- **Daily Digest, Events Q&A and admin pages** read `pro_*` from the browser. Subscribers and admins still pass.
- Server code uses the Admin SDK, which bypasses rules, so the APIs are unaffected.

## How to roll out

1. Deploy to **kumami-dev** first: `firebase deploy --only firestore:rules --project kumami-dev`.
2. Run `npx playwright test qa/features/access-matrix.spec.ts`. The four section-4 tests should now fail **as passes**: remove their `test.fail()` markers, then re-run until green.
3. Smoke-test subscribe/unsubscribe, the admin pages and Pro tabs on dev.
4. Deploy to prod (`--project kumami-6df47`) with Andrew.
