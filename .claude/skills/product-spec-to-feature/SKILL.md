---
name: product-spec-to-feature
description: Use when the product manager (Rachelle) adds or updates a spec in `docs/Rachelle Product Specs/`, or the user references a "spec sheet" / "product spec" / a named feature spec (e.g. "the Spot Pulse sheet") and wants it analysed and built. Reads the Word spec + any UI mockup she links (a claude.ai/code/artifact URL), verifies CoinGlass endpoint feasibility on the live key, writes a development strategy, then implements it following this repo's market-platform patterns.
---

# Product spec → feature

The PM (currently **Rachelle**) drops product specs as Word docs in
`docs/Rachelle Product Specs/`. Each doc is a stack of "sheets" (each is a
`Title`-styled section, e.g. **Spot Pulse**, **Revisi Logic Plus**, **Pro**).
Specs often link a **UI mockup** she built as a `claude.ai/code/artifact/{uuid}` URL.

Your job: turn a named sheet into a shipped feature. Do the steps in order — do
not skip the feasibility probe.

## 1 · Read the spec sheet

- The latest doc is the highest-numbered file, e.g. `Kumami Website (5).docx`.
  Confirm with `ls -t "docs/Rachelle Product Specs/"`.
- The user usually names the sheet ("the spot pulse sheet"). Extract that
  section — **paragraphs *and* tables in document order** (verdict matrices,
  colour maps, thresholds live in tables). The docs are large (embedded images);
  extract text only:

```python
from docx import Document
from docx.text.paragraph import Paragraph
from docx.table import Table
d = Document(".../Kumami Website (N).docx")
cap = False
for child in d.element.body:
    tag = child.tag.split('}')[-1]
    if tag == 'p':
        p = Paragraph(child, d); t = p.text.strip(); st = p.style.name
        if st == 'Title' and t == 'SHEET NAME': cap = True
        elif st == 'Title' and cap: break          # next sheet → stop
        if cap and t: print(('## ' if st.startswith('Heading') else '') + t)
    elif tag == 'tbl' and cap:
        tbl = Table(child, d)
        for r in tbl.rows: print(" | ".join(c.text.strip() for c in r.cells))
```

## 2 · Read her UI mockup

If the sheet links a `claude.ai/code/artifact/{uuid}` URL, read it with the
**WebFetch** tool (those URLs are fetchable via the claude.ai login — `curl`
gets the SPA shell and fails). Ask WebFetch for layout, tile contents, exact hex
colours, spacing, and interactions. If it returns "incomplete boot response",
retry once, then fall back to the hex/layout details in the spec itself and
match the app's design system (`world.css`, turquoise `--accent`). Ask the user
to re-share only if neither yields enough.

## 3 · Verify feasibility BEFORE building (critical)

Specs assume a CoinGlass "Startup plan"; **this key is on a lower tier** — some
endpoints 401 "Upgrade plan". Probe every endpoint the sheet lists against the
live key before committing to a plan. Pattern (reads `COINGLASS_API_KEY` from
`.env.local`, never prints it):

```js
const O='https://open-api-v4.coinglass.com';
for (const [label, path, params] of TESTS) {
  const u = new URL(O+path); for (const [k,v] of Object.entries(params)) u.searchParams.set(k,v);
  const b = await (await fetch(u, {headers:{'CG-API-KEY':KEY}})).json();
  console.log(String(b.code)==='0' ? 'OK '+label : 'XX '+label+' '+b.msg);
}
```

Known-locked on the current key (do not design around them): `futures/coins-markets`,
`spot/coins-markets`, `liquidation/aggregated-heatmap/model1`, `liquidation/map`,
`orderbook/large-limit-order`. Known-good: the aggregated-CVD, funding, OI,
netflow, `pairs-markets`, `hyperliquid/whale-alert`, ETF, article/calendar/unlock
endpoints (see `src/lib/market/live/cg-endpoints.ts`).

Split the sheet into **buildable now** vs **needs a plan upgrade**, and tell the
user which parts are blocked (usually the Pro/dynamic tiers and anything needing
per-asset volume via `*/coins-markets`).

## 4 · Write the development strategy

State, before coding: what replaces/where it goes, the data pipeline
(fetchers → rule engine → contract → provider → route → UI), the phasing
(follow the spec's own "Development Priority Order"; Plus/free tier first, Pro
later), and every blocked/deferred item. Surface conflicts with existing work
(e.g. the On-Chain "heatmap slot" already holds another panel) and get a yes
before overwriting.

## 5 · Implement following the repo's patterns

The market platform is already structured — mirror it, don't reinvent:

- **Fetchers** → add to `src/lib/market/live/cg-endpoints.ts` (typed, `cgCached`,
  a sensible TTL matching the spec's cadence).
- **Rule engine** → `src/lib/market/rules/<name>.ts`, a **pure** function that
  turns raw numbers into a verdict/label/colour per the spec's matrix. All
  thresholds live here, never in the UI. Add a unit test in `rules/__tests__`.
- **Contract** → add the payload type to `src/lib/market/contracts.ts`.
- **Builder** → `src/lib/market/live/<name>.ts`, fetch → feed the engine →
  assemble the contract. Guard each part with `.catch` so one bad endpoint
  degrades gracefully.
- **Provider + route** → add a method to `MarketDataProvider`/`liveProvider` and
  a `src/app/api/market/<name>/route.ts` using `getCachedFresh` and a
  `market:v2:<name>` key. Enforce the tier's refresh cadence.
- **UI** → a client component under `src/components/world/`, styled with
  `world.css` `w-*` classes and tokens; consume via `useMarketEndpoint`.

**Non-negotiables in this codebase:**
- Never render mock/placeholder/stale data. Show real data or an honest
  `—` / "no data" / loading / error state. `getProvider()` throws (→ route 5xx)
  when there is no key; keep it that way.
- The LLM "sentence" layer has no Anthropic key yet — ship the hardcoded
  template fallback and leave a `TODO(ai)`.
- Match the exact verdict colours from the spec; map any colour outside the
  6-value `Verdict['color']` union to the nearest token.

## 6 · Verify + hand off

`npx tsc --noEmit` (ignore stale `.next/types` errors), `npx eslint` the changed
files, then drive the page in the browser (Playwright) to confirm it renders
with live data. Commit on `dev` (never `main`), push only when asked, and finish
with the **feature-test-tutorial** skill so the user can verify it themselves.

## Keep memory current

If the PM changes, the spec folder moves, or a feature decision supersedes
earlier work, update `MEMORY.md` and the relevant memory file.
