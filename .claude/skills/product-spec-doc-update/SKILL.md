---
name: product-spec-doc-update
description: >-
  Maintain Andrew's product spec (docs/Rachelle Product
  Specs/Kumami_World_Product_Spec_andrew.docx) — the single source of truth for what
  Kumami does AND what is planned — with a version number, date and Release notes entry
  for every change. Two modes. PLANNED mode (workflow stage 1): translate a requirement
  from Rachelle's spec into a new section flagged "(Planned)" or a "Planned changes"
  sub-section, before any planning or code. SHIP mode (stage 6): after a feature is
  built and QA'd, remove the (Planned) flag, describe what was actually built, bump the
  version and add release notes. ALWAYS run ship mode after building, fixing or removing
  anything user- or admin-facing, before pushing — even if not asked. Also use for "add
  this to my spec as planned", "update the spec doc", "bump the doc version", or "what's
  planned / what changed between versions".
---

# Product spec doc update (as-built doc)

There are two kinds of product doc in `docs/Rachelle Product Specs/`:

| File | What it is | Who edits it |
|---|---|---|
| `Kumami Website (N).docx` (highest N = latest) | Rachelle's **requirements** — what she wants built | Rachelle only. Never edit. |
| `Kumami_World_Product_Spec_andrew.docx` | The **as-built** spec — what the website actually does today | This skill |

The doc describes reality, plus clearly flagged plans. Live sections only
claim what the code does; gaps go under "Known gaps". Anything not built yet
lives under a `(Planned)` heading or a `Planned changes` sub-section, so a
reader can always tell the two apart. Comparing it against Rachelle's doc is
the separate `rachelle-gap-analysis` skill. The full pipeline is in
`docs/DEVELOPMENT_WORKFLOW.md` (orchestrated by `kumami-feature-workflow`).

## Two modes

### PLANNED mode (workflow stage 1: translate Rachelle → Andrew's spec)

1. Read the requirement in Rachelle's latest `Kumami Website (N).docx` (extract it
   as in `rachelle-gap-analysis` step 1) and check the current code for what
   already exists.
2. Write it in Andrew's format (What it is / Where it is / How the user uses it /
   How we build it). Use plain language, include the thresholds and tables
   Rachelle specifies, and record Andrew's decisions where they differ from her
   (and say so).
3. Place it:
   - **New feature** → `d.add_planned_section("Kumami Plus", "9. Feature name", blocks, source="Rachelle's Kumami Website (6) §9", version="1.4")`.
     This adds a Heading2 `9. Feature name (Planned)` with an amber `PLANNED — from … · added in v1.4 · not live yet.` status line at the end of the tier.
   - **Change to a live feature** → `d.add_planned_changes("5. Calendar", blocks, source=…, version="1.4")`.
     This adds a Heading4 `Planned changes (v1.4)` at the end of that feature's section. **Do not touch the live description above it.**
4. Minor version bump. Release note: `Planned: <feature> (from Rachelle v6 §9) — <one line>`.
5. Stop at **Gate 1**. Show Andrew the planned text (paste it in chat) and wait for a go, unless he said to skip gates.

### SHIP mode (workflow stage 6: after build + QA)

1. `python -I .claude/skills/product-spec-doc-update/scripts/spec_doc.py planned "<doc>"` lists every open planned item.
2. For each item that shipped: `d.ship_planned(i)`.
   - For a `(Planned)` section, this removes the flag and the status line. Then rewrite the body to describe **what was built** (it often differs from the plan), and move deferred parts to "Known gaps".
   - For `Planned changes`, this deletes the sub-section. Fold the as-built behaviour into the live description and Known gaps.
3. Planned items that did **not** ship stay flagged. Say why in the release notes.
4. Minor version bump. Release note: `Shipped: <feature> — planned flag removed. <what's live, what's deferred>`.
5. Then run `rachelle-gap-analysis` so closed items flip to ✅.

## Document conventions (keep them)

- Title → italic subtitle → **version line** `Version X.Y · D Mon YYYY · reflects the dev branch at commit <sha>` → Contents (TOC field) → **Release notes** (Heading1, newest entry first) → Kumami Basic / Kumami Plus / Kumami Pro (Heading1).
- Each feature is a Heading2 `N. Name` with Heading3 sub-sections **What it is / Where it is / How the user uses it / How we build it** (Heading4 `Via API` / `Via Admin Dashboard (manual)` / `Known gaps`).
- Numbering is stable: other sections cross-reference "Pro §18". When a feature is removed, keep its number and retitle it `N. Name (removed)` with a 1–3 sentence note (date, why, where old links go). Don't renumber.
- Thresholds/verdict matrices go in tables (house style `LightGrid-Accent1`, via `TABLE()`).
- Screenshots: you can't re-capture them from here. If a section's UI changed, keep the image and change the caption to `Figure (captured before <date> — shows <old thing>; to be re-captured)`. Never leave a caption that describes UI that no longer exists.
- Dates are absolute (`9 Oct 2026`), never "today" or "last week".

## Versioning

- **Minor** bump (1.3 → 1.4) when something is added as planned, when a planned item ships, or when the product changed (feature added/removed/reworked).
- **Patch** bump (1.4 → 1.4.1) when only the doc was corrected to match unchanged code.
- One version per build/PR, not per file. If several commits land together, one entry covers them.
- Release-note entries are history — never rewrite or delete old ones. Corrections go in the new entry ("Corrections to v1.3 text: …").
- Every entry ends with a **"Not re-audited in this version"** bullet when you didn't check the whole doc. Say which sections you didn't verify.

