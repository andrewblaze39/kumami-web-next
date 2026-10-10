---
name: product-spec-to-feature
description: >-
  Workflow stage 2 (and 3) — turn a "(Planned)" section or "Planned changes"
  sub-section in Andrew's spec (docs/Rachelle Product Specs/Kumami_World_Product_Spec_andrew.docx)
  into a written build plan in docs/plans/, after probing CoinGlass feasibility on the
  live key, then implement it following this repo's market-platform patterns. Use when
  the user says "plan the planned X section", "write the plan for X", "build docs/plans/…",
  or names a spec feature to build. If the requirement is still only in Rachelle's doc
  (not yet in Andrew's spec as Planned), do stage 1 first with product-spec-doc-update.
---

# Planned spec → plan → feature

Part of the pipeline in `docs/DEVELOPMENT_WORKFLOW.md` (orchestrated by
`kumami-feature-workflow`). **Input is Andrew's spec, not Rachelle's.**
Rachelle's `Kumami Website (N).docx` is translated into Andrew's spec first (stage
1, `product-spec-doc-update` PLANNED mode). This skill plans and builds from
that translated section, because it already carries Andrew's decisions.

## 1 · Read the planned section

```bash
python -I .claude/skills/product-spec-doc-update/scripts/spec_doc.py planned "docs/Rachelle Product Specs/Kumami_World_Product_Spec_andrew.docx"
python -I .claude/skills/product-spec-doc-update/scripts/spec_doc.py outline "docs/Rachelle Product Specs/Kumami_World_Product_Spec_andrew.docx" <start> <end>
```

Read the whole planned section, including its tables, which hold the thresholds and verdict matrices (`SpecDoc.table_rows(i)`). The status line names the Rachelle source (e.g. `Kumami Website (6) §7`). Open that part of her doc too, for detail the translation may have summarised. Paragraphs and tables in order:

```python
import sys; sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, r".claude/skills/product-spec-doc-update/scripts")
from spec_doc import SpecDoc
d = SpecDoc(r"docs/Rachelle Product Specs/Kumami Website (6).docx")
s = d.find("7. CALENDAR", style="Heading1")
for k in range(s, d.section_end(s)):
    if d.style(k) == "TABLE":
        for r in d.table_rows(k): print("ROW |", " | ".join(r))
    elif d.text(k).strip(): print(f"{d.style(k)}|{d.text(k)}")
```

If the planned section is missing or contradicts Rachelle's doc, stop and ask. Don't silently pick one.

### Mockups
Rachelle links mockups as `claude.ai/artifact/…` or `claude.ai/code/artifact/…`. Try the Artifact tool's `read` action with a prompt asking for layout, labels, colours and interactions. In Oct 2026 her main mockup returned only a loading shell. If that happens, fall back to the spec text and the app's design system (`world.css`, turquoise `--accent`), and say in the plan that the mockup couldn't be read.

## 2 · Check feasibility before planning (critical)

The key is on CoinGlass **STARTUP**. Some endpoints answer HTTP 200 with `{"code":"401","msg":"Upgrade plan"}`. Probe **every** endpoint the section needs. Never assume, because the plan and the endpoints change:

```bash
K=$(grep '^COINGLASS_API_KEY=' .env.local | cut -d= -f2-)      # never print the key
curl -s -H "CG-API-KEY: $K" "https://open-api-v4.coinglass.com/api/user/account/subscription"
curl -s -H "CG-API-KEY: $K" "https://open-api-v4.coinglass.com<endpoint>?<params>" | head -c 300
```

As of 9 Oct 2026:
- **Locked:** `spot/coins-markets`, `futures/coins-markets`, the liquidation heatmaps and `orderbook/large-limit-order`.
- **Open:** the aggregated CVD, funding, OI, netflow, `pairs-markets`, `exchange/chain/tx/list`, `hyperliquid/whale-alert` and `whale-position`, `orderbook/aggregated-ask-bids-history`, ETF, article, calendar and unlock endpoints.
- **Gotchas:** `calendar/economic-data` needs `start_time`/`end_time` to return future events. `coin/unlock-list` only returns today's unlocks.

## 3 · Write the plan → `docs/plans/YYYY-MM-DD-<feature>.md`

Use this template (keep it short and concrete):

```markdown
# Plan — <Feature> (spec v<doc version>, planned section "<heading>")
Source: Andrew's spec v1.4 "<heading>" ← Rachelle Kumami Website (6) §7
## Goal (2–3 lines, plain language)
## Feasibility
| Need | Endpoint / source | Probe result |
## Buildable now vs blocked
## Design (data → rule engine → contract → builder → route → UI; admin if any)
## Steps (ordered, each small enough to commit)
## Files to touch
## Tests to add (unit tests for every rule/threshold)
## QA checklist (what kumami-qa must verify — derived from the spec, one line per rule/button/state)
## Risks / open questions
## Out of scope (deferred, with reason)
```

The **QA checklist** is required. Stage 5 (`kumami-qa`) executes it, so write each line as a checkable fact: "HIGH macro event within 24h on BTC → attention popup lists it", not "popup works".

**🚦 Gate 2.** Show Andrew the plan summary and wait for a go, unless he said to skip gates or the change is trivial.

## 4 · Build (stage 3)

- **Branch:** small fixes go directly on `dev`. Multi-commit features use `git switch -c feat/<feature> dev` and get merged back into `dev` after QA. **Never touch `main`.**
- **Mirror the market-platform patterns:**
  - **Fetchers** → `src/lib/market/live/cg-endpoints.ts`: typed, `cgCached`, with a TTL that matches the spec's cadence. The cache lives in Firestore (`market_cache`) and is shared, so if you change an endpoint's params, **version its cache key** (e.g. `cg:econcal:v2`) or stale data will be served.
  - **Rule engine** → `src/lib/market/rules/<name>.ts`: a pure function that holds all the thresholds, with tests in `rules/__tests__`.
  - **Contract** → `src/lib/market/contracts.ts`.
  - **Builder** → `src/lib/market/live/<name>.ts`: fetch, feed the engine, assemble. `.catch` each source so one failure degrades only that part.
  - **Provider + route** → `MarketDataProvider`/`liveProvider` + `src/app/api/market/<name>/route.ts`. Use `authenticate()`, and add a route cache only if nothing admin-authored flows through it.
  - **UI** → client component under `src/components/world/`, using `world.css` `w-*` classes, consumed with `useMarketEndpoint`.
  - **Admin-authored content** → `src/components/admin/Publish*.tsx` writing to a `pro_*` collection (already covered by the wildcard Firestore rule; drafts via `status`), plus a nav item in `AdminLayout.tsx`.
- **Non-negotiables:**
  - Never render mock, placeholder or stale data. Show real data or an honest `—` / "No data" / loading / error state.
  - Never show the provider name ("CoinGlass") in the UI.
  - The LLM layer has no key wired yet. Ship the template fallback and add a `TODO(ai)`.
  - Use the spec's exact verdict colours, mapped to the nearest `Verdict['color']` token.
  - Local `/api/market/*` needs `FIREBASE_SERVICE_ACCOUNT_JSON` in `.env.local`. Without it every route returns 401.

## 5 · Check, then hand off to QA

Run `npx vitest run`, `npx tsc --noEmit`, `npx eslint <changed files>` (compare errors with `git stash` to separate pre-existing ones from new ones) and `npm run build`. When they pass, continue with **`kumami-qa`** (stage 5) using the plan's QA checklist. Then do `product-spec-doc-update` SHIP mode and `rachelle-gap-analysis` (stage 6), then push `dev` (stage 7). Don't report "done" before QA.

## Keep memory current

If the PM changes, the spec folder moves, the CoinGlass plan changes, or a decision supersedes earlier work, update the memory files.
