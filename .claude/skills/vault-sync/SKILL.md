---
name: vault-sync
description: >-
  Keeps Andrew's Obsidian second brain and his PKM Kumami Map in line with the code. Run it at
  the end of EVERY development task in this repo (features, fixes, refactors, new endpoints,
  integrations, data-model or Firestore changes, Firebase Functions retirement, config or
  hosting changes), and whenever Andrew says "update the vault", "sync the vault" or
  "update the map". It updates the Kumami Map notes the PKM renders, the durable Kumami notes,
  and today's daily digest, then checks that the map still builds. Skip it only for changes
  with no product or architecture effect (typos, formatting, tests only).
---

# Vault sync: keep the second brain current

The Obsidian vault is Andrew's canonical knowledge base: `C:\Users\Andrew\Documents\Obsidian Vault` (Windows PC only). His PKM app (`C:\Users\Andrew\CascadeProjects\claude-ai-andrew`) draws the **Kumami Map** from the notes in `Work/Kumami/Map/`. When this repo changes and those notes don't, the PKM shows a stale map.

## When

Run this as the last step of any development task, after checks pass and before the final report. In `kumami-feature-workflow` it's stage 7a. It's fine to run it after small fixes too, if they changed behaviour, data or architecture.

## Steps

### 1. Work out what changed
Use `git diff --stat origin/dev...HEAD` (or the session's commits) and your own summary. Classify each change:
- **Map-level:**
  - a new, removed or renamed product module, service, data store or external provider;
  - a new or changed relationship (calls, reads, writes, webhooks, deploys);
  - a status change (planned → build → live, or retiring);
  - a new endpoint or collection worth listing in a node's Details.
- **Knowledge-level:** decisions, specs, roadmap, security, workflow or QA facts.
- **Neither:** skip to step 4 and write a one-line digest only if it was meaningful.

### 2. Update the Kumami Map notes (`Work/Kumami/Map/`)
Read `Work/Kumami/Map/Kumami Map.md` first. It has the exact note format. Saved notes reach the live PKM site within seconds through the vault sync watcher. In short:
- One note per object in `Products/`, `Systems/`, `Data/` or `External/`.
  - Frontmatter: `map: kumami`, a stable `id`, `type`, `stratum`, optional `order`, `status` (`build | planned | retiring`), `status-note` and `review`, plus `sources`.
  - Then `# Title`, a one-paragraph summary, `## Details` bullets (`- **Label:** text`), `## Connections` (`- verb phrase [[Target note]]` with an optional `(write)` or `(deploy)`), `## Private` and `## Sources`.
- **Edit the existing note** for the object, and add, remove or fix Details and Connections. Create a new note only for a genuinely new object. Never change an existing `id`.
- **Removing an object:** remove the note *and* every `[[link]]` to it in other notes' Connections and in `Traces/`.
- Every repo path in `sources:` must be listed in `Map Sources.md`. Add a line there (`` - `kumami-web-next/<path>` · repo-doc|repo-code · short note ``) when you cite a new file.

**Privacy (the PKM site is public).** Published fields are the title, summary, status fields, `review`, Details, Connections and Traces:
- No URLs or hostnames. The build refuses them.
- No secrets, API keys, emails, user data, percentages, owners or metrics.
- Security weaknesses go in the note's `## Private` section. The public `review` says only something like "Security follow-up open (details in the vault)".
- Full detail, including hosts and webhooks, belongs in `Work/Kumami/Kumami Data Map.md`. Keep it updated when data flows change.

### 2b. Update the Timeline (`Work/Kumami/Map/Timeline.md`)
This note drives the PKM's Kumami Timeline tab. It's a public-safe copy of `Kumami Roadmap`, with lanes `## Done`, `## In progress` and `## Planned`. Each item is one line: `- YYYY-MM-DD · kind · Title · [[Map note]]`. The date is optional; dated items appear on the PKM's time river. The kind is also optional: `milestone` (the default), `release`, `decision` or `due`. Links must point to Map notes.
- When work starts, add or move its item to **In progress**.
- When it ships or a decision lands, move it to **Done** with today's date.
- When new work is agreed, add it to **Planned**.
- Keep the wording public-safe: no project IDs, branch names, hosts, people or money.

### 3. Update durable Kumami notes (`Work/Kumami/`)
Edit the note that owns the fact, and don't create duplicates:
- `Kumami Architecture`: system shape
- `Kumami Data Map`: per-product data sources, endpoints, collections
- `Kumami Plus & Pro`: tiers and tools
- `Kumami Roadmap`: what's next, what's done
- `Kumami Security`: rules, findings
- `Kumami QA`: QA state
- `Kumami Development Workflow`: process
- `Kumami World`: hub; add links to new notes here

Summaries only, not transcripts. Put `updated: YYYY-MM-DD` in frontmatter where the note has it.

### 4. Daily digest
Append to `Daily/YYYY-MM-DD.md` (create it if missing; date in WIB, UTC+7) using the Agent Bookkeeping Protocol format (`PKM/Agent Bookkeeping Protocol.md`):

```markdown
## Claude Code (kumami-web-next) — <topic>

**Scope:** one sentence.

### Facts confirmed
- ...

### Decisions / changes
- ... (commit or branch)

### Open loops
- [ ] Owner — next action

### Links
- [[Kumami World]] · [[<notes you touched>]]
```

### 5. Check the map still builds
Use the PKM's dedicated sync checkout. It always tracks `main`; don't use the main PKM checkout, which other agents switch between branches:

```bash
git -C "C:/Users/Andrew/CascadeProjects/pkm-sync" pull --ff-only -q
node "C:/Users/Andrew/CascadeProjects/pkm-sync/app/scripts/build-kumami-map.mjs" --check
```

- If it lists problems (a broken `[[link]]`, an unregistered source, a URL or hostname, a missing field), fix the notes and re-run until it passes.
- Don't edit or commit anything in the PKM repo from here. Publishing the map to the live PKM site is handled on the PKM side.

### 6. Report
Tell Andrew in one line which vault notes changed (for example "Vault: updated Map/Flow Radar, Kumami Data Map; digest added").

## Rules
- Never edit `Personal/Tasks.md`: it syncs to Andrew's phone.
- Write only inside the vault folders named above.
- Don't store secrets, credentials or user PII anywhere in the vault.
- If unsure whether a change is map-worthy, prefer a Details bullet over a new node.