## Editing mechanics (both modes)

### 1 · Work out what changed

```bash
python -I .claude/skills/product-spec-doc-update/scripts/spec_doc.py version "docs/Rachelle Product Specs/Kumami_World_Product_Spec_andrew.docx"
# the version line names the commit the doc reflects:
python -I -c "import sys;sys.path.insert(0,'.claude/skills/product-spec-doc-update/scripts');from spec_doc import SpecDoc;print(SpecDoc(sys.argv[1]).text(2))" "docs/Rachelle Product Specs/Kumami_World_Product_Spec_andrew.docx"
git log --oneline <that-sha>..HEAD          # everything since the doc was last synced
git diff --stat <that-sha>..HEAD -- src/
```

Read the commit messages and the diffs of user-facing code: pages under `src/app/world/(app)/`, `src/components/world/**`, `src/components/admin/**`, API routes under `src/app/api/**`, rule engines in `src/lib/market/rules/**`, and the nav in `src/components/world/shell/Sidebar.tsx` and `src/components/world/pro/WorldProContent.tsx`.

### 2 · Verify against the code, not the commit message

For every section you touch, open the actual component, route or rule and confirm: what the user sees, the tier gating, data sources and cache TTLs, thresholds, admin fields, and empty/error behaviour. Commit messages and old doc text have been wrong before. In v1.3, for example, the doc called Plus Flow Radar "real-time" when it is delayed 30 min. If you find an older statement that's wrong, fix it and list it under "Corrections".

### 3 · Locate the blocks to edit

```bash
python -I .claude/skills/product-spec-doc-update/scripts/spec_doc.py outline "docs/Rachelle Product Specs/Kumami_World_Product_Spec_andrew.docx" [start] [end]
```

This prints `index|style|text` per top-level block. Tables are one block (`TABLE`) and images show as `[IMG]`. Python's `-I` flag ignores `PYTHONIOENCODING`, so the CLI reconfigures stdout to UTF-8 itself. In your own snippets, call `sys.stdout.reconfigure(encoding="utf-8")`.

### 4 · Write a one-off edit script (in `$TEMP`, not the repo)

Use the helpers in `scripts/spec_doc.py`. They're stdlib only (no lxml/pandoc/Word needed on this Windows box). Find blocks **by text**, never by hard-coded index, so the script stays correct as earlier edits shift indices.

```python
import sys; sys.path.insert(0, r".claude/skills/product-spec-doc-update/scripts")
from spec_doc import SpecDoc, P, H, BULLET, TABLE
DOC = r"docs/Rachelle Product Specs/Kumami_World_Product_Spec_andrew.docx"
d = SpecDoc(DOC)

d.set_version("1.4", "2026-10-20", "<short sha of the code commit>")
d.add_release_entry("1.4", "2026-10-20", summary="One-line why.", bullets=[
    [("Calendar (Plus §5). ", {"b": True}), ("Day/week toggle added …", {})],
    [("Not re-audited in this version: ", {"b": True}), ("…", {"i": True})],
])

s = d.find("5. Calendar", style="Heading2")              # section start
d.replace_text(d.find("Read the “Next up” card", start=s), "…new text…")
d.replace_in(d.find("Macro events:", start=s), "60 days ahead", "90 days ahead")
d.insert_after(d.find("Known gaps", style="Heading4", start=s), [BULLET("…")])
d.replace_section_body(s, [...])                        # full rewrite, keeps the heading
imgs = [b for b in d.blocks[s:d.section_end(s)] if "<w:drawing" in b]   # keep screenshots when rewriting
d.save()
```

Other helpers: `delete(i, j)`, `insert_before`, `set_cell(table_i, row, col, text)`, `table_rows(table_i)`, `section_end(i)`, `PAGE_BREAK()`. `P(runs, style=None, italic=False, bold=False)` takes either a string or a run list `[(text, {"b":…, "i":…})]`.

### 5 · Check the file

```bash
python -I .claude/skills/product-spec-doc-update/scripts/spec_doc.py check "<doc>"     # XML well-formed
npx -y mammoth "<doc>" "$TEMP/spec.html"                                                # an independent parser must read it
python -I .claude/skills/product-spec-doc-update/scripts/spec_doc.py outline "<doc>" 0 40   # version line + release notes look right
```

Also check that every `pStyle` you used exists in `word/styles.xml` (the house styles are Title, Heading1–5, ListBullet). If Word or LibreOffice is available, open it and update the TOC. Neither is installed on Andrew's machine as of Oct 2026.

### 6 · Commit with the code (on `dev` — never `main`)

Commit the doc in the same push as the code it describes, or immediately after it: `docs(spec): v1.4 — <summary>`. In your reply, tell the user the new version number and give a 3–6 bullet summary of the release notes. If a screenshot is now stale, say which ones need re-capturing.

## Don'ts

- Don't touch Rachelle's `Kumami Website (N).docx` files.
- Don't describe planned work as live. Don't drop a known gap just because it's awkward.
- Don't pretty-print or reformat `document.xml`. The helper only rewrites the blocks you edit.
- Don't put the CoinGlass name in customer-facing copy. This doc is internal, so naming providers here is fine.
