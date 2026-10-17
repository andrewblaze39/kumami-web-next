# Kumami Development Workflow

_How a change goes from Rachelle's request to a tested build on `dev`, and back into the product spec._
_Owner: Andrew · Last updated: 18 Oct 2026 (v2: one product spec, versioned back and forth with Rachelle)_

---

## 1. The short version

There is **one product spec**: the shared Google Doc "Kumami Product Spec". Every version is its **own file** in the shared Drive folder, and a version is never edited after it is shared. The versions take turns:

```
 BUILD version (Andrew)          REQUEST version (Rachelle)          BUILD version (Andrew)
 v1.14 = the website as built ─► v1.15 = v1.14 + her changes,    ─► v1.20 = the website as built,
 today. Rachelle tests the        each changed section marked         incl. her v1.15 changes that
 site against it.                 "(To be developed)", every          were built; "(To be developed)"
                                  change listed in Release notes      removed for those. Then repeat.
```

1. **Andrew shares a build version** (e.g. v1.14). It describes exactly what the website does today.
2. **Rachelle tests the website against it.** Where she wants something changed, she copies it to the next number (v1.15), edits the product sections, marks each changed section **`(To be developed)`**, and lists every change **per product** in the Release notes. Example: _"Plus · Flow Radar: delay 15 min → 30 min (To be developed)"_.
3. **Andrew develops the changes**, with Claude Code running the steps in section 3: clarify, plan, build, checks, QA.
4. **Andrew shares the next build version** (e.g. v1.20). It is the website as built: Rachelle's changes that shipped lose their `(To be developed)` label, and anything not built yet keeps it, with a note why. Its Release notes say what was built from v1.15 and what else changed.
5. Back to step 2.

The next version always takes the **next free number**, so build versions can jump when there were internal builds in between. For example, v1.15 to v1.19 were internal builds, so the next build version is **v1.20**.

**Only Andrew releases `dev` → `main`** (production).

---

## 2. The documents

| Document | What it is | Who writes it |
|---|---|---|
| Google Doc **"Kumami Product Spec vX.Y"**, one file per version | The product spec. Build versions = the website as built. Request versions = build version + Rachelle's `(To be developed)` changes. | Build versions: Andrew (Claude prepares them). Request versions: Rachelle. |
| `docs/Rachelle Product Specs/Kumami_World_Product_Spec_andrew.docx` | Claude's working copy of the next build version. Each build version is published from it as a new Google Doc. | Claude, via skill `product-spec-doc-update` |
| `docs/Rachelle Product Specs/versions/` | A downloaded copy of each request version Rachelle shares (so the changes can be read and compared in the repo) | Claude |
| `docs/plans/YYYY-MM-DD-<feature>.md` | The build plan for one change | Claude, via skill `product-spec-to-feature` |
| `testing/<area>/<feature>/how-to-test.md` | Click-by-click test steps for Andrew | Claude, via skill `kumami-qa` |
| `docs/qa/YYYY-MM-DD-<feature>.md` | The QA report | Claude, via skill `kumami-qa` |
| `docs/API.md` + `docs/DATABASE.md` | Every `/api/v1` endpoint and Firestore field: the contract for the Flutter app | Claude, via skill `api-db-docs` |
| FounderOS → Kumami → **Roadmap** | Every open item, by area and stage (To do · Building · Testing · Needs you · Done) | Claude, from the request version's `(To be developed)` items |

**Retired (18 Oct 2026):** Rachelle's separate requirement docs (`Kumami Website (N).docx`) and the gap report. Her requests now live inside the spec as `(To be developed)`, so there is nothing left to compare.

---

## 3. The steps

### Step 1 — Intake: read Rachelle's request version
- **Trigger:** Rachelle shares a new version (e.g. v1.15).
- **Do:** download it to `docs/Rachelle Product Specs/versions/`, list every `(To be developed)` section and every Release-notes line, and compare each with the current code: what changes, where, how big.
- **Output:** one roadmap item per change in FounderOS (area: Plus, Pro, Payments…; stage: To do). Unclear requests go to **Needs you**, with the question for Rachelle.
- **Done when:** Andrew has picked what to build first ("what's today?").

### Step 2 — Clarify, always
- **Skill:** `clarify-before-building`. Ask 3–5 short questions with a recommended answer, then confirm the scope in a few bullets.

### Step 3 — Design first (screens only)
- New or changed screens: 2–3 design options in Claude Design, sent to Andrew on Telegram with **Pick** buttons. Only the picked one is built.

### Step 4 — Plan
- **Skill:** `product-spec-to-feature`. Probe the data sources (CoinGlass on the live key), map onto the codebase, list risks.
- **Output:** `docs/plans/YYYY-MM-DD-<feature>.md` with the QA checklist. **Gate:** Andrew approves, or says "go" up front for small work.

