---
name: product-spec-doc-update
description: >-
  Maintain the Kumami product spec — one document, versioned back and forth with
  Rachelle (workflow v2, 18 Oct 2026): BUILD versions (Andrew) describe the website as
  built; REQUEST versions (Rachelle) are a copy with changed sections labelled
  "(To be developed)" and every change listed per product in the Release notes. Each
  version is its own Google Doc "Kumami Product Spec vX.Y"; the working copy is
  docs/Rachelle Product Specs/Kumami_World_Product_Spec_v1.18.docx. Three modes:
  INTAKE (Rachelle shared a request version: download, list the To-be-developed items,
  put them on the FounderOS roadmap), UPDATE (after anything user- or admin-facing is
  built, fixed or removed: rewrite the section as built, drop its label, add a Release
  notes line — ALWAYS before pushing, even if not asked), PUBLISH (prepare the next
  build version). Also use for "Rachelle shared v1.15", "update the spec", "prepare the
  next build version", "what changed between versions".
---

# Product spec doc (one document, versioned with Rachelle)

The full process is `docs/DEVELOPMENT_WORKFLOW.md` (orchestrated by
`kumami-feature-workflow`). In short:

| Version kind | Who | What it says |
|---|---|---|
| **Build version** (v1.14, v1.16, …) | Andrew (this skill prepares it) | Exactly what the website does today. Items not built yet keep `(To be developed)` plus a short reason. |
| **Request version** (v1.15, …) | Rachelle | The previous build version plus her changes: each changed section's heading ends with `(To be developed)`, and every change is one Release-notes line grouped by product ("Plus · Flow Radar: delay 15 → 30 min"). |

Each version is its **own Google Doc** "Kumami Product Spec vX.Y" in the shared
Drive folder, never edited after it is shared; the next one takes the next free
number. Our working copy is `docs/Rachelle Product Specs/Kumami_World_Product_Spec_v1.18.docx`.
Downloaded request versions live in `docs/Rachelle Product Specs/versions/`.

Retired 18 Oct 2026: Rachelle's separate `Kumami Website (N).docx` docs and the
gap report (`rachelle-gap-analysis`). Don't refresh the gap report any more.

## Three modes

### INTAKE (Rachelle shared a request version)

1. Download it (Google Drive connector: `download_file_content` as .docx, or ask
   Andrew to export it) to `docs/Rachelle Product Specs/versions/Kumami Product Spec vX.Y (Rachelle).docx`.
2. `python -I .claude/skills/product-spec-doc-update/scripts/spec_doc.py planned "<that file>"`
   lists every `(To be developed)` heading. Read each section and her Release notes;
   compare with the working copy and the code: what changes, where, how big.
3. One FounderOS roadmap item per change (`node <founder-os>/scripts/kumami.mjs add "<short title>
<detail, citing vX.Y and the section>" --area plus|pro|access-codes|payments|cashback|mobile-api|other --stage todo`).
   Unclear requests: `--stage waiting`, with the question for Rachelle in the detail.
4. Copy her `(To be developed)` sections into the working copy (keep the label) so it
   holds the requested text until it is built. Don't bump the version.
5. Tell Andrew the list (per product, one line each) and ask what to build first.

### UPDATE (after building, fixing or removing anything user- or admin-facing)

1. For each item that shipped: find its heading (`planned` lists them) and
   `d.ship_planned(i)` removes the `(To be developed)` label. Rewrite the body to
   describe **what was built** (it often differs from the request), deferred parts
   under "Known gaps".
