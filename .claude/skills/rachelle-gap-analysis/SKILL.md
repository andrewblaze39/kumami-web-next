---
name: rachelle-gap-analysis
description: Compare what Rachelle (the PM) asks for in her latest product spec (docs/Rachelle Product Specs/Kumami Website (N).docx) against what the website actually does, and write/refresh the plain-language gap report (Kumami_Gap_Report.docx, generated from Kumami_Gap_Report.data.json). Use when the user asks "what's missing vs Rachelle's doc", "where are the gaps", "compare against the spec/PRD", "what does Rachelle still expect", when Rachelle drops a new spec version, or after a build that closes or changes spec items (re-run so the report stays current). Not for editing the as-built spec — that's product-spec-doc-update.
---

# Rachelle gap analysis

Three documents, three jobs:

| Doc | Says | Maintained by |
|---|---|---|
| `Kumami Website (N).docx` (highest N) | What Rachelle **wants** | Rachelle — never edit |
| `Kumami_World_Product_Spec_andrew.docx` | What the site **does** (as-built) | `product-spec-doc-update` skill |
| `Kumami_Gap_Report.docx` (+ `.data.json`) | The **difference**, in plain language, with next steps | **this skill** |

The readers are Rachelle (PM) and Andrew — not necessarily engineers. Write the
report so a non-developer can act on it: short sentences, no code identifiers
in the "what Rachelle wants / what we have" columns unless the endpoint or page
name is the point.

## Source of truth = the JSON

`docs/Rachelle Product Specs/Kumami_Gap_Report.data.json` holds every finding.
The .docx is generated from it — **never hand-edit the .docx**, the next render
overwrites it. Workflow: re-audit → edit JSON → render → check → commit both.

```bash
python -I .claude/skills/rachelle-gap-analysis/scripts/render_gap_report.py \
  "docs/Rachelle Product Specs/Kumami_Gap_Report.data.json" \
  "docs/Rachelle Product Specs/Kumami_Gap_Report.docx"
```

The renderer (stdlib only) reuses the as-built spec doc's Word styles via
`product-spec-doc-update/scripts/spec_doc.py` → `create_from_template`.

### JSON fields