### Step 5 — Build
- Small fixes on `dev`; bigger work on `feat/<name>` from `dev`, merged back into `dev`.
- Never show fake data; never name the data provider in the UI; thresholds live in the rule engines.

### Step 6 — Automated checks
`npx vitest run` · `npx tsc --noEmit` · `npx eslint <changed files>` · `npm run build`. All pass, no new lint errors.

### Step 7 — QA in a real browser
- **Skill:** `kumami-qa`. Playwright with the QA accounts on kumami-dev: smoke, spec conformance (against the request version), every button, data sanity, admin round trip, regression, desktop + mobile screenshots that are actually looked at. Bugs are fixed and QA re-run.
- **Output:** QA report, `how-to-test.md`, and the roadmap item moved to **Testing**.
- **Andrew checks** with the 3–5 clicks in `how-to-test.md` and says "good". The item moves to **Done**.

### Step 8 — Update the spec working copy
- **Skill:** `product-spec-doc-update`. Rewrite the section to describe what was actually built and remove its `(To be developed)` label, then add a line under the upcoming build version's Release notes: _"Built from v1.15: Plus · Flow Radar delay is now 30 min"_.
- If an API, webhook or database field changed: `api-db-docs`.
- Then `vault-sync` (second brain) and push `dev`.

### Step 9 — Share the next build version
- When the batch from a request version is done (or whenever Andrew decides), the working copy becomes the next build version: next free number, Release notes complete. Items not built keep `(To be developed)`, each with a short reason.
- Publish it as a new Google Doc **"Kumami Product Spec vX.Y"** in the shared folder (Claude prepares it; Andrew shares it with Rachelle and the CEO).

### Step 10 — Release to production (**Andrew only**)
Andrew merges `dev` → `main` when he chooses. Claude never commits to, merges into, rebases onto or pushes `main`.

**Release checklist (Claude reminds Andrew):**
- [ ] Firestore rules deployed to production if they changed (`firebase deploy --only firestore:rules --project kumami-6df47`).
- [ ] Production App Hosting env has every env var the new code needs.

---

## 4. Labels and Release notes in the spec

| Label / entry | Who writes it | Meaning |
|---|---|---|
| `(To be developed)` on a section heading | Rachelle (request version) | "Change this section to what I wrote." |
| `(To be developed)` kept in a build version, plus a short reason | Andrew | Not built yet: e.g. waiting on a decision or blocked by data. |
| Release notes in a request version, one line per change, grouped by product | Rachelle | The full list of what she wants changed, e.g. _"Plus · Flow Radar: delay 15 → 30 min"_ |
| Release notes in a build version: _"Built from v1.15: …"_, _"Also changed: …"_, _"Not built yet: …"_ | Andrew | What the website does differently from the previous build version |

Release notes are history: old entries are never edited. A version is never edited after it is shared; corrections go into the next version.

---

## 5. Git rules

| Allowed for Claude | Never |
|---|---|
| Commit on `dev`; create `feat/*` from `dev`; merge `feat/*` → `dev`; push `dev` and `feat/*` | Anything that changes `main`: commit, merge, rebase, push, or a PR into it |

Commit messages: `feat(...)`, `fix(...)`, `docs(spec): …`, `test(qa): …`.

---

## 6. Definition of done (per change)

- [ ] Clarified, and the design picked (for screens).
- [ ] Built per the approved plan; anything deferred written down.
- [ ] vitest, tsc, build pass; no new lint errors.
- [ ] QA clean (or known issues listed); QA report + `how-to-test.md`.
- [ ] Andrew checked it ("good"); roadmap item in **Done**.
- [ ] Spec working copy updated: section rewritten, `(To be developed)` removed, Release-notes line added.
- [ ] On `dev`, pushed; vault synced. `main` untouched.

---

## 7. How to ask Claude

| You say | What happens |
|---|---|
| "Rachelle shared v1.15" (link) | Step 1: changes listed, roadmap items created |
| "What's today?" | 1–2 roadmap items suggested; you pick |
| "Build X" | Steps 2–8 |
| "QA X" | Step 7 only |
| "Prepare the next build version" | Step 9 |

The orchestrating skill is `kumami-feature-workflow`.

---

## 8. Environment

- `.env.local` (kumami-dev): Firebase public config, `COINGLASS_API_KEY`, `FIREBASE_SERVICE_ACCOUNT_JSON`, and the QA personas (qa1 free, qa2 Pro, qa3 superadmin; qa0 brand-new each run).
- Playwright (Chromium) for Step 7; see `.claude/skills/kumami-qa/SKILL.md`.
- FounderOS on Andrew's PC (port 4100) for the roadmap and Telegram design reviews.

## 9. Known gaps in the workflow itself

- **No CI.** Checks run only when Claude or Andrew runs them.
- **Production is far behind `dev`.** Reconcile before the next release.
