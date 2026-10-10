---
name: kumami-feature-workflow
description: >-
  The end-to-end Kumami development pipeline (docs/DEVELOPMENT_WORKFLOW.md) — use it for
  any request to build, change or fix a Kumami feature, or anything starting from
  Rachelle's product doc ("Rachelle sent a new spec", "build X from the spec", "add X to
  my spec as planned", "run the full workflow for X", "skip the gates"). It sequences the
  stages and the other skills — rachelle-gap-analysis (intake), product-spec-doc-update
  (PLANNED then SHIP mode), product-spec-to-feature (plan + build), kumami-qa
  (Playwright QA + how-to-test) — with approval gates, the definition of done, and the
  git rule: work and push on dev (or feat/* merged into dev), NEVER main.
---

# Kumami feature workflow (orchestrator)

The human-readable version is `docs/DEVELOPMENT_WORKFLOW.md`. Keep them in sync:
if you change the process here, change the doc too.

## Figure out the entry point

| The user's request | Start at |
|---|---|
| New or updated Rachelle doc, "what's new / what's missing" | Stage 0 |
| "Add/translate X into my spec", "flag as planned" | Stage 1 |
| "Plan the planned X" | Stage 2 |
| "Build X" / "build docs/plans/…" (a plan exists) | Stage 3 |
| A small bug fix / tweak Andrew describes directly | Stage 3 (a short plan in chat is enough). Still do 4 → 7 |
| "QA X" / "test X" | Stage 5 only (then 6 if you fixed anything) |
| "Run the full workflow for X, skip the gates" | Stage 1 → 7 without stopping |

Use the task list to track stages for anything bigger than a one-file fix.

## Stages

0. **Intake** → `rachelle-gap-analysis`. Output: refreshed gap report and a short list of candidates. Ask Andrew what to pick.
1. **Translate** → `product-spec-doc-update` PLANNED mode. Add a `(Planned)` section or a `Planned changes (vX.Y)` sub-section, with a minor version bump and a "Planned:" release note. **🚦 Gate 1:** paste the planned text and wait.
2. **Plan** → `product-spec-to-feature` §1–3. Probe endpoints, then write `docs/plans/YYYY-MM-DD-<feature>.md` including the **QA checklist**. **🚦 Gate 2:** summarise and wait.
3. **Build** → `product-spec-to-feature` §4. Use `feat/<feature>` from `dev` for multi-commit work, or `dev` directly for small fixes. Add unit tests for every rule.
4. **Check:** `npx vitest run`, `npx tsc --noEmit`, `npx eslint <changed>` (pre-existing errors only), `npm run build`.
5. **QA** → `kumami-qa`. Run smoke plus `qa/features/<feature>.spec.ts` from the plan's checklist, do the exploratory screenshot review, fix and re-run. Output: `docs/qa/…` and `testing/…/how-to-test.md`.
6. **Ship the docs** → `product-spec-doc-update` SHIP mode (`ship_planned`, rewrite to as-built, minor bump, "Shipped:" note), then `rachelle-gap-analysis` (flip closed rows, bump the report version).
7. **Push and report.** Merge `feat/*` into `dev` with `--no-ff`, push `dev`, delete the feature branch. Report to Andrew:
   - what was built (plain language)
   - QA result (checks passed, bugs found and fixed, known issues)
   - the how-to-test path
   - the new spec-doc version and its release note
   - the gap-report change
   - anything that needs his decision

Gates can be skipped only when Andrew says so ("skip the gates", "just do it"), or for trivial fixes. When skipping, still show the planned text and plan summary in the final report.

## Git rules (hard)

- Allowed: commit on `dev`; create `feat/*` from `dev`; merge `feat/*` → `dev`; push `dev` / `feat/*`; fetch and read `origin/main`.
- **Never:** commit to, merge into, rebase onto or push `main`, or open/merge a PR targeting `main`. Never force-push `dev`. Releasing `dev` → `main` is Andrew's decision and his action.
- Don't commit Andrew's unrelated uncommitted files (check `git status` and stage only your own files). Never commit `.env*`, `qa/.auth/` or `qa/artifacts/`.
- Commit message prefixes: `feat(...)`, `fix(...)`, `test(qa): …`, `docs(spec): vX.Y — …`, `docs(gap-report): vX.Y — …`, `docs(plan): …`. End commits with the attribution line the session gives you.

## Definition of done (all must hold before you say "done")

- [ ] Built per the approved plan; anything deferred is written down
- [ ] vitest, tsc and build pass; no new lint errors
- [ ] `kumami-qa` is clean or has known issues listed; QA report written; screenshots reviewed
- [ ] `how-to-test.md` written or updated, and indexed in `testing/README.md`
- [ ] Andrew's spec: `(Planned)` removed for shipped items, version bumped, release notes added
- [ ] Gap report refreshed
- [ ] On `dev` and pushed; `main` untouched

## Environment quick facts

- Local `.env.local` → kumami-dev. It needs `COINGLASS_API_KEY`, `FIREBASE_SERVICE_ACCOUNT_JSON` and the `QA_*` accounts.
- CoinGlass plan is STARTUP. The locked endpoints are listed in the gap report.
- The market cache is shared in Firestore. Version cache keys when an endpoint's params change.
- There's no confirmed dev deployment URL and no CI yet (see the workflow doc §9). "Test on dev" currently means local plus Playwright.
