# How to test — Legal pages, cookie banner & disclaimers

What shipped (14 Oct 2026, spec v1.15 Basic §7): a public Privacy Policy, a cookie banner that keeps Google Analytics off until you accept, "you agree" lines at sign-up and payment, legal links everywhere, and a not-financial-advice footer on every app page. Updated 14 Oct 2026 (spec v1.17): the Terms of Service were rewritten (18+, refunds, referral rules, sanctions, AI output, copyright contact) and now come from the code, and the Subscribe note gained a refund line.

Run it against kumami-dev: locally (`npm run dev`, http://localhost:3000) or the dev site. **Never production.**

## 1 · Cookie banner (logged out, 2 min)

1. Open a **private/incognito** window and go to `/`.
2. ✅ A banner at the bottom says sign-in cookies are needed and asks about analytics, with a **Privacy Policy** link plus **Reject analytics** and **Accept analytics** buttons.
3. Click **Reject analytics**. ✅ The banner closes. Reload the page. ✅ It stays closed.
4. In the landing-page footer (under "© 2026 Kumami World"), click **Cookie settings**. ✅ The banner comes back. Click **Accept analytics**.
5. DevTools → Application → Local Storage → `kumami_cookie_consent`: ✅ `{"analytics":true,"version":1,…}`.
6. *(Production build only: `npm run build && npm start`.)* In a fresh private window, open DevTools → Network and filter on `google`. ✅ Before you choose, there are no `google-analytics.com` / `googletagmanager.com` requests. After **Accept** they may start. After **Reject**, the `_ga` cookies are removed (Application → Cookies).

## 2 · Privacy Policy (logged out)

1. Go to `/privacy`. ✅ It loads without logging in. The tab title is "Privacy Policy — Kumami World". There are 13 numbered sections and a provider table (Firebase, Google Analytics, Stripe, NOWPayments, n8n, Google Gemini, Alchemy, CoinGecko/CoinGlass), with the site footer below.
2. ✅ The company name, country and email show as `[placeholders]`. This is expected until Andrew fills them in (see `docs/legal/2026-10-14-compliance-audit.md`).
3. In §6, click **Cookie settings**. ✅ The banner opens.
4. Site footer → Company: ✅ **Terms**, **Privacy** and **Cookie settings**.
5. `/sitemap.xml` ✅ lists `https://kumami.world/privacy`.

## 2b · Terms of Service (logged out)

1. Go to `/terms`. ✅ It loads without logging in. The heading is "Terms of Service", with "Last updated: 14 October 2026", 17 numbered sections and the site footer below.
2. ✅ §1 says **18 years old** (the old Terms said 17). §5 shows $19.99 for 30 days and $199.99 for 365 days. §6 Refunds says "Once a paid period has started we don't give refunds". §8 shows the referral rewards ($1.00 Monthly / $10.00 Yearly). There are also sections on AI answers (§4), sanctions (§7) and copyright complaints (§11).
3. ✅ The company name, country and email show as `[placeholders]`, the same as on the Privacy Policy.
4. ✅ No words run together around the numbers or placeholders (e.g. "365 days", "registration] (").
5. `/sitemap.xml` ✅ lists `https://kumami.world/terms`.
6. Logged in: `/world/terms` ✅ shows the same text inside the app.

## 3 · Sign-up line

1. On `/`, click **Sign Up — it's free**.
2. ✅ Under the Sign Up button: "By signing up you agree to our Terms of Service and Privacy Policy. You must be 18 or older. Kumami is for education only, not financial advice." Both links open in a new tab.

## 4 · Inside the app (any account, e.g. qa1)

1. Log in and open `/world/news`, `/world/console` and `/world/education`, then scroll to the bottom of each.
2. ✅ A small footer reads "Kumami is for education and information only. Nothing here … is financial, investment or tax advice…", followed by **Terms · Privacy · Cookie settings** (these go to `/world/terms` and `/world/privacy`).
3. Click the logo / tier badge at the top of the sidebar (the brand menu). ✅ Under Company: **Terms of Service** and **Privacy Policy**.
4. Open `/world/subscribe`. ✅ The grey note under the pay buttons says payments are non-refundable once a period has started, with a **Refunds** link (to `/world/terms#refunds`), and ends with "By paying you agree to our Terms of Service and Privacy Policy."
5. Pro account (qa2): open `/world/pro`. ✅ The same footer is at the bottom (it mentions "Alpha Room calls").
6. On a phone width: ✅ the footer sits above the bottom tab bar, and the banner buttons go full width.

## Automated

`QA_PORT=3217 npx playwright test qa/features/legal-compliance.spec.ts` (against `next start -p 3217` so the Analytics check is real). QA reports: `docs/qa/2026-10-14-legal-compliance.md`, `docs/qa/2026-10-14-terms-update.md`.
