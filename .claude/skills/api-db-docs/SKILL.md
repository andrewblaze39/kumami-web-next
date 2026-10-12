---
name: api-db-docs
description: >-
  Keep Kumami's API reference (docs/API.md) and Firestore database reference
  (docs/DATABASE.md) in sync with the code — every /api/v1 endpoint (auth, request,
  response, errors, which collections/fields it writes) and every collection/field (type,
  who writes it, who reads it, rules). Run it in workflow stage 6 whenever a build adds,
  changes or removes an API route, a webhook, a Firestore collection or field, or a
  security rule — even if not asked. Also use for "document the API", "update the
  database doc", "which endpoint writes X", "what fields does users have", or a Flutter
  handover note for backend changes.
---

# API + database docs (Kumami)

Two living documents. Together with Andrew's product spec they describe the backend. The Flutter app is built from them, so treat them as a contract.

| File | Holds |
|---|---|
| `docs/API.md` | Every `/api/v1` endpoint: method, path, auth, request, response JSON, error codes (`{error:{code,message}}`), side effects (**which collections and fields it writes**), webhook setup, env vars, the Functions → v1 map, notes for Flutter |
| `docs/DATABASE.md` | Every Firestore collection and subcollection: fields, types, meaning, **who writes each field** (Server / Admin page / Owner), who reads it, the rule summary, invariants (e.g. balance = Σ ledger) |
| `docs/MOBILE_HANDOVER_*.md` | A short "what the app must change" note per backend change that affects the Flutter app |
| `docs/ARCHITECTURE.md` §4–§7 | One-line summary rows that point to the two docs above |

## When something changed

1. **Find what changed** since the docs were last touched:
   ```bash
   git log --oneline -- docs/API.md docs/DATABASE.md | head -1        # last doc update
   git diff --stat <that-sha>..HEAD -- src/app/api src/lib firestore.rules
   ```
2. **API:** for each added or changed `src/app/api/v1/**/route.ts`, read the handler, not the commit message, and record:
   - method, path, and auth (`requireUser`, `optionalUser`, signature, secret);
   - request body or query, response JSON (a realistic example), every `fail(code, status)`;
   - every Firestore write, including the ones in `src/lib/billing/*`, which are called inside transactions;
   - rate limits and idempotency.

   A removed route gets struck out in the §10 map with what replaced it.
3. **Database:** for each new or changed collection or field:
   - add it to the right section with type, meaning and writer;
   - update the rule summary from `firestore.rules`;
   - if a field is retired, move it to the "Retired" line. Never just delete it, because older data still has it.
4. **Cross-check:** every write named in API.md appears in DATABASE.md under the same field name, and vice versa. A quick grep:
   ```bash
   grep -rhoE "tx\.set\(\`[a-z_]+/|collection\('[a-z_]+'\)" src/lib/billing src/app/api | sort -u
   ```
5. **Mobile:** if the change affects the app (new or renamed endpoint, field or error code), add or update `docs/MOBILE_HANDOVER_<area>.md`.
6. **Header:** set `_Last updated: <date> · Andrew's spec v<x>_` on both docs.
7. **Commit** with the code or right after it: `docs(api-db): <summary>`. Mention it in the stage-7 report.

## Style
- Plain language, tables first. Real JSON examples with realistic values (money in cents).
- Error codes are stable API. Never rename one without a handover note.
- Never put secrets in the docs; name the env var instead.
- Provider names (Stripe, NOWPayments, CoinGlass) are fine here, because these docs are internal.
