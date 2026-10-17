---
name: kumami-feature-workflow
description: >-
  The end-to-end Kumami development pipeline (docs/DEVELOPMENT_WORKFLOW.md, v2 of 18 Oct
  2026) — use it for any request to build, change or fix a Kumami feature, and whenever
  Rachelle shares a new version of the product spec ("Rachelle shared v1.15", "build X",
  "what's today?", "run the full workflow for X", "prepare the next build version", "skip
  the gates"). One product spec, versioned back and forth: Andrew's build versions = the
  website as built; Rachelle's request versions mark changes "(To be developed)". It
  sequences the skills — product-spec-doc-update (INTAKE / UPDATE / PUBLISH),
  clarify-before-building, product-spec-to-feature (plan + build), kumami-qa, api-db-docs,
  vault-sync — with gates, the definition of done, and the git rule: work and push on dev
  (or feat/* merged into dev), NEVER main.
---

# Kumami feature workflow (orchestrator)

The human-readable version is `docs/DEVELOPMENT_WORKFLOW.md` (and the one-page flow
`docs/workflow/kumami-development-flow.pdf`). Keep them in sync: if you change the
process here, change the doc and the PDF too.

## The document flow in one line

Build version (Andrew, website as built) → Rachelle tests the site → request version
(her changes marked `(To be developed)`, every change in Release notes per product) →
we build → next build version (next free number) → repeat. One Google Doc file per
version, never edited after sharing. Rachelle's old `Kumami Website (N).docx` docs and
the gap report are retired.

## Figure out the entry point

| The user's request | Start at |
|---|---|
| "Rachelle shared vX.Y" (a link or file) | Step 1 |
| "What's today?" | Read the FounderOS Kumami roadmap (`node <founder-os>/scripts/kumami.mjs roadmap`), suggest 1–2 items |
| "Build X" / a bug or tweak Andrew describes | Step 2 (a short plan in chat is enough for small fixes); still do 6 → 8 |
| "QA X" | Step 7 only (then 8 if you fixed anything) |
| "Prepare the next build version" | Step 9 |
| "Run the full workflow for X, skip the gates" | Steps 2 → 8 without stopping |

Use the task list for anything bigger than a one-file fix.

## Steps

1. **Intake** → `product-spec-doc-update` INTAKE mode. Download the request version, list its `(To be developed)` items and Release notes, one roadmap item each (stage To do; unclear → Needs you with the question for Rachelle). Ask Andrew what to build first.
2. **Clarify** → `clarify-before-building` (3–5 questions, recommended defaults, then the scope in bullets).
3. **Design first** (new or changed screens) → 2–3 options as a Claude Design canvas, rendered to PNGs and sent with `node <founder-os>/scripts/kumami.mjs design send …`; read the pick with `design status`. Build only the picked one.
4. **Plan** → `product-spec-to-feature` §1–3: probe endpoints, write `docs/plans/YYYY-MM-DD-<feature>.md` with the QA checklist. **🚦 Gate:** summarise and wait (unless "go" up front or trivial). Move the roadmap item to Building (`kumami.mjs set <id> stage=doing`).
5. **Build** → `product-spec-to-feature` §4. `feat/<feature>` from `dev` for multi-commit work, `dev` for small fixes. Unit tests for every rule.
6. **Check:** `npx vitest run`, `npx tsc --noEmit`, `npx eslint <changed>` (pre-existing errors only), `npm run build`.
7. **QA** → `kumami-qa` (spec conformance against the request version's text). Output: `docs/qa/…`, `testing/…/how-to-test.md`. Roadmap item → Testing (`stage=testing`); after Andrew says "good" → Done.
8. **Update the spec working copy** → `product-spec-doc-update` UPDATE mode (rewrite as built, drop `(To be developed)`, a line in the `vX.Y (in progress)` Release notes). Then `api-db-docs` if any API route, webhook, collection, field or rule changed; then `vault-sync`; then merge `feat/*` into `dev` with `--no-ff`, push `dev`, delete the branch, and report:
   - what was built (plain language)
   - QA result (passed, bugs fixed, known issues)
   - the how-to-test path (3–5 clicks for Andrew)
   - the Release-notes line added
   - vault notes updated
   - anything that needs his decision
9. **Publish the next build version** (when the batch is done or Andrew asks) → `product-spec-doc-update` PUBLISH mode.
10. **Release `dev` → `main`: Andrew only.** Remind him of the release checklist in the workflow doc.

Gates can be skipped only when Andrew says so, or for trivial fixes. When skipping, still show the plan summary in the final report.

## Git rules (hard)

- Allowed: commit on `dev`; create `feat/*` from `dev`; merge `feat/*` → `dev` (always approved); push `dev` / `feat/*`; fetch and read `origin/main`.
- **Never:** commit to, merge into, rebase onto or push `main`, or open/merge a PR targeting `main`. Never force-push `dev`.
- Don't commit Andrew's unrelated uncommitted files (stage only your own). Never commit `.env*`, `qa/.auth/` or `qa/artifacts/`.
- Commit prefixes: `feat(...)`, `fix(...)`, `test(qa): …`, `docs(spec): …`, `docs(plan): …`. End commits with the attribution line the session gives you.

## Definition of done (all must hold before you say "done")

- [ ] Clarified; design picked (screens)
- [ ] Built per the approved plan; anything deferred written down
- [ ] vitest, tsc and build pass; no new lint errors
- [ ] `kumami-qa` clean or known issues listed; QA report; screenshots reviewed
- [ ] `how-to-test.md` written or updated, indexed in `testing/README.md`
- [ ] Spec working copy: section as built, `(To be developed)` removed, Release-notes line added
- [ ] Roadmap item in Testing (Done after Andrew's "good")
- [ ] `vault-sync` run; map check passes
- [ ] On `dev` and pushed; `main` untouched

## Environment quick facts

- Local `.env.local` → kumami-dev: `COINGLASS_API_KEY`, `FIREBASE_SERVICE_ACCOUNT_JSON`, the `QA_*` accounts.
- CoinGlass plan is STARTUP (some endpoints locked).
- The market cache is shared in Firestore: version cache keys when an endpoint's params change.
- FounderOS (port 4100 on Andrew's PC) must be running for the roadmap CLI writes to show on the page and for `design send`.
