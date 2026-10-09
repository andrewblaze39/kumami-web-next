"""
render_gap_report.py — turn the gap-analysis data file (JSON) into the
plain-language Word report.

    python -I .claude/skills/rachelle-gap-analysis/scripts/render_gap_report.py \
        "docs/Rachelle Product Specs/Kumami_Gap_Report.data.json" \
        "docs/Rachelle Product Specs/Kumami_Gap_Report.docx"

The JSON is the source of truth: re-audit, edit the JSON, re-render. Never
hand-edit the .docx — the next render overwrites it. Styling comes from the
as-built spec doc (same Heading / table styles), via spec_doc.create_from_template.

JSON shape (see SKILL.md for field meanings):
{
  "report_version": "1.0", "date": "2026-10-09",
  "rachelle_doc": "Kumami Website (6).docx", "code_commit": "1ff3383", "asbuilt_version": "1.3",
  "summary": ["paragraph", ...],
  "priorities": [{"title": "", "why": "", "effort": "S|M|L"}],
  "decisions": [{"topic": "", "rachelle": "", "built": "", "question": ""}],
  "blocked": [{"endpoint": "", "unlocks": ""}],
  "sections": [{"tier": "Plus", "tool": "Console", "overall": "partial", "note": "",
                "items": [{"want": "", "have": "", "status": "done|partial|missing|blocked|decision", "effort": "S|M|L|—"}]}],
  "release_notes": [{"version": "1.0", "date": "2026-10-09", "bullets": [""]}]
}
"""

from __future__ import annotations

import json
import os
import sys
from collections import Counter, OrderedDict
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "product-spec-doc-update", "scripts"))
from spec_doc import BULLET, H, P, PAGE_BREAK, TABLE, create_from_template, sanity_check  # noqa: E402

TEMPLATE = os.path.join("docs", "Rachelle Product Specs", "Kumami_World_Product_Spec_andrew.docx")

STATUS = {
    "done": ("✅ Done", "2E7D32"),
    "partial": ("🟡 Partly", "B26A00"),
    "missing": ("❌ Missing", "C62828"),
    "blocked": ("🔒 Blocked by data plan", "6A1B9A"),
    "decision": ("❓ Decision needed", "1565C0"),
}
OVERALL = {
    "done": "Matches the spec",
    "partial": "Mostly built — some gaps",
    "missing": "Largely not built",
    "blocked": "Blocked by the data plan",
    "decision": "Needs a decision before more work",
}
EFFORT = {"S": "Small (≤ 1 day)", "M": "Medium (2–4 days)", "L": "Large (1–2+ weeks)", "—": "—"}


def human(d: str) -> str:
    try:
        return date.fromisoformat(d).strftime("%d %b %Y").lstrip("0")
    except ValueError:
        return d


def status_runs(s: str):
    label, color = STATUS[s]
    return [(label, {"b": True, "color": color})]


