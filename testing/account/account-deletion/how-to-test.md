# How to test — Delete my account

What shipped (14 Oct 2026, spec v1.16 Basic §8): Profile → Profile → **Delete my account**. Type DELETE, sign in again, and the account is deleted straight away. Payment records are kept. Staff accounts can't delete themselves.

Run it against kumami-dev only: locally (`npm run dev`, http://localhost:3000) or the dev site. **Never production.** Use a throw-away account: the deletion is real and can't be undone.

## 1 · Make a throw-away account (2 min)

1. Open a private window, go to `/`, click **Sign Up** and sign up with a new email (e.g. `you+del1@…`). Verify the email and log in.
2. Optional, to see the warnings: in `/admin/subscriptions` (as a superadmin), **Grant Pro** to that account for 1 month.

## 2 · The panel

1. Go to `/world/profile`. ✅ Under **Account Information** there is a red **Delete my account** panel: "Permanently delete your Kumami account and your data. This cannot be undone."
2. Click **Delete my account**. ✅ It lists what is deleted (profile, name and email; course progress, Kuma chats, watchlists, wallet tracker, Pro tool settings; referral code and sign-in) and says payment and invoice records are kept. The **privacy policy** link opens `/privacy#retention`.
3. If you granted Pro: ✅ an amber box says "Your remaining Pro time is lost. There is no refund." (A card subscriber sees "Your card subscription is cancelled now…" instead. A referral balance above $0 adds "Your referral balance ($x.xx) is lost.")
4. ✅ **Permanently delete my account** is greyed out. Type `delete` (lower case) and a password: ✅ still greyed out. Change it to `DELETE`: ✅ the button turns on.
5. Click **Cancel**. ✅ The panel closes and the fields are cleared.

## 3 · Wrong password, then delete

1. Open the panel again. Type `DELETE` and a **wrong** password, then click the button. ✅ "That password is not right." The account still works (reload the page).
2. Enter the right password and click **Permanently delete my account**. ✅ It shows "Deleting…", then you land on the landing page with **"Your Kumami account has been deleted."** at the top (close it with ×).
3. Try to **Log In** with the same email and password. ✅ It fails; you stay on the landing page.
4. (Optional, Firebase console → kumami-dev) ✅ `users/<uid>`, `user_prefs/<uid>`, the Authentication user and their `referralCodes` doc are gone. ✅ Any `payments` / `checkout_orders` rows with that `userId` are still there.

## 4 · Google account (not covered by the automated run — check by hand)

1. Sign up with **Continue with Google** using a spare Google account, then open the panel. ✅ There's no password box; it says you'll be asked to sign in with Google again.
2. Type `DELETE` and click the button. ✅ A Google popup opens. Close it: ✅ "Sign-in was cancelled — your account was not deleted." Do it again and finish the popup: ✅ deleted, as in §3.

## 5 · Staff account

1. Log in as a superadmin or admin. Go to `/world/profile`. ✅ The panel says "This is a staff account. Ask a superadmin to remove your admin role first…" and there is **no** delete button.

## 6 · API (for the Flutter app)

- `curl -X DELETE http://localhost:3000/api/v1/me` → ✅ `401 {"error":{"code":"unauthorized",…}}`.
- With a staff account's token → ✅ `403 staff_account` (automated). With a token from a sign-in more than 5 minutes ago → ✅ `401 reauth_required` (unit-tested; to try by hand, wait 6 minutes after logging in and call it with that session's token).

Automated: `qa/features/account-deletion.spec.ts` (desktop + mobile; makes its own throw-away qa6/qa7 accounts with seeded data in every collection and checks each one is deleted or kept). Unit tests: `src/lib/account/__tests__/deletion.test.ts`, and the "after the payer/referrer deleted their account" cases in `src/lib/billing/__tests__/webhooks.test.ts`.
