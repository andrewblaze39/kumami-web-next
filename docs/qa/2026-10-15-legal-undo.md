# QA — undo the invented legal text (to-do 5227a4b7), 15 Oct 2026

Run against a production build (`next start -p 3217`) pointed at **kumami-dev**. Desktop + mobile.

| Suite | Result |
|---|---|
| `qa/features/legal-compliance.spec.ts` (rewritten for the reverted state) | 19/20 pass, 1 skipped (brand menu on mobile, by design) |
| `qa/features/account-deletion.spec.ts` | 8/8 pass |
| `qa/smoke.spec.ts` | 51 pass, 5 fail: Console, On-chain and Flow Radar flag a live "BTC ETF Net Flow −267.5% vs prior 7d" value as a suspicious ≥200% number. That's live market data and not related to this change. |
| vitest | 739/739 · `tsc` clean · `next build` OK |

What was checked:
- `/terms` and `/world/terms` show the team's original Terms from Firestore `app_config/terms_and_conditions` (Last Updated August 10, 2025). No "unavailable" message. Screenshots: `desktop-legal-terms-public`, `*-legal-terms-shell`.
- `/privacy` and `/world/privacy` return 404, and there are no Privacy links anywhere (gate, site footer, shell footer, brand menu, cookie banner, deletion panel). The sitemap lists only `/`.
- Sign-up has no "you agree / 18+ / not financial advice" line. The Subscribe note has no refund or "by paying you agree" line. The shell footer shows only Terms and Cookie settings (screenshot `mobile-legal-shell-footer`).
- The cookie banner still works: no Google Analytics before a choice, and Reject/Accept are remembered and can be reopened. Account deletion still works end to end.

Note: the original Terms' markdown shows its `---` separators as literal text. That's how it rendered on main too, so it was left as is.
