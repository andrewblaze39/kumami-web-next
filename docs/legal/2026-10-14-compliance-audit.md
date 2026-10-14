# Kumami — legal checklist (status, 15 Oct 2026)

**Stopped (to-do 5227a4b7, Andrew).** Andrew's team supplies all legal content; it is never written by the developer. The 14 Oct 2026 pass invented a Privacy Policy, a rewritten Terms of Service and policy wording (18+ age, refund rules, referral rules, liability cap, sanctions, company details). All of that has been removed:

- **Terms:** `/terms` and `/world/terms` show the team's original Terms again, read from Firestore `app_config/terms_and_conditions` (`src/components/TermsContent.tsx`), exactly as on `main`.
- **Privacy Policy:** `main` never had one. The invented page is removed, with every link to it (Andrew, 15 Oct 2026). The text has to come from Andrew's team.
- **Made-up lines removed:** sign-up "you agree / 18 or older / not financial advice", Subscribe "non-refundable / by paying you agree", the shell "not financial advice" paragraph, and the "tax law" and "no refund" wording in the account-deletion panel.

**Kept (Andrew, 15 Oct 2026):** the cookie banner (analytics only after Accept) and Profile → Delete my account.

The rest of the 20-item reel checklist (data export, breach plan, accessibility, third-party data licences, DMCA, sanctions, company details, etc.) is **not being built**. It stays on the Kumami roadmap as proposals for Andrew to approve one by one.