def render(data_path: str, out_path: str) -> None:
    with open(data_path, encoding="utf-8") as f:
        g = json.load(f)

    doc = create_from_template(TEMPLATE, out_path)
    b = doc.blocks
    sect = [x for x in b if x.startswith("<w:sectPr")]
    b.clear()

    b.append(P("Kumami — Rachelle's Spec vs. What's Built", style="Title"))
    b.append(P("A plain-language gap report: for every Plus and Pro tool, what Rachelle's product spec asks for, "
               "what the website does today, and what it would take to close the gap.", italic=True))
    b.append(P([(f"Report v{g['report_version']}", {"b": True}),
                (f" · {human(g['date'])} · compares Rachelle's “{g['rachelle_doc']}” against the dev branch at "
                 f"commit {g['code_commit']} (as-built spec v{g['asbuilt_version']}).", {})]))

    # --- How to read -------------------------------------------------------
    b.append(H(1, "How to read this report"))
    b.append(P("Each tool has a table. Each row is one thing Rachelle's spec asks for. The Status column says how "
               "close we are:"))
    for key, (label, color) in STATUS.items():
        expl = {
            "done": "built and working the way the spec describes.",
            "partial": "built, but some details differ from the spec.",
            "missing": "not built yet — it can be built with what we have.",
            "blocked": "can't be built until the CoinGlass plan is upgraded (the data isn't available to us).",
            "decision": "the build deliberately does something different (usually following Rachelle's later "
                        "mockup), or two parts of the spec disagree. Someone needs to choose.",
        }[key]
        b.append(BULLET([(label, {"b": True, "color": color}), (" — " + expl, {})]))
    b.append(P("Effort is a rough developer estimate: Small ≤ 1 day · Medium 2–4 days · Large 1–2+ weeks.",
               italic=True))

    # --- Summary -------------------------------------------------------------
    b.append(H(1, "Summary"))
    for para in g["summary"]:
        b.append(P(para))
    totals = Counter(i["status"] for s in g["sections"] for i in s["items"])
    b.append(P([("Across all tools: ", {"b": True}),
                ("  ·  ".join(f"{STATUS[k][0]} {totals.get(k, 0)}" for k in STATUS), {})]))

    rows = [["Tier", "Tool", "Overall", "✅", "🟡", "❌", "🔒", "❓"]]
    for s in g["sections"]:
        c = Counter(i["status"] for i in s["items"])
        rows.append([s["tier"], s["tool"], OVERALL[s["overall"]],
                     *(str(c.get(k, 0) or "") for k in ("done", "partial", "missing", "blocked", "decision"))])
    b.append(TABLE(rows, widths=[800, 2300, 2900, 600, 600, 600, 600, 600]))

    # --- Priorities ----------------------------------------------------------
    b.append(H(1, "Recommended next steps"))
    b.append(P("In order. Quick, high-value fixes first; decisions next; big builds after."))
    for n, p in enumerate(g["priorities"], 1):
        b.append(P([(f"{n}. {p['title']} ", {"b": True}), (f"({EFFORT.get(p['effort'], p['effort'])})", {"i": True})]))
        b.append(P(p["why"]))

    # --- Decisions -----------------------------------------------------------
    b.append(H(1, "Decisions needed"))
    b.append(P("Places where the website intentionally differs from the written spec, or where Rachelle's documents "
               "disagree with each other. Nothing here is a bug — but each needs a yes/no from Rachelle and Andrew."))
    drows = [["Topic", "Rachelle's spec says", "The website does", "Question to answer"]]
    for d in g["decisions"]:
        drows.append([d["topic"], d["rachelle"], d["built"], d["question"]])
    b.append(TABLE(drows, widths=[1700, 2500, 2500, 2300]))

    # --- Per-tool sections -------------------------------------------------------
    by_tier: "OrderedDict[str, list]" = OrderedDict()
    for s in g["sections"]:
        by_tier.setdefault(s["tier"], []).append(s)
    for tier, sections in by_tier.items():
        b.append(PAGE_BREAK())
        b.append(H(1, f"Kumami {tier}"))
        for s in sections:
            b.append(H(2, s["tool"]))
            b.append(P([("Overall: ", {"b": True}), (OVERALL[s["overall"]], {})]))
            if s.get("note"):
                b.append(P(s["note"], italic=True))
            trs = [["What Rachelle's spec asks for", "What the website does today", "Status", "Effort"]]
            for i in s["items"]:
                trs.append([i["want"], i["have"], status_runs(i["status"]), i.get("effort", "—")])
            b.append(TABLE(trs, widths=[3300, 3300, 1500, 900]))

    # --- Blocked -------------------------------------------------------------
    b.append(PAGE_BREAK())
    b.append(H(1, "Blocked by the CoinGlass plan"))
    b.append(P("Our CoinGlass key is on the STARTUP plan. These endpoints answer “Upgrade plan”, so the features "
               "below can't be built until the plan is upgraded. Everything else in the spec is available to us."))
    brows = [["Endpoint (locked)", "What it would unlock"]]
    for x in g["blocked"]:
        brows.append([x["endpoint"], x["unlocks"]])
    b.append(TABLE(brows, widths=[3600, 5400]))

    # --- Release notes ---------------------------------------------------------
    b.append(H(1, "Release notes"))
    for r in g["release_notes"]:
        b.append(H(2, f"v{r['version']} — {human(r['date'])}"))
        for x in r["bullets"]:
            b.append(BULLET(x))

    b.extend(sect)
    doc.save()
    problems = sanity_check(out_path)
    if problems:
        raise SystemExit("XML problems:\n" + "\n".join(problems))
    print(f"wrote {out_path} — {sum(totals.values())} items: " +
          ", ".join(f"{k} {totals.get(k, 0)}" for k in STATUS))


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("usage: render_gap_report.py <data.json> <out.docx>")
    render(sys.argv[1], sys.argv[2])
