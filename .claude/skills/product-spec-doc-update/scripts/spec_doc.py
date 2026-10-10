"""
spec_doc.py — tiny, dependency-free editor for the Kumami product spec .docx
(docs/Rachelle Product Specs/Kumami_World_Product_Spec_andrew.docx).

Pure stdlib (zipfile + re): no lxml/pandoc/LibreOffice needed, so it runs on
Andrew's Windows box as-is. It edits word/document.xml at the level of
top-level body blocks (<w:p> paragraphs and <w:tbl> tables), keeps every other
zip entry (images, styles, numbering) byte-for-byte, and writes plain runs in
the same shape the doc already uses (pStyle Heading1..5 / ListBullet / Title,
tables styled "LightGrid-Accent1").

Typical use (see SKILL.md for the full workflow):

    import sys; sys.path.insert(0, r".claude/skills/product-spec-doc-update/scripts")
    from spec_doc import SpecDoc, P, H, BULLET, TABLE

    d = SpecDoc(r"docs/Rachelle Product Specs/Kumami_World_Product_Spec_andrew.docx")
    i = d.find("6. Watchlist", style="Heading2")
    d.replace_text(d.find("Asset roster:", start=i), "Asset roster: ...")
    d.set_version("1.4", "2026-10-20", "abc1234")
    d.add_release_entry("1.4", "2026-10-20", ["Watchlist: ...", "Calendar: ..."])
    d.save()            # overwrites in place (pass a path to write elsewhere)

All text arguments are plain strings — XML escaping is done for you. A run
list may be given instead of a string for mixed formatting:
    P([("Known gap: ", {"b": True}), ("unlock dates are wrong.", {})])
"""

from __future__ import annotations

import html
import re
import zipfile
from datetime import date as _date
from typing import Iterable, Sequence, Union

Runs = Union[str, Sequence[tuple]]

VERSION_PREFIX = "Version "          # the version line under the subtitle starts with this
RELEASE_HEADING = "Release notes"    # Heading1 that holds the per-version entries
PLANNED_SUFFIX = " (Planned)"        # Heading2 suffix for a not-yet-built feature
PLANNED_CHANGES = "Planned changes"  # Heading4 prefix for planned changes to a live feature
PLANNED_COLOR = "B26A00"             # amber — the status line's "PLANNED —" run

# ---------------------------------------------------------------------------
# Block builders (return raw XML strings)
# ---------------------------------------------------------------------------


def _esc(s: str) -> str:
    return html.escape(s, quote=False)


def _runs_xml(runs: Runs) -> str:
    if isinstance(runs, str):
        runs = [(runs, {})]
    out = []
    for text, fmt in runs:
        rpr = ""
        if fmt.get("b"):
            rpr += "<w:b/>"
        if fmt.get("i"):
            rpr += "<w:i/>"
        if fmt.get("color"):
            rpr += f'<w:color w:val="{fmt["color"]}"/>'
        rpr = f"<w:rPr>{rpr}</w:rPr>" if rpr else ""
        out.append(f'<w:r>{rpr}<w:t xml:space="preserve">{_esc(text)}</w:t></w:r>')
    return "".join(out)


def P(runs: Runs, style: str | None = None, italic: bool = False, bold: bool = False) -> str:
    """A paragraph. `style` is a pStyle id, e.g. 'Heading2', 'ListBullet'."""
    if isinstance(runs, str) and (italic or bold):
        runs = [(runs, {"i": italic, "b": bold})]
    ppr = f'<w:pPr><w:pStyle w:val="{style}"/></w:pPr>' if style else "<w:pPr/>"
    return f"<w:p>{ppr}{_runs_xml(runs)}</w:p>"


def H(level: int, text: str) -> str:
    return P(text, style=f"Heading{level}")


def BULLET(runs: Runs) -> str:
    return P(runs, style="ListBullet")


def PAGE_BREAK() -> str:
    return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'


