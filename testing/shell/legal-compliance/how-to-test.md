# How to test — Terms page, cookie banner & legal links

What's live (15 Oct 2026, to-do 5227a4b7): the Terms page shows the team's **original** Terms (the `app_config/terms_and_conditions` document in Firestore, last updated August 2025). The made-up legal text from 14 Oct 2026 is gone: no Privacy page, no rewritten Terms, no "you agree / 18+ / no refunds / not financial advice" lines. The cookie banner and account deletion stay.

Test on **kumami-dev** only. Use a private window so you start with no saved cookie choice.

## 1 · Cookie banner (logged out)

1. Open the site. ✅ A banner at the bottom says sign-in cookies are needed and asks about analytics, with **Reject analytics** and **Accept analytics**. It has no Privacy Policy link.
2. Click **Reject analytics**. ✅ The banner goes away and stays away after a reload.
3. Landing page footer → **Cookie settings**. ✅ The banner comes back.

## 2 · Terms (logged out)

1. Go to `/terms`. ✅ It loads without logging in. The heading is **Terms & Conditions** and the text starts "Terms and Conditions – Kumami.World", Last Updated August 10, 2025. No "unavailable" message.
2. Site footer → Company: ✅ **Terms** and **Cookie settings**, no Privacy.
3. `/privacy` ✅ shows the 404 page. `/sitemap.xml` ✅ lists only the landing page.

## 3 · Sign-up

1. Landing page → **Sign up**. ✅ No "By signing up you agree…" line under the buttons.

## 4 · In the app (logged in)

1. Scroll to the bottom of News, Console or Education. ✅ A small footer with **Terms** and **Cookie settings** only, no disclaimer paragraph.
2. Click the logo / tier badge at the top of the sidebar. ✅ Under Company: **Terms of Service**, no Privacy Policy.
3. `/world/terms` ✅ shows the same original Terms inside the app.
4. `/world/subscribe` ✅ the grey note under the pay buttons ends at "Prices in USD." with no refund or "you agree" line.

Automated: `npx playwright test qa/features/legal-compliance.spec.ts`.
