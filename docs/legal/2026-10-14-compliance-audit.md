# Kumami — legal / compliance audit (2026-10-14)

To-do d5870b2d: "20 things to have Claude do so your app doesn't get sued". The reel itself couldn't be opened (Instagram), so this follows the usual 20-point checklist for a subscription web app, with crypto-specific items added.

**This is an engineering checklist, not legal advice.** Have a lawyer read the Privacy Policy and Terms before relying on them, especially for EU/UK users and paid subscriptions.

Status: ✅ done · 🟡 partly / needs a decision · ❌ not done (follow-up)

| # | Item | Status | Where / what's left |
|---|---|---|---|
| 1 | **Privacy Policy** | 🟡 | Built this pass: public `/privacy` + `/world/privacy` (`src/components/legal/PrivacyContent.tsx`). **Andrew:** fill in `LEGAL_ENTITY` (company name, country, privacy email). Until then it shows `[placeholders]`. Don't release it to main with them. |
| 2 | **Terms of Service** | 🟡 | `/terms` exists. The text lives in Firestore `app_config/terms_and_conditions` and there's no admin editor. A lawyer should check it covers: refunds, auto-renewal, the age limit, not financial advice, acceptable use, liability cap, governing law, account termination, and AI output. The old PDF in `src/assets/` may be out of date. |
| 3 | **Cookie consent** | ✅ | Built this pass: a banner on every page (`CookieConsent`). Firebase/Google Analytics no longer loads until "Accept analytics". "Reject" turns collection off and deletes the `_ga` cookies. "Cookie settings" links in the footer, landing page, shell and privacy page reopen it. |
| 4 | **Agreeing to the Terms at sign-up** | ✅ | Built this pass: "By signing up you agree to the Terms and Privacy Policy…" under the sign-up form, and "By paying you agree…" on the Subscribe page. |
| 5 | **Age limit** | 🟡 | The sign-up line and the privacy policy say **18+**. **Andrew:** confirm 18 (the usual choice for crypto plus payments) and make sure the Terms say the same. There's no date-of-birth check, only the statement. |
| 6 | **Account deletion** | ❌ | Users can't delete their account in the app. GDPR/CCPA require this, and so do Apple and Google for the app. Follow-up to-do added. Until then, deletion is done by email request (the privacy policy says so). |
| 7 | **Data export / access requests** | 🟡 | Handled by email (privacy policy §9). No self-serve export. Fine at this size. |
| 8 | **"Not financial advice" disclaimer** | ✅ | Built this pass: a line at the bottom of every `/world` page (News, Pro, Alpha Room, Console, etc.) via `ShellLegalFooter`, plus the sign-up line. Kuma, Portfolio Scan and Fear & Greed already had their own. |
| 9 | **Subscription auto-renewal disclosure** (FTC / California auto-renew laws) | ✅ | The Subscribe page already says card plans renew automatically until cancelled in Profile → Subscription, and that crypto is a one-time payment. Cancelling online in Profile already works ("click to cancel"). |
| 10 | **Refund policy** | ❌ | Not written anywhere a user can see. **Andrew:** decide the policy (e.g. no refunds after the period starts / 7-day refund), then add it to the Terms and the Subscribe note. EU consumers get a 14-day withdrawal right unless they agree to start the service straight away. |
| 11 | **Referral program terms + disclosure** | ❌ | There are referral rewards but no written rules (eligibility, abuse, when credit expires, can it be cashed out). Add a short section to the Terms. Anyone promoting a code for a reward must disclose it (FTC endorsement guides). |
| 12 | **AI disclosure** | ✅ | The privacy policy §4 names Gemini via n8n. Kuma says its answers aren't financial advice. Consider a "Kuma can be wrong" line in the dock. |
| 13 | **Third-party data licences** (CoinGecko, CoinGlass, news) | 🟡 | Check that the CoinGecko plan allows commercial use without the "Powered by CoinGecko" credit (there's no credit in the UI today). CoinGlass STARTUP: check that showing its data to paying users is allowed. News: make sure admins only publish original text or properly licensed text and images. |
| 14 | **Copyright / DMCA takedown contact** | ❌ | No takedown contact. Add a short "Copyright complaints: email …" section to the Terms (registering a DMCA agent with the US Copyright Office is cheap if you rely on safe harbour for user content). |
| 15 | **Email marketing (CAN-SPAM / GDPR)** | ✅ | Kumami doesn't send marketing emails today, only account emails. If a newsletter is added: opt-in, an unsubscribe link and a postal address. |
| 16 | **Security basics** | ✅ | Firestore rules restrict each user to their own data, secrets stay server-side, and payment webhooks are signed. Keep the "rules fix before main" rule. |
| 17 | **Data breach plan** | ❌ | Nothing written. One page is enough: who decides, how users are told, and the 72-hour notice to regulators under GDPR. |
| 18 | **Accessibility** (ADA / European Accessibility Act) | 🟡 | The shell has keyboard and ARIA basics (modals, tab bar). No full WCAG 2.1 AA audit yet. Worth a separate pass, since EU accessibility rules for consumer services started in June 2025. |
| 19 | **Sanctions / where crypto payments are allowed** | 🟡 | NOWPayments and Stripe screen payments, but the Terms should say users in sanctioned countries can't buy Pro. Ask a lawyer whether any of the crypto content (Alpha Room calls, signals) needs licensing where you operate. |
| 20 | **Company details and contact** | ❌ | No company name, address or contact email anywhere on the site. Some countries require these (e.g. the EU imprint rule). Fill `LEGAL_ENTITY` and show it in the footer. |

## Decisions for Andrew

1. Company legal name, country and privacy contact email (`LEGAL_ENTITY` in `PrivacyContent.tsx`).
2. Age limit: 18+?
3. Refund policy.
4. Referral program rules.
5. A lawyer review of the Terms and Privacy Policy before releasing to main.

## Follow-ups on the to-do list

- Account deletion in Profile (self-serve, deletes Firestore data + Auth user, keeps payment records).
- Terms update: refunds, referral rules, copyright contact, sanctions, AI output, age (after the decisions above).
- WCAG accessibility pass.