def TABLE(rows: Sequence[Sequence[str]], widths: Sequence[int] | None = None) -> str:
    """Table in the doc's house style. rows[0] is the header row.
    widths are DXA (1440 = 1 inch); default splits ~9000 DXA evenly."""
    ncol = max(len(r) for r in rows)
    if not widths:
        widths = [9000 // ncol] * ncol
    grid = "".join(f'<w:gridCol w:w="{w}"/>' for w in widths)
    trs = []
    for r in rows:
        tcs = []
        for c in range(ncol):
            cell = r[c] if c < len(r) else ""
            tcs.append(
                f'<w:tc><w:tcPr><w:tcW w:type="dxa" w:w="{widths[c]}"/></w:tcPr>'
                f"{P(cell) if isinstance(cell, str) else P(cell)}</w:tc>"
            )
        trs.append("<w:tr>" + "".join(tcs) + "</w:tr>")
    return (
        '<w:tbl><w:tblPr><w:tblStyle w:val="LightGrid-Accent1"/><w:tblW w:type="auto" w:w="0"/>'
        '<w:tblLook w:firstColumn="1" w:firstRow="1" w:lastColumn="0" w:lastRow="0" '
        'w:noHBand="0" w:noVBand="1" w:val="04A0"/></w:tblPr>'
        f"<w:tblGrid>{grid}</w:tblGrid>{''.join(trs)}</w:tbl>"
    )


# ---------------------------------------------------------------------------
# Document
# ---------------------------------------------------------------------------


class SpecDoc:
    def __init__(self, path: str):
        self.path = path
        with zipfile.ZipFile(path) as z:
            self._infos = z.infolist()
            self._data = {i.filename: z.read(i.filename) for i in self._infos}
        xml = self._data["word/document.xml"].decode("utf8")
        m = re.search(r"<w:body>(.*)</w:body>", xml, re.S)
        if not m:
            raise ValueError("no <w:body> in document.xml")
        self._head, body, self._tail = xml[: m.start(1)], m.group(1), xml[m.end(1):]
        self.blocks: list[str] = self._split(body)

    # -- parsing -----------------------------------------------------------
    @staticmethod
    def _split(body: str) -> list[str]:
        """Split body into top-level blocks (w:p, w:tbl, w:sectPr, other)."""
        blocks, i, n = [], 0, len(body)
        tag_re = re.compile(r"<(/?)w:(p|tbl|sectPr)(?=[ >/])[^>]*?(/?)>")
        while i < n:
            m = tag_re.search(body, i)
            if not m:
                if body[i:].strip():
                    blocks.append(body[i:])
                break
            if m.start() > i and body[i:m.start()].strip():
                blocks.append(body[i:m.start()])
            name = m.group(2)
            if m.group(3) == "/":  # self-closing, e.g. <w:p/>
                blocks.append(m.group(0))
                i = m.end()
                continue
            depth, j = 0, m.start()
            open_re = re.compile(rf"<(/?)w:{name}(?=[ >/])[^>]*?(/?)>")
            for mm in open_re.finditer(body, m.start()):
                if mm.group(2) == "/":
                    continue
                depth += -1 if mm.group(1) == "/" else 1
                if depth == 0:
                    j = mm.end()
                    break
            blocks.append(body[m.start():j])
            i = j
        return blocks

    # -- inspection --------------------------------------------------------
    def text(self, i: int) -> str:
        return html.unescape("".join(re.findall(r"<w:t[^>]*>([^<]*)</w:t>", self.blocks[i])))

    def style(self, i: int) -> str:
        b = self.blocks[i]
        if b.startswith("<w:tbl"):
            return "TABLE"
        m = re.search(r'<w:pStyle w:val="([^"]+)"', b.split("</w:pPr>")[0] if "</w:pPr>" in b else "")
        return m.group(1) if m else "-"

    def is_image(self, i: int) -> bool:
        return "<w:drawing" in self.blocks[i]

    def outline(self, start: int = 0, end: int | None = None, width: int = 110) -> str:
        """Human-readable dump: index|style|text — use it to locate edits."""
        end = len(self.blocks) if end is None else end
        lines = []
        for k in range(start, end):
            tag = "[IMG] " if self.is_image(k) else ""
            lines.append(f"{k}|{self.style(k)}|{tag}{self.text(k)[:width]}")
        return "\n".join(lines)

    def find(self, prefix: str, style: str | None = None, start: int = 0, contains: bool = False) -> int:
        """Index of the first block whose text starts with (or contains) `prefix`."""
        for k in range(start, len(self.blocks)):
            t = self.text(k)
            if (prefix in t if contains else t.startswith(prefix)) and (style is None or self.style(k) == style):
                return k
        raise KeyError(f"block not found: {prefix!r} (style={style}, start={start})")

    def heading_level(self, i: int) -> int | None:
        s = self.style(i)
        if s.startswith("Heading") and s[7:].isdigit():
            return int(s[7:])
        return 0 if s == "Title" else None

    def section_end(self, i: int) -> int:
        """Index just past the section that starts at heading block i
        (stops at the next heading of the same or higher level)."""
        lvl = self.heading_level(i)
        if lvl is None:
            raise ValueError(f"block {i} is not a heading")
        for k in range(i + 1, len(self.blocks)):
            l2 = self.heading_level(k)
            if l2 is not None and l2 <= lvl:
                return k
            if self.blocks[k].startswith("<w:sectPr"):
                return k
        return len(self.blocks)

    # -- editing -----------------------------------------------------------
    def replace_text(self, i: int, runs: Runs) -> None:
        """Replace a paragraph's text, keeping its paragraph properties and the
        first run's formatting (so headings stay headings, italics stay italic)."""
        b = self.blocks[i]
        if not b.startswith("<w:p"):
            raise ValueError(f"block {i} is not a paragraph")
        ppr = re.search(r"<w:pPr>.*?</w:pPr>|<w:pPr/>", b, re.S)
        rpr = re.search(r"<w:r>\s*(<w:rPr>.*?</w:rPr>)", b, re.S)
        if isinstance(runs, str) and rpr:
            fmt = {"b": "<w:b/>" in rpr.group(1), "i": "<w:i/>" in rpr.group(1)}
            runs = [(runs, fmt)]
        self.blocks[i] = f"<w:p>{ppr.group(0) if ppr else ''}{_runs_xml(runs)}</w:p>"

    def replace_in(self, i: int, old: str, new: str) -> None:
        """Substring replace inside a block's visible text (block is rewritten
        as a single run). Raises if `old` isn't there — no silent no-ops."""
        t = self.text(i)
        if old not in t:
            raise KeyError(f"{old!r} not in block {i}: {t[:120]!r}")
        if self.blocks[i].startswith("<w:tbl"):
            raise ValueError("use set_cell() for tables")
        self.replace_text(i, t.replace(old, new))

    def set_cell(self, table_i: int, row: int, col: int, text: str) -> None:
        tbl = self.blocks[table_i]
        rows = self._split_tag(tbl, "tr")
        cells = self._split_tag(rows[row][1], "tc")
        cell_xml = cells[col][1]
        tcpr = re.search(r"<w:tcPr>.*?</w:tcPr>", cell_xml, re.S)
        new_cell = f"<w:tc>{tcpr.group(0) if tcpr else ''}{P(text)}</w:tc>"
        new_row = rows[row][1].replace(cell_xml, new_cell, 1)
        self.blocks[table_i] = tbl.replace(rows[row][1], new_row, 1)

    def table_rows(self, table_i: int) -> list[list[str]]:
        out = []
        for _, tr in self._split_tag(self.blocks[table_i], "tr"):
            out.append([html.unescape("".join(re.findall(r"<w:t[^>]*>([^<]*)</w:t>", tc)))
                        for _, tc in self._split_tag(tr, "tc")])
        return out

    @staticmethod
    def _split_tag(xml: str, tag: str) -> list[tuple[int, str]]:
        return [(m.start(), m.group(0)) for m in re.finditer(rf"<w:{tag}[ >].*?</w:{tag}>", xml, re.S)]

    def insert_after(self, i: int, blocks: Iterable[str]) -> int:
        blocks = list(blocks)
        self.blocks[i + 1:i + 1] = blocks
        return i + len(blocks)          # index of the last inserted block

    def insert_before(self, i: int, blocks: Iterable[str]) -> None:
        self.blocks[i:i] = list(blocks)

    def delete(self, i: int, j: int | None = None) -> None:
        """Delete blocks [i, j) — j defaults to i+1."""
        del self.blocks[i:(i + 1 if j is None else j)]

    def replace_section_body(self, heading_i: int, blocks: Iterable[str]) -> None:
        """Keep the heading, replace everything until the next same/higher heading."""
        end = self.section_end(heading_i)
        self.blocks[heading_i + 1:end] = list(blocks)

    # -- versioning --------------------------------------------------------
    def _version_index(self) -> int | None:
        for k in range(0, min(12, len(self.blocks))):
            if self.text(k).startswith(VERSION_PREFIX):
                return k
        return None

    def get_version(self) -> str | None:
        k = self._version_index()
        if k is None:
            return None
        m = re.match(r"Version (\d+(?:\.\d+)*)", self.text(k))
        return m.group(1) if m else None

    def set_version(self, version: str, on: str | _date, commit: str | None = None) -> None:
        """Write/refresh the 'Version X · date · commit' line under the subtitle."""
        d = on if isinstance(on, str) else on.isoformat()
        try:
            human = _date.fromisoformat(d).strftime("%d %b %Y").lstrip("0")
        except ValueError:
            human = d
        text = [(f"Version {version}", {"b": True}), (f" · {human}", {})]
        if commit:
            text.append((f" · reflects the dev branch at commit {commit}", {}))
        text.append((" · see “Release notes” for what changed.", {"i": True}))
        k = self._version_index()
        if k is None:
            sub = 1 if self.style(0) == "Title" else 0
            self.insert_after(sub, [P(text)])
        else:
            self.replace_text(k, text)

    def ensure_release_notes(self) -> int:
        """Return the index of the 'Release notes' Heading1, creating the
        section (after the TOC page break) if it doesn't exist."""
        try:
            return self.find(RELEASE_HEADING, style="Heading1")
        except KeyError:
            first_h1 = next(k for k in range(len(self.blocks)) if self.style(k) == "Heading1")
            self.insert_before(first_h1, [
                H(1, RELEASE_HEADING),
                P("What changed in each version of this document, newest first. Every entry "
                  "describes how the live product changed (or how the doc was corrected to match it).",
                  italic=True),
                PAGE_BREAK(),
            ])
            return first_h1

    def add_release_entry(self, version: str, on: str, bullets: Sequence[Runs],
                          summary: str | None = None) -> None:
        """Insert a 'vX — date' Heading2 + bullets at the top of Release notes."""
        h = self.ensure_release_notes()
        k = h + 1
        if self.style(k) == "-" and not self.blocks[k].startswith("<w:tbl"):
            k += 1  # skip the italic intro paragraph
        try:
            human = _date.fromisoformat(on).strftime("%d %b %Y").lstrip("0")
        except ValueError:
            human = on
        blocks = [H(2, f"v{version} — {human}")]
        if summary:
            blocks.append(P(summary, italic=True))
        blocks += [BULLET(b) for b in bullets]
        self.insert_before(k, blocks)

    # -- planned / shipped workflow -----------------------------------------
    # Convention (docs/DEVELOPMENT_WORKFLOW.md, stage 1 and 6):
    #   new feature   → Heading2 "N. Name (Planned)" + first paragraph = status line
    #   change to a live feature → Heading4 "Planned changes (vX.Y)" at the END of
    #                   that feature's section (live text above stays accurate)
    #   status line   → starts with "PLANNED — "
    def _status_line(self, source: str, version: str) -> str:
        return P([("PLANNED — ", {"b": True, "color": PLANNED_COLOR}),
                  (f"from {source} · added in v{version} · not live yet.", {"i": True})])

    def add_planned_section(self, tier: str, title: str, blocks: Sequence[str], source: str,
                            version: str) -> int:
        """Append a new '<title> (Planned)' Heading2 at the end of a tier
        (tier = 'Kumami Basic' | 'Kumami Plus' | 'Kumami Pro'). Returns its index."""
        t = self.find(tier, style="Heading1")
        end = self.section_end(t)
        heading = title if title.endswith(PLANNED_SUFFIX) else title + PLANNED_SUFFIX
        self.insert_before(end, [H(2, heading), self._status_line(source, version), *blocks])
        return end

    def add_planned_changes(self, section_prefix: str, blocks: Sequence[str], source: str,
                            version: str) -> int:
        """Append a 'Planned changes (vX.Y)' Heading4 at the end of an existing
        feature section (found by its Heading2 prefix, e.g. '5. Calendar')."""
        s = self.find(section_prefix, style="Heading2")
        end = self.section_end(s)
        self.insert_before(end, [H(4, f"{PLANNED_CHANGES} (v{version})"),
                                 self._status_line(source, version), *blocks])
        return end

    def list_planned(self) -> list[tuple[int, str]]:
        """Every planned item still open: (index, heading text)."""
        out = []
        for k in range(len(self.blocks)):
            lvl = self.heading_level(k)
            t = self.text(k)
            if lvl == 2 and t.endswith(PLANNED_SUFFIX):
                out.append((k, t))
            elif lvl is not None and t.startswith(PLANNED_CHANGES):
                out.append((k, t))
        return out

    def ship_planned(self, heading_i: int) -> None:
        """Clear a planned flag after the feature ships.
        - '(Planned)' Heading2: removes the suffix and the PLANNED status line
          (rewrite the body to describe the as-built feature separately).
        - 'Planned changes' Heading4: deletes the whole sub-section (fold the
          as-built behaviour into the live description separately)."""
        t = self.text(heading_i)
        if t.startswith(PLANNED_CHANGES):
            self.delete(heading_i, self.section_end(heading_i))
            return
        if not t.endswith(PLANNED_SUFFIX):
            raise ValueError(f"block {heading_i} is not a planned heading: {t!r}")
        self.replace_text(heading_i, t[: -len(PLANNED_SUFFIX)])
        end = self.section_end(heading_i)
        for k in range(heading_i + 1, end):
            if self.text(k).startswith("PLANNED — "):
                self.delete(k)
                break

    # -- output ------------------------------------------------------------
    def save(self, path: str | None = None) -> str:
        path = path or self.path
        xml = self._head + "".join(self.blocks) + self._tail
        self._data["word/document.xml"] = xml.encode("utf8")
        tmp = path + ".tmp"
        with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as z:
            for info in self._infos:
                z.writestr(info, self._data[info.filename], compress_type=zipfile.ZIP_DEFLATED)
        import os
        os.replace(tmp, path)
        return path


def create_from_template(template: str, out: str) -> "SpecDoc":
    """Create a NEW, empty .docx at `out` that reuses `template`'s styles,
    numbering, theme and fonts (so Heading1-5 / ListBullet / Title /
    LightGrid-Accent1 look identical), without its content or images.
    Returns a SpecDoc on it — add blocks to `.blocks`, then `.save()`."""
    keep_prefixes = ("word/styles", "word/numbering", "word/settings", "word/fontTable",
                     "word/webSettings", "word/theme/", "docProps/", "customXml/", "_rels/.rels")
    with zipfile.ZipFile(template) as z:
        infos = z.infolist()
        data = {i.filename: z.read(i.filename) for i in infos}
    xml = data["word/document.xml"].decode("utf8")
    m = re.search(r"<w:body>(.*)</w:body>", xml, re.S)
    sect = re.search(r"<w:sectPr[ >].*?</w:sectPr>", m.group(1), re.S) if m else None
    new_doc = xml[: m.start(1)] + (sect.group(0) if sect else "") + xml[m.end(1):]
    rels = data["word/_rels/document.xml.rels"].decode("utf8")
    rels = re.sub(r'<Relationship [^>]*(?:Target="media/|TargetMode="External")[^>]*/>', "", rels)
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for info in infos:
            name = info.filename
            if name == "word/document.xml":
                z.writestr(info, new_doc.encode("utf8"))
            elif name == "word/_rels/document.xml.rels":
                z.writestr(info, rels.encode("utf8"))
            elif name == "[Content_Types].xml" or name.startswith(keep_prefixes):
                z.writestr(info, data[name])
    return SpecDoc(out)


def sanity_check(path: str) -> list[str]:
    """Cheap well-formedness check (stdlib XML parser) — returns problems."""
    import xml.dom.minidom as md
    problems = []
    with zipfile.ZipFile(path) as z:
        for name in z.namelist():
            if name.endswith(".xml") or name.endswith(".rels"):
                try:
                    md.parseString(z.read(name))
                except Exception as e:  # noqa: BLE001
                    problems.append(f"{name}: {e}")
    return problems


if __name__ == "__main__":
    import sys
    if len(sys.argv) >= 3 and sys.argv[1] == "outline":
        d = SpecDoc(sys.argv[2])
        s = int(sys.argv[3]) if len(sys.argv) > 3 else 0
        e = int(sys.argv[4]) if len(sys.argv) > 4 else None
        sys.stdout.reconfigure(encoding="utf-8")
        print(d.outline(s, e))
    elif len(sys.argv) >= 3 and sys.argv[1] == "check":
        p = sanity_check(sys.argv[2])
        print("OK" if not p else "\n".join(p))
        sys.exit(1 if p else 0)
    elif len(sys.argv) >= 3 and sys.argv[1] == "version":
        print(SpecDoc(sys.argv[2]).get_version())
    elif len(sys.argv) >= 3 and sys.argv[1] == "planned":
        sys.stdout.reconfigure(encoding="utf-8")
        items = SpecDoc(sys.argv[2]).list_planned()
        print("\n".join(f"{i}|{t}" for i, t in items) if items else "no planned items")
    else:
        print("usage: spec_doc.py outline <docx> [start] [end] | check <docx> | version <docx> | planned <docx>")
