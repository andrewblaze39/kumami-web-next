---
name: feature-test-tutorial
description: >-
  After building or changing any user-facing or internal feature in this repo,
  write a concrete, copy-pasteable manual test tutorial so the user can verify it
  themselves. ALWAYS produce one of these when you finish a feature slice, wire up
  a new admin tool, add a Pro dashboard tab, or otherwise ship something the user
  will want to check — even if they didn't explicitly ask "how do I test this".
  Especially important for internal/admin-authored tools, where testing means
  adding content in the dashboard and confirming it shows up correctly on the
  user-facing surface. Trigger whenever a feature is "done" and about to be handed
  back to the user for review.
---

# Feature Test Tutorial

When a feature is finished, the user should never have to guess how to check it.
Hand them a short, literal walkthrough they can follow in a couple of minutes,
with real data to paste in — not vague advice like "test the admin page".

The user works on a live product (Firebase App Hosting + Firestore) and often
tests by hand in the browser. Your job is to remove all friction: tell them
exactly where to click, exactly what to type, and exactly what they should see.

## Where the tutorial goes (required)

Every tutorial is **saved as a markdown file in the repo's `testing/` tree**, not
just printed in chat, so the user builds up a durable, categorized test suite.

- Path: `testing/<area>/<feature-slug>/how-to-test.md`
  - Categorize by product area, then feature. Examples:
    - `testing/pro/kumami-research/how-to-test.md`
    - `testing/pro/airdrops/how-to-test.md`
    - `testing/admin/role-management/how-to-test.md`
  - Use kebab-case slugs. Mirror how the feature is organized in the app (e.g.
    Pro dashboard tabs live under `testing/pro/`).
- After writing the file, update the index at `testing/README.md` — add a line
  linking to the new tutorial under its area (create `testing/README.md` if it
  doesn't exist yet).
- Then also give the user a short summary in chat and point them at the file path.
  The file is the source of truth; the chat message is the pointer.
- If you revise a feature later, update its existing `how-to-test.md` in place
  rather than creating a duplicate.

## When to write one

Produce a tutorial whenever you complete something the user will want to verify:
a Pro dashboard tab, an admin authoring tool, a new Firestore-backed feature, a
route, a form. Do it proactively as part of "done" — don't wait to be asked.

If the change has no observable behavior (pure refactor, types, comments), say so
briefly instead of inventing a test.

## The shape of a good tutorial

Write it as numbered steps a non-engineer could follow. Cover these, in order:

1. **Prerequisites** — what must be true first. Be specific to *this* feature:
   - Which account/role to sign in as (e.g. admin/superadmin to author; premium to
     view Pro content — note when one account satisfies both).
   - Which environment/project it hits (this repo's app points at **prod
     `kumami-6df47`** via `.env.local`; call out if data will be written to prod).
   - Any deploy that must have happened — e.g. **Firestore rules deployed**
     (`firebase deploy --only firestore:rules --project <project>`). A new
     collection without deployed rules fails with "Missing or insufficient
     permissions". See the firestore-rules memory.
   - How to run it: `npm run dev` → http://localhost:3000, or the live URL.

2. **Do the action** — the exact click path AND the direct URL (e.g. "`/admin` →
   Pro Dashboard → Kumami Research, or go straight to `/admin/pro-research`").

3. **Concrete sample data to enter** — this is the part people skip and shouldn't.
   Give ready-to-paste values, ideally **reused from the feature's own placeholder
   / fixture content** so the result looks like the original mockup. For a form,
   lay the fields out as a table with a column for which button to press
   (Publish vs Save Draft, etc.). Give 2-3 rows so the surface looks populated,
   and deliberately include at least one that exercises an edge case (a draft, an
   empty optional field).

4. **Verify on the user-facing surface** — where the content should appear and what
   it should look like. State the exact URL (e.g. `/world/pro?tab=research`) and
   the expected rendering (badges, layout, timestamp).

5. **Edge cases worth one line each** — the things that quietly break:
   - Drafts / unpublished items should NOT appear on the public surface.
   - Edit reflects (mention realtime if the read uses `onSnapshot`).
   - Delete removes it.
   - No `permission` errors in the browser console.

6. **Pass criteria** — a one-line checklist of ✅s so "did it work?" is unambiguous.

7. **Failure hint** — the most likely thing to go wrong and what it means (e.g.
   "if the tab says 'No … yet' after publishing, rules probably aren't deployed to
   the project the app points at, or you're signed out").

## Style

- Numbered steps, short sentences, real URLs and real values.
- Prefer a table for form fields with a "which button" column.
- Don't explain the implementation; explain what to do and what to expect.
- Keep it to what *this* feature needs — skip sections that don't apply (a
  read-only tab has no "enter data" step; a non-Firestore feature has no rules
  step).

## Internal admin-authored tools (the common case here)

Most new work is: admin authors content in `/admin` → it renders on a `/world/...`
surface. The canonical test is therefore **add it in the dashboard, then confirm
it shows up correctly on the user page**, including that drafts stay hidden and
edits/deletes propagate. Always frame the tutorial around that round trip.