- `report_version` (bump: minor when findings change, patch for wording), `date` (ISO), `rachelle_doc`, `code_commit` (short sha audited), `asbuilt_version` (version line of the as-built doc).
- `summary`: 2–4 plain paragraphs — overall state of Plus, of Pro, and what the data plan blocks.
- `priorities`: ordered next steps `{title, why, effort}` — quick high-value fixes first, then decisions, then large builds. Effort `S` ≤ 1 day, `M` 2–4 days, `L` 1–2+ weeks.
- `decisions`: places the build intentionally differs from the written spec (often because it followed Rachelle's later mockup) or where her sheets contradict each other: `{topic, rachelle, built, question}`. These are NOT bugs; each needs a yes/no.
- `blocked`: endpoints that answer "Upgrade plan" on our key and what each would unlock.
- `sections[]`: one per tool, `{tier, tool, overall, note?, items[]}`; each item `{want, have, status, effort}`.
  `status` ∈ `done | partial | missing | blocked | decision`; `overall` uses the same keys.
- `release_notes[]`: append a new `{version, date, bullets}` every run (oldest first in the JSON; never delete old entries). Say what changed since the last report ("Closed: …", "New gap: …", "Re-classified: …") and what was **not** compared.

## How to audit (do every step — accuracy is the whole point)

### 1 · Read Rachelle's latest spec, in full

```bash
ls -t "docs/Rachelle Product Specs/"     # highest "Kumami Website (N)" is current
```
Extract paragraphs **and tables** in order (tables hold the thresholds):

```python
import sys; sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, r".claude/skills/product-spec-doc-update/scripts")
from spec_doc import SpecDoc
d = SpecDoc(r"docs/Rachelle Product Specs/Kumami Website (6).docx")
for k in range(len(d.blocks)):
    if d.style(k) == "TABLE":
        for r in d.table_rows(k): print("ROW |", " | ".join(r))
    elif d.text(k).strip(): print(f"{d.style(k)}|{d.text(k)}")
```

The file is a scrapbook of sheets (each starts with a `Title` paragraph). As of v6 the **current requirements** are the first two sheets — "Kumami Plus — Advanced Tab Complete Brief" and "Kumami Pro" (Flow Radar Pro, Watchlist Pro, Spot Pulse, Crypto Address Tracker) — plus the "Tools Info" tab list and "Future Development". Later sheets (Revisi Logic Plus, Advanced / Plus, Pro Tool Logic, Inputs, Naming Notes, News API, Education, Coinglass API) are older drafts or inputs. Use them only where the briefs are silent, and say so in the release notes. When a new N arrives, diff its sheet list against the previous file first. Some notes are in Indonesian (“build dari PRO dulu” = build the Pro version first; “PAKE YG INI YA” = use this one).

Rachelle's mockups are `claude.ai/artifact/…` links. Try the Artifact tool's `read` action. In Oct 2026 the linked mockup only returned a loading shell. If you can't read it, say so in the report rather than guessing. Code comments mentioning "per the latest mockup" record what was taken from it.

### 2 · Check each requirement against the code, not against the as-built doc

The as-built doc is a good map, but verify every row in source:
- Nav & tabs: `src/components/world/shell/Sidebar.tsx`, `src/components/world/pro/WorldProContent.tsx`, redirects in `src/app/world/(app)/*/page.tsx`.
- Rules/thresholds: `src/lib/market/rules/*.ts` (pure, each has tests in `__tests__`). Compare every number, band edge, label and colour with Rachelle's tables. Small threshold drift is the most common gap.
- Data/tiering/delay/cache: `src/lib/market/live/*.ts`, `src/app/api/market/*/route.ts`, `src/lib/market/gating.ts`.
- UI elements (columns, filters, toggles, popups): the page components.
- Admin-authored content: `src/components/admin/*`.

### 3 · Check every "blocked" claim against the live key

Never mark a row 🔒 from memory. The plan changes, and so do endpoints. Probe with the key from `.env.local`, without printing it:

```bash
K=$(grep '^COINGLASS_API_KEY=' .env.local | cut -d= -f2-)
curl -s -H "CG-API-KEY: $K" "https://open-api-v4.coinglass.com/api/user/account/subscription"   # plan level
curl -s -H "CG-API-KEY: $K" "https://open-api-v4.coinglass.com<endpoint>" | head -c 300           # {"code":"401","msg":"Upgrade plan"} = locked
```

HTTP 200 with `"code":"401"` in the body means locked. `"code":"0"` means available, so the item is ❌ missing (buildable), not 🔒 blocked. Status as of 9 Oct 2026 (STARTUP): locked are spot and futures `coins-markets`, the liquidation heatmaps and `orderbook/large-limit-order`. `exchange/chain/tx/list`, `hyperliquid/whale-position` and `orderbook/aggregated-ask-bids-history` are open.

### 4 · Classify honestly

- ✅ `done` only when the behaviour matches, including thresholds. "Exists but numbers differ" is 🟡 `partial`.
- ❌ `missing` means buildable today. 🔒 `blocked` means only the data plan stops it.
- ❓ `decision` applies when the build deliberately chose differently, or two of Rachelle's sheets disagree. Put the same topic in `decisions[]` with a concrete question.
- A row that's wrong in a way users would notice (e.g. a swapped rule) is ❌ even if a version exists. Explain it in plain words in `have`.

### 5 · Render, check, commit

```bash
python -I .claude/skills/rachelle-gap-analysis/scripts/render_gap_report.py "<json>" "<docx>"   # prints item counts, fails on bad XML
npx -y mammoth "<docx>" "$TEMP/gap.html"   # an independent parser must read it (a "Title style" notice is harmless)
```

Commit the JSON and the .docx together: `docs(gap-report): vX.Y — <headline>`. In your reply, give the counts per status, the top 3 priorities and the open decisions. Offer to start on priority #1.

## After a build

If a build closes or changes spec items, update the as-built doc (`product-spec-doc-update`) **and** re-run this skill. Flip the affected rows, bump `report_version`, and add a release-notes entry ("Closed: Console regime scoring now matches §1.1"). Keep `code_commit` pointing at the commit you actually audited.
