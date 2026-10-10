---
name: clarify-before-building
description: >-
  ALWAYS run this first whenever Andrew asks for anything to be built, changed, fixed or
  decided in Kumami, before planning, editing or running the workflow — even if the
  request seems clear. Ask 3–5 specific clarification questions (with concrete options
  and a recommended default), wait for the answers, and if anything is still unclear ask
  3–5 more. Then restate the agreed scope in a few bullets before starting. Andrew asked
  for this on 2026-10-10 after a change was built on a wrong reading of his request.
---

# Clarify before building

Andrew wants to **see that his request is understood before work starts**. A
wrong guess costs more than a round of questions. This applies to every request
to build, change, fix, remove or decide something: features, UI tweaks, docs,
workflow changes. It does not apply to pure questions ("what's the status?",
"explain X"), which you just answer.

## Steps

1. **Research first (quickly), then ask.** Read the relevant code, Andrew's spec
   (`Kumami_World_Product_Spec_andrew.docx`) and Rachelle's spec, so the
   questions are specific ("Watchlist Pro's 'Also Worth Watching' uses 24h
   whale flow today; Rachelle's note says 7-day consistency — which one?"),
   not generic ("what do you want?"). Mention any facts you found that change
   the picture, e.g. a bug or a conflict with Rachelle's doc.
2. **Ask 3–5 questions.** Use the AskUserQuestion tool. It takes up to 4 per call, so put
   a 5th in a second call or in the message. Each question should:
   - be about something that changes what gets built (scope, naming, placement,
     tier behaviour, data source, what happens to existing behaviour, edge cases);
   - offer 2–4 concrete options, with the recommended one first and marked
     "(Recommended)". Use `preview` for layouts or naming;
   - be answerable in a click, while Andrew can always type "Other".
3. **If answers leave gaps or raise new ones, ask 3–5 more.** Repeat until
   nothing that affects the build is open. Don't ask about things with an
   obvious default you can state instead.
4. **Restate the agreed scope** in 4–8 bullets: what will change, what will
   not, and the names, tiers and rules agreed. Then start. If Andrew said
   "go" up front, still restate it and then go.
5. **Record decisions.** Durable product decisions go into Andrew's spec as
   planned items (via `product-spec-doc-update`) and into memory if they'll
   matter in later sessions.

## Don'ts
- Don't build on an assumption you could have asked about.
- Don't ask more than 5 questions at once, and don't ask fake questions you
  already know the answer to.
- Don't argue about what was said before. If something was missed, say so
  in one line and fix it.

This skill runs **before** `kumami-feature-workflow` stage 1. The answers feed
the planned section of Andrew's spec.