2. Changes not from Rachelle (fixes, Andrew's own work) are written into their
   section the same way.
3. Add a line to the **upcoming build version's** Release-notes entry (create the
   entry `vX.Y (in progress)` if missing; X.Y = Rachelle's request version + 1):
   "Built from v1.15: Plus · Flow Radar delay is now 30 min", or "Also changed: …".
4. No version bump per change; the version is set when the build version is published.
5. Move the roadmap item to Testing / Done as the workflow says.

### PUBLISH (prepare the next build version)

1. Check every section still matches the code (see Editing mechanics, steps 1–2).
2. Items not built keep `(To be developed)` and get a one-line reason.
3. `d.set_version(...)` with Rachelle's request version + 1 (rename the file to `Kumami_World_Product_Spec_vX.Y.docx` with `git mv`); turn the `(in progress)` entry into
   the final Release-notes entry: "Built from vX.Y", "Also changed", "Not built yet".
4. Save, check (step 5 below), commit on `dev`, and give Andrew the .docx to publish as a
   new Google Doc "Kumami Product Spec vX.Y" (or upload it with the Google Drive
   connector when he says so). Never overwrite an older version.

## Document conventions (keep them)

- Title → italic subtitle → **version line** `Version X.Y · D Mon YYYY · reflects the dev branch at commit <sha>` → Contents (TOC field) → **Release notes** (Heading1, newest entry first) → Kumami Basic / Kumami Plus / Kumami Pro (Heading1).
- Each feature is a Heading2 `N. Name` with Heading3 sub-sections **What it is / Where it is / How the user uses it / How we build it** (Heading4 `Via API` / `Via Admin Dashboard (manual)` / `Known gaps`).
- Numbering is stable: other sections cross-reference "Pro §18". When a feature is removed, keep its number and retitle it `N. Name (removed)` with a 1–3 sentence note (date, why, where old links go). Don't renumber.
- Thresholds/verdict matrices go in tables (house style `LightGrid-Accent1`, via `TABLE()`).
- Screenshots: you can't re-capture them from here. If a section's UI changed, keep the image and change the caption to `Figure (captured before <date> — shows <old thing>; to be re-captured)`. Never leave a caption that describes UI that no longer exists.
- Dates are absolute (`9 Oct 2026`), never "today" or "last week".

## Versioning

- One version per **shared file**: a build version when Andrew publishes one, a request version when Rachelle shares one. Numbering and naming (Andrew, 22 Oct 2026): the next build version is Rachelle's request version **+ 1** (her v1.15 → our v1.16), and the version number is always in the file name and the Google Doc name (`Kumami_World_Product_Spec_v1.18.docx` → "Kumami Product Spec v1.16"; rename the file with `git mv` when the version changes). Release notes per build version: **Part 1** a table — # · Rachelle asked · What we changed · How to verify · Notes · Evidence — one row per ask, the screenshots inside the table (`d.add_image()`), plus a linked evidence page with full-size shots; **Part 2** other website changes. The doc also keeps a **Roadmap / To be developed** section. Before a build version goes out, Andrew reviews Rachelle's asks one at a time.
- Between published versions, changes collect in the `vX.Y (in progress)` Release-notes entry.
- Release-note entries are history — never rewrite or delete old ones. Corrections go in the new entry ("Corrections to v1.3 text: …").
- Every entry ends with a **"Not re-audited in this version"** bullet when you didn't check the whole doc. Say which sections you didn't verify.

## Editing mechanics (all modes)

### 1 · Work out what changed

```bash
python -I .claude/skills/product-spec-doc-update/scripts/spec_doc.py version "docs/Rachelle Product Specs/Kumami_World_Product_Spec_v1.18.docx"
# the version line names the commit the doc reflects:
python -I -c "import sys;sys.path.insert(0,'.claude/skills/product-spec-doc-update/scripts');from spec_doc import SpecDoc;print(SpecDoc(sys.argv[1]).text(2))" "docs/Rachelle Product Specs/Kumami_World_Product_Spec_v1.18.docx"
git log --oneline <that-sha>..HEAD          # everything since the doc was last synced
git diff --stat <that-sha>..HEAD -- src/
```

Read the commit messages and the diffs of user-facing code: pages under `src/app/world/(app)/`, `src/components/world/**`, `src/components/admin/**`, API routes under `src/app/api/**`, rule engines in `src/lib/market/rules/**`, and the nav in `src/components/world/shell/Sidebar.tsx` and `src/components/world/pro/WorldProContent.tsx`.

### 2 · Verify against the code, not the commit message

For every section you touch, open the actual component, route or rule and confirm: what the user sees, the tier gating, data sources and cache TTLs, thresholds, admin fields, and empty/error behaviour. Commit messages and old doc text have been wrong before. In v1.3, for example, the doc called Plus Flow Radar "real-time" when it is delayed 30 min. If you find an older statement that's wrong, fix it and list it under "Corrections".

### 3 · Locate the blocks to edit

```bash
python -I .claude/skills/product-spec-doc-update/scripts/spec_doc.py outline "docs/Rachelle Product Specs/Kumami_World_Product_Spec_v1.18.docx" [start] [end]
```

This prints `index|style|text` per top-level block. Tables are one block (`TABLE`) and images show as `[IMG]`. Python's `-I` flag ignores `PYTHONIOENCODING`, so the CLI reconfigures stdout to UTF-8 itself. In your own snippets, call `sys.stdout.reconfigure(encoding="utf-8")`.

### 4 · Write a one-off edit script (in `$TEMP`, not the repo)

Use the helpers in `scripts/spec_doc.py`. They're stdlib only (no lxml/pandoc/Word needed on this Windows box). Find blocks **by text**, never by hard-coded index, so the script stays correct as earlier edits shift indices.

```python
import sys; sys.path.insert(0, r".claude/skills/product-spec-doc-update/scripts")
from spec_doc import SpecDoc, P, H, BULLET, TABLE
DOC = r"docs/Rachelle Product Specs/Kumami_World_Product_Spec_v1.18.docx"
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

- Don't edit a version after it was shared, and never edit Rachelle's request versions: corrections go into the next version.
- Don't describe `(To be developed)` work as live. Don't drop a known gap just because it's awkward.
- Don't pretty-print or reformat `document.xml`. The helper only rewrites the blocks you edit.
- Don't put the CoinGlass name in customer-facing copy. This doc is internal, so naming providers here is fine.
