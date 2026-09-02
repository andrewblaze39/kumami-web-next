# How to test — Pro › Events & Announcements

Admin-authored live sessions + replays with an embedded YouTube video and, for
live events, realtime audience Q&A.

- **Admin:** `/admin/pro-events` · **Surface:** `/world/pro?tab=events`
- **Collections:** `pro_events` (wildcard) + `pro_events/{id}/questions` subcollection

## Prerequisites
- Signed in as **admin/superadmin** (to author). Any signed-in user can ask/upvote.
- App points at **prod `kumami-6df47`**.
- **Rules:** this tab's Q&A needs the two rules added in this batch —
  `users/{uid}/pro/{doc}` and `pro_events/{eventId}/questions`. **Deploy them
  first** (see below) or Q&A/upvote will fail with a permissions error.
- `npm run dev` → http://localhost:3000 (or live site).

## Step 1 — Add events at `/admin/pro-events`

| Title | Date / time label | Host | Status | YouTube (id or URL) | Live? | Button |
|---|---|---|---|---|---|---|
| Live Q&A: Reading the Flow Radar | Today · 3:00 PM UTC | Kumami Research | upcoming | dQw4w9WgXcQ | ✅ ticked | **Publish** |
| Q3 Roadmap AMA | Next week | Kumami Team | upcoming | (blank) | ☐ | **Publish** |
| Security Scanner Deep Dive | Last month | Kumami Team | past | dQw4w9WgXcQ | ☐ | **Publish** |

(The YouTube field accepts a raw id or a full link — it extracts the id.)

## Step 2 — Verify on `/world/pro?tab=events`
- ✅ **Live & upcoming:** the live event shows a red **Live now** badge, an embedded
  YouTube player, a "Submit a question" box, and (empty at first) a Q&A list. The
  non-live AMA shows as a plain scheduled card.
- ✅ **Past events:** the Deep Dive shows with a **Watch replay** button that
  expands the embedded video.

## Step 3 — Test Q&A (as any signed-in user)
- Type a question + Enter → it appears in the list with 1 vote.
- Click the ▲ vote button on a question → count goes up; the button locks (you
  can't double-vote); the list re-sorts by votes. Open in a second account/tab →
  the new question/vote appears in realtime.

## Step 4 — Edit & delete (admin)
- Untick **Live** on the Q&A event → **Update & Publish** → the badge + Q&A
  disappear on the tab (it becomes a scheduled card).
- Delete an event → gone.

## Pass criteria
live badge + embed ✅ · Q&A submit/upvote/realtime ✅ · no double-vote ✅ · past
replay expands ✅ · draft/live toggles reflect ✅ · no permission errors ✅

## Required rules deploy (once)
```
firebase deploy --only firestore:rules --project kumami-6df47
firebase deploy --only firestore:rules --project kumami-dev
```
